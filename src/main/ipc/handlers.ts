import { BrowserWindow, dialog, ipcMain } from 'electron';
import http from 'node:http';
import type { ConnectionTestResult, CreateAccountInput, CreatePostInput, DeletePostResult, PublishAttemptResult } from '../../shared/types.js';
import { startAdsPowerBrowser } from '../browser/AdsPowerApi.js';
import { createConnectorForAccount } from '../browser/BrowserConnectorFactory.js';
import { inspectFirstPage } from '../browser/RawCdpClient.js';
import type { AppDatabase } from '../db/database.js';
import { shouldPublishPost } from '../publisher/PublishWorker.js';
import { publishPostNow } from '../publisher/PublishService.js';
import { fillWeiboDraft } from '../publisher/RawWeiboPublisher.js';
import { PublishScheduler } from '../publisher/Scheduler.js';
import { WeiboPublisher } from '../publisher/WeiboPublisher.js';

async function selectMediaFiles() {
  const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const options: Electron.OpenDialogOptions = {
    title: 'Select media files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'heif', 'heic', 'mp4', 'm4v', 'mkv', 'flv'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'heif', 'heic'] },
      { name: 'Videos', extensions: ['mp4', 'm4v', 'mkv', 'flv'] },
    ],
  };
  const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);

  return result.canceled ? [] : result.filePaths;
}

async function testAccountConnection(repositories: AppDatabase, accountId: number): Promise<ConnectionTestResult> {
  const account = repositories.accounts.findById(accountId);
  if (!account) {
    return { ok: false, message: `Account ${accountId} was not found` };
  }

  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timed out after 12 seconds')), 12_000);
    });
    const result = await Promise.race([readConnectionStatus(account), timeout]);

    return {
      ok: true,
      message: `Connected to ${account.name}`,
      currentUrl: result.currentUrl,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readConnectionStatus(account: { browserMode: string; providerProfileId: string; debuggingPort: number | null; wsEndpoint: string }) {
  if (account.browserMode === 'adspower') {
    const apiKey = process.env.ADSPOWER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ADSPOWER_API_KEY environment variable');
    }

    const url = new URL('http://127.0.0.1:50325/api/v1/browser/start');
    url.searchParams.set('user_id', account.providerProfileId);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await response.json() as { code: number; msg?: string; data?: { debug_port?: string } };
    if (body.code !== 0) {
      throw new Error(`AdsPower start failed: ${body.msg ?? body.code}`);
    }
    if (!body.data?.debug_port) {
      throw new Error('AdsPower response did not include debug_port');
    }

    return readDebugPortStatus(Number(body.data.debug_port));
  }

  if (account.browserMode === 'manual_port') {
    if (!account.debuggingPort) {
      throw new Error('Missing debugging port');
    }
    return readDebugPortStatus(account.debuggingPort);
  }

  if (account.browserMode === 'manual_ws') {
    if (!account.wsEndpoint.trim()) {
      throw new Error('Missing websocket endpoint');
    }
    return { currentUrl: account.wsEndpoint };
  }

  throw new Error(`Browser provider ${account.browserMode} is not implemented`);
}

async function readDebugPortStatus(port: number) {
  const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!versionResponse.ok) {
    throw new Error(`Unable to read Chrome debug status from port ${port}`);
  }

  const pagesResponse = await fetch(`http://127.0.0.1:${port}/json`);
  const pages = pagesResponse.ok ? await pagesResponse.json() as Array<{ url?: string }> : [];
  return {
    currentUrl: pages[0]?.url ?? `debug-port:${port}`,
  };
}

async function attemptPublishPost(repositories: AppDatabase, postId: number): Promise<PublishAttemptResult> {
  const post = repositories.posts.findById(postId);
  if (!post) {
    return { ok: false, message: `Post ${postId} was not found` };
  }

  const account = repositories.accounts.findById(post.accountId);
  if (!account) {
    return { ok: false, message: `Account ${post.accountId} was not found` };
  }

  if (post.status === 'published') {
    return { ok: false, message: 'Post is already published', status: 'published' };
  }

  const postForManualAttempt = { ...post, status: 'queued' as const, scheduledAt: new Date(0).toISOString() };
  const decision = shouldPublishPost(postForManualAttempt, account, new Date().toISOString());
  if (!decision.ok) {
    return { ok: false, message: decision.reason ?? 'Post cannot be published now' };
  }

  try {
    repositories.posts.updateStatus(post.id, 'publishing');

    if (account.browserMode === 'adspower') {
      const browserInfo = await startAdsPowerBrowser(account);
      const page = await inspectFirstPage(browserInfo.cdpEndpoint);
      if (page.url.includes('newlogin') || page.url.includes('passport.weibo')) {
        const message = `Weibo login page detected. Please log in manually first: ${page.url}`;
        repositories.posts.updateStatus(post.id, 'needs_manual_action', message);
        return { ok: false, message, status: 'needs_manual_action' };
      }
      const draft = await fillWeiboDraft(browserInfo, post);
      const message = `${draft.message}. Current page: ${draft.title || 'untitled'} ${draft.url}. Send disabled: ${draft.sendButtonDisabled}`;
      const status = draft.ok ? 'draft' : 'failed';
      repositories.posts.updateStatus(post.id, status, message);
      return { ok: draft.ok, message, status };
    }

    const connector = createConnectorForAccount(account);
    const session = await connector.connect(account);
    const result = await new WeiboPublisher().publish(session.browser, post);
    await session.browser.close();
    repositories.posts.updateStatus(post.id, result.status, result.message, result.screenshotPath ?? '');

    return {
      ok: result.status === 'published',
      message: result.message,
      status: result.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    repositories.posts.updateStatus(post.id, 'failed', message);
    return { ok: false, message, status: 'failed' };
  }
}

function deletePost(repositories: AppDatabase, postId: number): DeletePostResult {
  const deleted = repositories.posts.delete(postId);
  return {
    ok: deleted,
    message: deleted ? `Post ${postId} was deleted` : `Post ${postId} was not found or could not be deleted`,
  };
}

export function registerIpcHandlers(repositories: AppDatabase, scheduler: PublishScheduler) {
  ipcMain.handle('accounts:list', () => repositories.accounts.list());
  ipcMain.handle('accounts:create', (_event, input: CreateAccountInput) => repositories.accounts.create(input));
  ipcMain.handle('posts:list', () => repositories.posts.list());
  ipcMain.handle('posts:create', (_event, input: CreatePostInput) => repositories.posts.create(input));
  ipcMain.handle('posts:delete', (_event, postId: number) => deletePost(repositories, postId));
  ipcMain.handle('posts:due', () => repositories.posts.listDue(new Date().toISOString()));
  ipcMain.handle('posts:attemptPublish', (_event, postId: number) => attemptPublishPost(repositories, postId));
  ipcMain.handle('posts:publishNow', (_event, postId: number) => publishPostNow(repositories, postId, { ignoreSchedule: true }));
  ipcMain.handle('accounts:testConnection', (_event, accountId: number) => testAccountConnection(repositories, accountId));
  ipcMain.handle('media:selectFiles', () => selectMediaFiles());
  ipcMain.handle('scheduler:start', () => scheduler.start());
  ipcMain.handle('scheduler:stop', () => scheduler.stop());
  ipcMain.handle('scheduler:status', () => scheduler.getStatus());
}

function readBody(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      resolve(body ? JSON.parse(body) : {});
    });
    request.on('error', reject);
  });
}

function getAllowedOrigin(request: http.IncomingMessage) {
  const origin = request.headers.origin;
  if (origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5173') {
    return origin;
  }

  return 'http://127.0.0.1:5173';
}

function sendJson(request: http.IncomingMessage, response: http.ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

export function startHttpApi(repositories: AppDatabase, scheduler: PublishScheduler, port = 5183) {
  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === 'OPTIONS') {
        sendJson(request, response, 204, {});
        return;
      }

      if (request.method === 'GET' && request.url === '/accounts') {
        sendJson(request, response, 200, repositories.accounts.list());
        return;
      }

      if (request.method === 'POST' && request.url === '/accounts') {
        const input = await readBody(request) as CreateAccountInput;
        sendJson(request, response, 200, repositories.accounts.create(input));
        return;
      }

      const testConnectionMatch = request.url?.match(/^\/accounts\/(\d+)\/test-connection$/);
      if (request.method === 'POST' && testConnectionMatch) {
        sendJson(request, response, 200, await testAccountConnection(repositories, Number(testConnectionMatch[1])));
        return;
      }

      if (request.method === 'GET' && request.url === '/posts') {
        sendJson(request, response, 200, repositories.posts.list());
        return;
      }

      if (request.method === 'POST' && request.url === '/posts') {
        const input = await readBody(request) as CreatePostInput;
        sendJson(request, response, 200, repositories.posts.create(input));
        return;
      }

      const deletePostMatch = request.url?.match(/^\/posts\/(\d+)$/);
      if (request.method === 'DELETE' && deletePostMatch) {
        sendJson(request, response, 200, deletePost(repositories, Number(deletePostMatch[1])));
        return;
      }

      const attemptPublishMatch = request.url?.match(/^\/posts\/(\d+)\/attempt-publish$/);
      if (request.method === 'POST' && attemptPublishMatch) {
        sendJson(request, response, 200, await attemptPublishPost(repositories, Number(attemptPublishMatch[1])));
        return;
      }

      const publishNowMatch = request.url?.match(/^\/posts\/(\d+)\/publish-now$/);
      if (request.method === 'POST' && publishNowMatch) {
        sendJson(request, response, 200, await publishPostNow(repositories, Number(publishNowMatch[1]), { ignoreSchedule: true }));
        return;
      }

      if (request.method === 'POST' && request.url === '/scheduler/start') {
        sendJson(request, response, 200, scheduler.start());
        return;
      }

      if (request.method === 'POST' && request.url === '/scheduler/stop') {
        sendJson(request, response, 200, scheduler.stop());
        return;
      }

      if (request.method === 'GET' && request.url === '/scheduler/status') {
        sendJson(request, response, 200, scheduler.getStatus());
        return;
      }

      if (request.method === 'POST' && request.url === '/media/select-files') {
        sendJson(request, response, 200, await selectMediaFiles());
        return;
      }

      sendJson(request, response, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(request, response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.listen(port, '127.0.0.1');
  return server;
}
