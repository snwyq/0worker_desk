import electron from 'electron';
import http from 'node:http';
import type { ConnectionTestResult, CreateAccountInput, CreateContentItemInput, CreatePostInput, DeleteAccountResult, DeletePostResult, PublishAttemptResult, UpdateAccountInput, UpdateContentItemInput, UpdateDistributionTaskInput } from '../../shared/types.js';
import { fetchAdsPowerProfiles, startAdsPowerBrowser } from '../browser/AdsPowerApi.js';
import { createConnectorForAccount } from '../browser/BrowserConnectorFactory.js';
import { inspectFirstPage } from '../browser/RawCdpClient.js';
import type { AppDatabase } from '../db/database.js';
import { readHelpDocs } from '../docs/HelpDocsService.js';
import { getWeiboPublisherLogPath } from '../publisher/WeiboDiagnostics.js';
import { shouldPublishPost } from '../publisher/PublishWorker.js';
import { publishPostNow } from '../publisher/PublishService.js';
import { fillWeiboDraft } from '../publisher/RawWeiboPublisher.js';
import { PublishScheduler } from '../publisher/Scheduler.js';
import { WeiboPublisher } from '../publisher/WeiboPublisher.js';
import { listPlatformCapabilities } from '../platforms/registry.js';
import { checkForUpdates, readUpdateConfig } from '../updater/UpdateService.js';
import { aiService, type AiGenerateOptions, type AiImageOptions } from '../services/AiService.js';
import { getWorkflowEngine } from '../core/workflow/EngineRegistry.js';
import { ImageGenTool } from '../core/tools/ImageGenTool.js';
import type { ITool } from '../core/tools/ITool.js';


const { app, BrowserWindow, dialog, ipcMain } = electron;

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
    const timeoutMs = Number(repositories.settings.get('browser.connectionTimeoutMs') ?? 12_000);
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Connection test timed out after ${Math.round(timeoutMs / 1000)} seconds`)), timeoutMs);
    });
    const result = await Promise.race([readConnectionStatus(repositories, account), timeout]);
    repositories.accounts.updateHealth(account.id, {
      status: 'active',
      healthMessage: `Connected to ${account.name}${result.currentUrl ? ` (${result.currentUrl})` : ''}`,
    });

    return {
      ok: true,
      message: `Connected to ${account.name}`,
      currentUrl: result.currentUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    repositories.accounts.updateHealth(account.id, {
      status: 'needs_manual_action',
      healthMessage: message,
      manualActionReason: 'Connection test failed',
    });
    return {
      ok: false,
      message,
    };
  }
}

async function readConnectionStatus(
  repositories: AppDatabase,
  account: { browserMode: string; providerProfileId: string; debuggingPort: number | null; wsEndpoint: string },
) {
  if (account.browserMode === 'adspower') {
    if (!account.providerProfileId.trim()) {
      throw new Error('Missing AdsPower user_id');
    }
    const apiKey = repositories.settings.get('adspower.apiKey') || process.env.ADSPOWER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ADSPOWER_API_KEY environment variable');
    }

    const url = new URL('http://127.0.0.1:50325/api/v1/browser/start');
    url.searchParams.set('user_id', account.providerProfileId);
    const response = await fetchWithConnectionMessage(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 'Unable to connect to AdsPower Local API at 127.0.0.1:50325. Please start AdsPower and enable the local API service.');
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
  const versionResponse = await fetchWithConnectionMessage(
    `http://127.0.0.1:${port}/json/version`,
    undefined,
    `Unable to connect to Chrome debugging port ${port}. Please start the browser with remote debugging enabled, or update the account debugging port.`,
  );
  if (!versionResponse.ok) {
    throw new Error(`Unable to read Chrome debug status from port ${port}`);
  }

  const pagesResponse = await fetchWithConnectionMessage(
    `http://127.0.0.1:${port}/json`,
    undefined,
    `Unable to list Chrome pages from debugging port ${port}. Please confirm the browser is still running.`,
  );
  const pages = pagesResponse.ok ? await pagesResponse.json() as Array<{ url?: string }> : [];
  return {
    currentUrl: pages[0]?.url ?? `debug-port:${port}`,
  };
}

async function fetchWithConnectionMessage(input: string | URL, init: RequestInit | undefined, message: string) {
  try {
    return await fetch(input, init);
  } catch (error) {
    const detail = error instanceof Error && error.message && error.message !== 'fetch failed'
      ? ` (${error.message})`
      : '';
    throw new Error(`${message}${detail}`);
  }
}

async function attemptPublishPost(repositories: AppDatabase, postId: number): Promise<PublishAttemptResult> {
  const startedAt = new Date().toISOString();
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
      const browserInfo = await startAdsPowerBrowser(account, repositories);
      const page = await inspectFirstPage(browserInfo.cdpEndpoint);
      if (page.url.includes('newlogin') || page.url.includes('passport.weibo')) {
        const message = `Weibo login page detected. Please log in manually first: ${page.url}`;
        repositories.posts.updateStatus(post.id, 'needs_manual_action', message);
        recordRunForPost(repositories, post.id, 'needs_manual_action', message, startedAt);
        return { ok: false, message, status: 'needs_manual_action' };
      }
      const draft = await fillWeiboDraft(browserInfo, post);
      const message = `${draft.message}. Current page: ${draft.title || 'untitled'} ${draft.url}. Send disabled: ${draft.sendButtonDisabled}`;
      const status = draft.ok ? 'draft' : 'failed';
      repositories.posts.updateStatus(post.id, status, message);
      recordRunForPost(repositories, post.id, status, message, startedAt);
      return { ok: draft.ok, message, status };
    }

    const connector = createConnectorForAccount(account);
    const session = await connector.connect(account);
    const result = await new WeiboPublisher({
      logPath: getWeiboPublisherLogPath(app.getPath('userData')),
    }).publish(session.browser, post);
    await session.browser.close();
    repositories.posts.updateStatus(post.id, result.status, result.message, result.screenshotPath ?? '');
    recordRunForPost(repositories, post.id, result.status, result.message, startedAt, result.screenshotPath ?? '');

    return {
      ok: result.status === 'published',
      message: result.message,
      status: result.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    repositories.posts.updateStatus(post.id, 'failed', message);
    recordRunForPost(repositories, post.id, 'failed', message, startedAt);
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

async function openBrowser(repositories: AppDatabase, accountId: number): Promise<ConnectionTestResult> {
  const account = repositories.accounts.findById(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} was not found`);
  }

  // 调用启动逻辑
  const result = await testAccountConnection(repositories, accountId);
  return result;
}

function deleteAccount(repositories: AppDatabase, accountId: number): DeleteAccountResult {
  const deleted = repositories.accounts.delete(accountId);
  return {
    ok: deleted,
    message: deleted ? `Account ${accountId} was deleted` : `Account ${accountId} was not found or could not be deleted`,
  };
}

async function syncAdsPowerAccounts(repositories: AppDatabase) {
  const apiKey = repositories.settings.get('adspower.apiKey') || process.env.ADSPOWER_API_KEY;
  if (!apiKey) {
    throw new Error('AdsPower API Key is not configured in settings or environment');
  }

  const profiles = await fetchAdsPowerProfiles(apiKey);
  const existingAccounts = repositories.accounts.list();
  
  let syncCount = 0;
  for (const profile of profiles) {
    const existing = existingAccounts.find(a => a.providerProfileId === profile.user_id && a.browserMode === 'adspower');
    
    if (!existing) {
      repositories.accounts.create({
        name: profile.name || `AdsPower ${profile.user_id}`,
        platform: 'weibo', // 默认分配给微博，MVP阶段简化处理
        browserMode: 'adspower',
        providerProfileId: profile.user_id,
        wsEndpoint: '',
        debuggingPort: null,
        status: 'active',
        notes: `Synced from AdsPower. Group: ${profile.group_name || 'None'}`,
      });
      syncCount++;
    } else if (existing.name !== profile.name) {
      // 如果名称变了，更新一下
      repositories.accounts.update(existing.id, {
        ...existing,
        name: profile.name
      });
    }
  }
  
  return {
    ok: true,
    message: `Successfully synchronized ${profiles.length} profiles from AdsPower. Added ${syncCount} new accounts.`,
    totalSynced: profiles.length,
    newlyAdded: syncCount
  };
}

function findDistributionTaskForPost(repositories: AppDatabase, postId: number) {
  return repositories.distributionTasks.list().find((task) => task.legacyPostId === postId) ?? null;
}

function recordRunForPost(
  repositories: AppDatabase,
  postId: number,
  status: PublishAttemptResult['status'] | 'failed',
  message: string,
  startedAt: string,
  screenshotPath = '',
) {
  const task = findDistributionTaskForPost(repositories, postId);
  if (!task) {
    return;
  }

  repositories.distributionTasks.updateStatus(task.id, status ?? 'failed', status === 'failed' ? message : '');
  repositories.publishRuns.create({
    taskId: task.id,
    accountId: task.accountId,
    platform: task.platform,
    status: status ?? 'failed',
    message,
    startedAt,
    finishedAt: new Date().toISOString(),
    screenshotPath,
  });
}

function relaunchApp() {
  app.relaunch();
  app.exit(0);
}

export function registerIpcHandlers(repositories: AppDatabase, scheduler: PublishScheduler) {
  aiService.init(repositories);
  ipcMain.handle('app:relaunch', () => relaunchApp());

  ipcMain.handle('accounts:list', () => repositories.accounts.list());
  ipcMain.handle('accounts:create', (_event, input: CreateAccountInput) => repositories.accounts.create(input));
  ipcMain.handle('accounts:update', (_event, id: number, input: UpdateAccountInput) => repositories.accounts.update(id, input));
  ipcMain.handle('accounts:delete', (_event, accountId: number) => deleteAccount(repositories, accountId));
  ipcMain.handle('accounts:sync-adspower', () => syncAdsPowerAccounts(repositories));
  ipcMain.handle('accounts:open-browser', (_event, accountId: number) => openBrowser(repositories, accountId));
  ipcMain.handle('posts:list', () => repositories.posts.list());
  ipcMain.handle('posts:create', (_event, input: CreatePostInput) => repositories.posts.create(input));
  ipcMain.handle('posts:delete', (_event, postId: number) => deletePost(repositories, postId));
  ipcMain.handle('posts:due', () => repositories.posts.listDue(new Date().toISOString()));
  ipcMain.handle('posts:attemptPublish', (_event, postId: number) => attemptPublishPost(repositories, postId));
  ipcMain.handle('posts:publishNow', (_event, postId: number) => publishPostNow(repositories, postId, {
    ignoreSchedule: true,
    logPath: getWeiboPublisherLogPath(app.getPath('userData')),
  }));
  ipcMain.handle('accounts:testConnection', (_event, accountId: number) => testAccountConnection(repositories, accountId));
  ipcMain.handle('media:selectFiles', () => selectMediaFiles());
  ipcMain.handle('scheduler:start', () => scheduler.start());
  ipcMain.handle('scheduler:stop', () => scheduler.stop());
  ipcMain.handle('scheduler:status', () => scheduler.getStatus());
  ipcMain.handle('settings:list', () => repositories.settings.list());
  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    repositories.settings.set(key, value);
    return repositories.settings.list();
  });
  ipcMain.handle('platforms:list', () => repositories.platforms.list());
  ipcMain.handle('contents:list', () => repositories.contentItems.list());
  ipcMain.handle('contents:create', (_event, input: CreateContentItemInput) => repositories.contentItems.create(input));
  ipcMain.handle('contents:update', (_event, id: number, input: UpdateContentItemInput) => repositories.contentItems.update(id, input));
  ipcMain.handle('contents:delete', (_event, id: number) => ({
    ok: repositories.contentItems.delete(id),
  }));
  ipcMain.handle('contents:versions', (_event, id: number) => repositories.contentItems.listVersions(id));
  ipcMain.handle('distributionTasks:list', () => repositories.distributionTasks.list());
  ipcMain.handle('distributionTasks:update', (_event, id: number, input: UpdateDistributionTaskInput) => repositories.distributionTasks.update(id, input));
  ipcMain.handle('distributionTasks:retry', (_event, id: number) => repositories.distributionTasks.retry(id));
  ipcMain.handle('distributionTasks:cancel', (_event, id: number) => repositories.distributionTasks.cancel(id));
  ipcMain.handle('distributionTasks:retryMany', (_event, ids: number[]) => repositories.distributionTasks.retryMany(ids));
  ipcMain.handle('distributionTasks:cancelMany', (_event, ids: number[]) => repositories.distributionTasks.cancelMany(ids));
  ipcMain.handle('platformCapabilities:list', () => listPlatformCapabilities());
  ipcMain.handle('publishRuns:list', (_event, taskId?: number) => (
    taskId ? repositories.publishRuns.listByTask(taskId) : repositories.publishRuns.list()
  ));
  ipcMain.handle('updates:status', () => ({
    config: readUpdateConfig(repositories),
  }));
  ipcMain.handle('updates:check', () => checkForUpdates(repositories));
  ipcMain.handle('helpDocs:get', () => readHelpDocs(process.cwd()));
  ipcMain.handle('ai:generate', (_event, options: AiGenerateOptions) => aiService.generateText(options));
  ipcMain.handle('ai:generateImage', (_event, options: AiImageOptions) => aiService.generateImage(options));

  // AI Orchestrator Handlers
  ipcMain.handle('ai:listPlugins', () => repositories.aiPlugins.list());
  ipcMain.handle('ai:listWorkflows', (_event, pluginCode: string) => repositories.aiWorkflows.listByPlugin(pluginCode));
  ipcMain.handle('ai:previewWorkflow_v3', async (event, pluginCode: string, workflowCode: string, inputParams: any) => {
    return handlePreviewWorkflow(event, repositories, pluginCode, workflowCode, inputParams);
  });
  ipcMain.handle('ai:listHotTopics', (_event, force: boolean) => aiService.fetchHotTopics(force));
  ipcMain.handle('ai:startAgentSchedule', async (_event, accountId: number) => {
    // In production, this would register a node-cron job or an interval.
    return { ok: true, message: `Scheduled agent for account ${accountId}` };
  });
}


async function handlePreviewWorkflow(event: any, repositories: AppDatabase, pluginCode: string, workflowCode: string, inputParams: any) {
  const cleanPluginCode = (pluginCode || '').trim();
  const cleanWorkflowCode = (workflowCode || '').trim();
  console.log(`[AI-DEBUG] Preview Request: Plugin="${cleanPluginCode}", Workflow="${cleanWorkflowCode}"`);
  
  const engine = getWorkflowEngine();
  let workflowRecord: any = null;
  
  if (cleanPluginCode === 'maoxiaoxian') {
    workflowRecord = {
      pluginCode: 'maoxiaoxian',
      code: 'maoxiaoxian.daily_topics',
      definitionJson: {
        steps: [
          { id: 'step1', type: 'bazi_calc', birthDateKey: 'userBirth', outputKey: 'baziResult' },
          { id: 'step2', type: 'llm', prompt: '你是一个叫“猫小仙”的命理博主。请根据结果：{{state.baziResult.summary}} 写一条治愈系微博文案。', outputKey: 'finalContent' },
          { id: 'step3', type: 'image_gen', prompt: '一张治愈系的插画，配合文字：{{state.finalContent}}', outputKey: 'imageUrl' }
        ]
      }
    };
  } else {
    workflowRecord = repositories.aiWorkflows.findByCode(cleanPluginCode, cleanWorkflowCode);
  }

  if (!workflowRecord) throw new Error(`Workflow ${cleanWorkflowCode} not found`);
  
  return await engine.start(
    { ...workflowRecord.definitionJson, pluginCode: workflowRecord.pluginCode, workflowId: workflowRecord.code },
    null,
    { userBirth: '1995-06-15 12:00:00', ...inputParams },
    (log) => {
      if (event?.sender) {
        event.sender.send('ai:workflow-log', { runId: 'preview', ...log });
      }
    }
  );
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
  
  // 允许所有本地开发环境的 Origin
  if (origin && (origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:') || origin === 'null')) {
    return origin;
  }

  const configuredOrigins = currentHttpRepositories?.settings.get('http.allowedOrigins')
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? ['http://127.0.0.1:5173', 'http://localhost:5173'];
    
  if (origin && configuredOrigins.includes(origin)) {
    return origin;
  }

  return configuredOrigins[0] ?? 'http://127.0.0.1:5173';
}

function sendJson(request: http.IncomingMessage, response: http.ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

let currentHttpRepositories: AppDatabase | null = null;

export function startHttpApi(repositories: AppDatabase, scheduler: PublishScheduler, port = Number(repositories.settings.get('http.port') ?? 5183)) {
  currentHttpRepositories = repositories;
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

      const accountMatch = request.url?.match(/^\/accounts\/(\d+)$/);
      if (request.method === 'PATCH' && accountMatch) {
        const input = await readBody(request) as UpdateAccountInput;
        sendJson(request, response, 200, repositories.accounts.update(Number(accountMatch[1]), input));
        return;
      }

      if (request.method === 'DELETE' && accountMatch) {
        sendJson(request, response, 200, deleteAccount(repositories, Number(accountMatch[1])));
        return;
      }

      const testConnectionMatch = request.url?.match(/^\/accounts\/(\d+)\/test-connection$/);
      if (request.method === 'POST' && testConnectionMatch) {
        sendJson(request, response, 200, await testAccountConnection(repositories, Number(testConnectionMatch[1])));
        return;
      }

      if (request.method === 'POST' && request.url === '/accounts/sync-adspower') {
        sendJson(request, response, 200, await syncAdsPowerAccounts(repositories));
        return;
      }

      const openBrowserMatch = request.url?.match(/^\/accounts\/(\d+)\/open-browser$/);
      if (request.method === 'POST' && openBrowserMatch) {
        sendJson(request, response, 200, await openBrowser(repositories, Number(openBrowserMatch[1])));
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

      if (request.method === 'GET' && request.url === '/settings') {
        sendJson(request, response, 200, repositories.settings.list());
        return;
      }

      if (request.method === 'POST' && request.url === '/settings') {
        const input = await readBody(request) as { key: string; value: string };
        repositories.settings.set(input.key, input.value);
        sendJson(request, response, 200, repositories.settings.list());
        return;
      }

      if (request.method === 'GET' && request.url === '/platforms') {
        sendJson(request, response, 200, repositories.platforms.list());
        return;
      }

      if (request.method === 'GET' && request.url === '/platform-capabilities') {
        sendJson(request, response, 200, listPlatformCapabilities());
        return;
      }

      if (request.method === 'GET' && request.url === '/distribution-tasks') {
        sendJson(request, response, 200, repositories.distributionTasks.list());
        return;
      }

      const distributionTaskMatch = request.url?.match(/^\/distribution-tasks\/(\d+)$/);
      if (request.method === 'PATCH' && distributionTaskMatch) {
        const input = await readBody(request) as UpdateDistributionTaskInput;
        sendJson(request, response, 200, repositories.distributionTasks.update(Number(distributionTaskMatch[1]), input));
        return;
      }

      const distributionRetryMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/retry$/);
      if (request.method === 'POST' && distributionRetryMatch) {
        sendJson(request, response, 200, repositories.distributionTasks.retry(Number(distributionRetryMatch[1])));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks/retry-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, repositories.distributionTasks.retryMany(input.ids));
        return;
      }

      const distributionCancelMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/cancel$/);
      if (request.method === 'POST' && distributionCancelMatch) {
        sendJson(request, response, 200, repositories.distributionTasks.cancel(Number(distributionCancelMatch[1])));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks/cancel-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, repositories.distributionTasks.cancelMany(input.ids));
        return;
      }

      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'GET' && requestUrl.pathname === '/publish-runs') {
        const taskId = requestUrl.searchParams.get('taskId');
        sendJson(request, response, 200, taskId ? repositories.publishRuns.listByTask(Number(taskId)) : repositories.publishRuns.list());
        return;
      }

      if (request.method === 'GET' && request.url === '/updates/status') {
        sendJson(request, response, 200, { config: readUpdateConfig(repositories) });
        return;
      }

      if (request.method === 'POST' && request.url === '/updates/check') {
        sendJson(request, response, 200, await checkForUpdates(repositories));
        return;
      }

      if (request.method === 'GET' && request.url === '/help-docs') {
        sendJson(request, response, 200, readHelpDocs(process.cwd()));
        return;
      }

      if (request.method === 'GET' && request.url === '/contents') {
        sendJson(request, response, 200, repositories.contentItems.list());
        return;
      }

      if (request.method === 'POST' && request.url === '/contents') {
        const input = await readBody(request) as CreateContentItemInput;
        sendJson(request, response, 200, repositories.contentItems.create(input));
        return;
      }

      const contentMatch = request.url?.match(/^\/contents\/(\d+)$/);
      const contentVersionsMatch = request.url?.match(/^\/contents\/(\d+)\/versions$/);
      if (request.method === 'GET' && contentVersionsMatch) {
        sendJson(request, response, 200, repositories.contentItems.listVersions(Number(contentVersionsMatch[1])));
        return;
      }

      if (request.method === 'PATCH' && contentMatch) {
        const input = await readBody(request) as UpdateContentItemInput;
        sendJson(request, response, 200, repositories.contentItems.update(Number(contentMatch[1]), input));
        return;
      }

      if (request.method === 'DELETE' && contentMatch) {
        sendJson(request, response, 200, { ok: repositories.contentItems.delete(Number(contentMatch[1])) });
        return;
      }

      if (request.method === 'POST' && request.url === '/media/select-files') {
        sendJson(request, response, 200, await selectMediaFiles());
        return;
      }

      if (request.method === 'POST' && request.url === '/app/relaunch') {
        relaunchApp();
        return;
      }

      if (request.method === 'GET' && request.url === '/ai/hot-topics') {
        sendJson(request, response, 200, await aiService.fetchHotTopics());
        return;
      }

      if (request.method === 'GET' && request.url === '/ai/plugins') {
        sendJson(request, response, 200, repositories.aiPlugins.list());
        return;
      }

      const workflowListMatch = request.url?.match(/^\/ai\/plugins\/([^\/]+)\/workflows$/);
      if (request.method === 'GET' && workflowListMatch) {
        sendJson(request, response, 200, repositories.aiWorkflows.listByPlugin(workflowListMatch[1]));
        return;
      }

      const previewMatch = request.url?.match(/^\/ai\/plugins\/([^\/]+)\/workflows\/([^\/]+)\/preview$/);
      if (request.method === 'POST' && previewMatch) {
        const input = await readBody(request);
        const runId = await handlePreviewWorkflow(null as any, repositories, previewMatch[1], previewMatch[2], input);
        sendJson(request, response, 200, { runId });
        return;
      }

      if (request.method === 'POST' && request.url === '/ai/generate') {
        const input = await readBody(request) as AiGenerateOptions;
        sendJson(request, response, 200, await aiService.generateText(input));
        return;
      }

      if (request.method === 'POST' && request.url === '/ai/generate-image') {
        const input = await readBody(request) as AiImageOptions;
        sendJson(request, response, 200, { url: await aiService.generateImage(input) });
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
