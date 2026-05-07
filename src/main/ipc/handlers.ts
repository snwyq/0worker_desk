import electron from 'electron';
import http from 'node:http';
import type { AnalyzeHotPeopleInput, ConnectionTestResult, CopyContentStyleInput, CreateAccountInput, CreateContentItemInput, CreateContentStyleInput, CreateDistributionTaskInput, CreateHotBaziTaskInput, CreatePostInput, CreatePublishingStrategyInput, CreateReviewItemInput, DeleteAccountResult, DeletePostResult, GenerateHotBaziBatchInput, PublishAttemptResult, UpdateAccountInput, UpdateContentItemInput, UpdateContentStyleInput, UpdateDistributionTaskInput, UpdateHotBaziTaskInput } from '../../shared/types.js';
import { fetchAdsPowerProfiles } from '../browser/AdsPowerApi.js';
import { createConnectorForAccount } from '../browser/BrowserConnectorFactory.js';
import type { AppDatabase } from '../db/database.js';
import { readHelpDocs } from '../docs/HelpDocsService.js';
import { getWeiboPublisherLogPath } from '../publisher/WeiboDiagnostics.js';
import { shouldPublishPost } from '../publisher/PublishWorker.js';
import { publishPostNow } from '../publisher/PublishService.js';
import { PublishScheduler } from '../publisher/Scheduler.js';
import { WeiboPublisher } from '../publisher/WeiboPublisher.js';
import { listPlatformCapabilities } from '../platforms/registry.js';
import { checkForUpdates, readUpdateConfig } from '../updater/UpdateService.js';
import { AiService, aiService, type AiGenerateOptions, type AiImageOptions } from '../services/AiService.js';
import { hotBaziService } from '../services/HotBaziService.js';
import { hotPeopleService } from '../services/HotPeopleService.js';
import { getWorkflowEngine } from '../core/workflow/EngineRegistry.js';
import { createWorkflowRunner } from '../core/workflow/EngineRegistry.js';
import { ImageGenTool } from '../core/tools/ImageGenTool.js';
import type { ITool } from '../core/tools/ITool.js';
import type { WorkflowDefinition } from '../core/workflow/types.js';


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
      return publishPostNow(repositories, post.id, { ignoreSchedule: true });
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
    const existing = existingAccounts.find((a: any) => a.providerProfileId === profile.user_id && a.browserMode === 'adspower');

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
  return repositories.distributionTasks.list().find((task: any) => task.legacyPostId === postId) ?? null;
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
  hotPeopleService.init(repositories);
  hotBaziService.init(repositories);
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
  ipcMain.handle('distributionTasks:create', (_event, input: CreateDistributionTaskInput) => repositories.distributionTasks.create(input));
  ipcMain.handle('distributionTasks:update', (_event, id: number, input: UpdateDistributionTaskInput) => repositories.distributionTasks.update(id, input));
  ipcMain.handle('distributionTasks:retry', (_event, id: number) => repositories.distributionTasks.retry(id));
  ipcMain.handle('distributionTasks:cancel', (_event, id: number) => repositories.distributionTasks.cancel(id));
  ipcMain.handle('distributionTasks:delete', (_event, id: number) => ({ ok: repositories.distributionTasks.delete(id) }));
  ipcMain.handle('distributionTasks:publishNow', (_event, id: number) => scheduler.publishTaskNow(id));
  ipcMain.handle('distributionTasks:retryMany', (_event, ids: number[]) => repositories.distributionTasks.retryMany(ids));
  ipcMain.handle('distributionTasks:cancelMany', (_event, ids: number[]) => repositories.distributionTasks.cancelMany(ids));
  ipcMain.handle('distributionTasks:deleteMany', (_event, ids: number[]) => ({ deleted: repositories.distributionTasks.deleteMany(ids) }));
  ipcMain.handle('distributionTasks:returnToReview', (_event, id: number, comment?: string) => (
    repositories.distributionTasks.returnToReview(id, comment ?? 'Returned to review')
  ));
  ipcMain.handle('distributionTasks:assignSchedule', (_event, id: number) => repositories.distributionTasks.assignSchedule(id));
  ipcMain.handle('distributionTasks:assignScheduleMany', (_event, ids: number[]) => repositories.distributionTasks.assignScheduleMany(ids));
  ipcMain.handle('sourceColumns:list', () => repositories.sourceColumns.list());
  ipcMain.handle('hotBaziTasks:list', () => repositories.hotBaziTasks.list());
  ipcMain.handle('hotBaziTasks:create', (_event, input: CreateHotBaziTaskInput) => repositories.hotBaziTasks.create(input));
  ipcMain.handle('hotBaziTasks:update', (_event, id: number, input: UpdateHotBaziTaskInput) => repositories.hotBaziTasks.update(id, input));
  ipcMain.handle('hotBaziTasks:delete', (_event, id: number) => ({ ok: repositories.hotBaziTasks.delete(id) }));
  ipcMain.handle('hotBaziTasks:deleteMany', (_event, ids: number[]) => ({ deleted: repositories.hotBaziTasks.deleteMany(ids) }));
  ipcMain.handle('hotBaziTasks:enqueue', (_event, id: number) => repositories.hotBaziTasks.enqueueToDistribution(id));
  ipcMain.handle('hotBaziTasks:enqueueMany', (_event, ids: number[]) => repositories.hotBaziTasks.enqueueManyToDistribution(ids));
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
  ipcMain.handle('ai:listStyles', (_event, accountId: number, pluginCode?: string) => (
    repositories.contentStyles.listForAccount(accountId, pluginCode)
  ));
  ipcMain.handle('ai:createStyle', (_event, input: CreateContentStyleInput) => repositories.contentStyles.create(input));
  ipcMain.handle('ai:updateStyle', (_event, id: string, input: UpdateContentStyleInput) => repositories.contentStyles.update(id, input));
  ipcMain.handle('ai:copyStyleToAccounts', (_event, id: string, input: CopyContentStyleInput) => (
    repositories.contentStyles.copyToAccounts(id, input.targetAccountIds, input.nameSuffix)
  ));
  ipcMain.handle('ai:deleteStyle', (_event, id: string) => ({
    ok: repositories.contentStyles.delete(id),
  }));
  ipcMain.handle('ai:listWorkflows', (_event, pluginCode: string) => repositories.aiWorkflows.listByPlugin(pluginCode));

  // Publishing Strategies
  ipcMain.handle('publishingStrategies:list', () => repositories.publishingStrategies.list());
  ipcMain.handle('publishingStrategies:findByWorkflow', (_event, workflowCode: string) => repositories.publishingStrategies.findByWorkflow(workflowCode));
  ipcMain.handle('publishingStrategies:upsert', (_event, input: CreatePublishingStrategyInput) => repositories.publishingStrategies.upsert(input));
  ipcMain.handle('publishingStrategies:delete', (_event, workflowCode: string) => {
    repositories.publishingStrategies.delete(workflowCode);
    return { ok: true };
  });

  ipcMain.handle('ai:startWorkflowRun', async (event, input: StartWorkflowRunInput) => (
    startWorkflowRun(event, repositories, input)
  ));
  ipcMain.handle('ai:getWorkflowRun', (_event, runId: string) => repositories.aiWorkflowRuns.findByRunId(runId));
  ipcMain.handle('ai:previewWorkflow_v3', async (event, pluginCode: string, workflowCode: string, inputParams: any) => {
    return handlePreviewWorkflow(event, repositories, pluginCode, workflowCode, inputParams);
  });
  ipcMain.handle('ai:listHotTopics', (_event, force: boolean) => aiService.fetchHotTopics(force));
  ipcMain.handle('ai:deleteAllHotTopics', () => ({ deleted: repositories.hotTopicsHistory.deleteAll() }));
  ipcMain.handle('ai:listHotPeople', () => hotPeopleService.list());
  ipcMain.handle('ai:getHotPeopleQueueSummary', () => repositories.hotTopicAnalysis.getQueueSummary());
  ipcMain.handle('ai:getHotPeopleAnalyzeProgress', () => hotPeopleService.getAnalyzeProgress());
  ipcMain.handle('ai:deleteAllHotPeople', () => ({ deleted: repositories.hotPeople.deleteAll() }));
  ipcMain.handle('ai:resetHotPeopleAnalysis', () => ({
    deleted: repositories.hotPeople.deleteToday(),
    reset: repositories.hotTopicAnalysis.resetToday(),
  }));
  ipcMain.handle('ai:analyzeHotPeople', (_event, input?: AnalyzeHotPeopleInput) => hotPeopleService.analyzePendingHotTopics(input));
  ipcMain.handle('ai:generateHotBaziBatch', (_event, input: GenerateHotBaziBatchInput) => hotBaziService.generateBatch(input));
  ipcMain.handle('ai:startAgentSchedule', async (_event, accountId: number) => {
    // In production, this would register a node-cron job or an interval.
    return { ok: true, message: `Scheduled agent for account ${accountId}` };
  });
  ipcMain.handle('review:listItems', () => repositories.reviewItems.listPending());
  ipcMain.handle('review:create', (_event, input: CreateReviewItemInput) => repositories.reviewItems.create(input));
  ipcMain.handle('review:approve', (_event, id: number, reviewerId: string, comment?: string) => (
    repositories.reviewItems.approve(id, reviewerId, comment ?? '')
  ));
  ipcMain.handle('review:reject', (_event, id: number, reviewerId: string, comment?: string) => (
    repositories.reviewItems.reject(id, reviewerId, comment ?? '')
  ));
  ipcMain.handle('review:rewrite', async (_event, id: number, reviewerId: string, comment?: string, rewrittenBody?: string) => (
    rewriteReviewItem(repositories, aiService, id, reviewerId, comment ?? '', rewrittenBody)
  ));
}

type StartWorkflowRunInput = {
  accountId: number | null;
  pluginCode: string;
  workflowCode: string;
  inputParams?: Record<string, unknown>;
};

async function rewriteReviewItem(
  repositories: AppDatabase,
  service: AiService,
  id: number,
  reviewerId: string,
  comment: string,
  rewrittenBody?: string,
) {
  if (rewrittenBody?.trim()) {
    return repositories.reviewItems.applyRewrite(id, reviewerId, comment, rewrittenBody.trim());
  }

  const review = repositories.reviewItems.requestRewrite(id, reviewerId, comment);
  const content = repositories.contentItems.findById(review.contentId);
  if (!content) {
    return review;
  }

  const prompt = [
    '请根据审核意见重写下面这条微博内容。',
    '要求：保留核心事实，不扩写为长文，不添加未经提供的新事实，语气自然，适合微博发布。',
    `审核意见：${comment || '请优化表达方式'}`,
    `原文：${content.body}`,
    '只输出重写后的微博正文。',
  ].join('\n\n');
  try {
    const generated = await service.generateText({ prompt, model: 'qwen-turbo', maxTokens: 800 });
    const nextBody = generated.content.trim();
    if (!nextBody) {
      return repositories.reviewItems.setRewriteError(id, 'AI 未返回可用的重写结果，请调整要求后重试。');
    }

    return repositories.reviewItems.applyRewrite(id, reviewerId, comment, nextBody);
  } catch (error) {
    console.warn('[review-rewrite] AI rewrite failed; review item remains in rewriting state.', error);
    const message = error instanceof Error ? error.message : String(error);
    return repositories.reviewItems.setRewriteError(id, message);
  }
}

async function startWorkflowRun(event: any, repositories: AppDatabase, input: StartWorkflowRunInput) {
  const workflowRecord = repositories.aiWorkflows.findByCode(input.pluginCode.trim(), input.workflowCode.trim());
  if (!workflowRecord) {
    throw new Error(`Workflow ${input.workflowCode} not found`);
  }

  const definition = {
    ...workflowRecord.definitionJson,
    pluginCode: workflowRecord.pluginCode,
    workflowId: workflowRecord.code,
    trigger: String(workflowRecord.definitionJson.trigger ?? 'manual'),
    steps: Array.isArray(workflowRecord.definitionJson.steps) ? workflowRecord.definitionJson.steps : [],
  } as WorkflowDefinition;
  const runner = createWorkflowRunner(repositories);
  const runId = await runner.start(
    definition,
    input.accountId ?? null,
    input.inputParams ?? {},
    (log) => {
      if (event?.sender) {
        event.sender.send('ai:workflow-log', { runId, ...log });
      }
    },
  );

  return repositories.aiWorkflowRuns.findByRunId(runId);
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
  const httpAiService = new AiService();
  httpAiService.init(repositories);
  hotPeopleService.init(repositories);
  hotBaziService.init(repositories);
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


      if (request.method === 'GET' && request.url === '/source-columns') {
        sendJson(request, response, 200, repositories.sourceColumns.list());
        return;
      }

      if (request.method === 'GET' && request.url === '/hot-bazi-tasks') {
        sendJson(request, response, 200, repositories.hotBaziTasks.list());
        return;
      }

      if (request.method === 'POST' && request.url === '/hot-bazi-tasks') {
        const input = await readBody(request) as CreateHotBaziTaskInput;
        sendJson(request, response, 200, repositories.hotBaziTasks.create(input));
        return;
      }

      const hotBaziTaskMatch = request.url?.match(/^\/hot-bazi-tasks\/(\d+)$/);
      if (request.method === 'PATCH' && hotBaziTaskMatch) {
        const input = await readBody(request) as UpdateHotBaziTaskInput;
        sendJson(request, response, 200, repositories.hotBaziTasks.update(Number(hotBaziTaskMatch[1]), input));
        return;
      }

      if (request.method === 'DELETE' && hotBaziTaskMatch) {
        sendJson(request, response, 200, { ok: repositories.hotBaziTasks.delete(Number(hotBaziTaskMatch[1])) });
        return;
      }

      const hotBaziEnqueueMatch = request.url?.match(/^\/hot-bazi-tasks\/(\d+)\/enqueue$/);
      if (request.method === 'POST' && hotBaziEnqueueMatch) {
        sendJson(request, response, 200, repositories.hotBaziTasks.enqueueToDistribution(Number(hotBaziEnqueueMatch[1])));
        return;
      }

      if (request.method === 'POST' && request.url === '/hot-bazi-tasks/delete-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, { deleted: repositories.hotBaziTasks.deleteMany(input.ids) });
        return;
      }

      if (request.method === 'POST' && request.url === '/hot-bazi-tasks/enqueue-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, repositories.hotBaziTasks.enqueueManyToDistribution(input.ids));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks') {
        const input = await readBody(request) as CreateDistributionTaskInput;
        sendJson(request, response, 200, repositories.distributionTasks.create(input));
        return;
      }

      const distributionTaskMatch = request.url?.match(/^\/distribution-tasks\/(\d+)$/);
      if (request.method === 'PATCH' && distributionTaskMatch) {
        const input = await readBody(request) as UpdateDistributionTaskInput;
        sendJson(request, response, 200, repositories.distributionTasks.update(Number(distributionTaskMatch[1]), input));
        return;
      }

      if (request.method === 'DELETE' && distributionTaskMatch) {
        sendJson(request, response, 200, { ok: repositories.distributionTasks.delete(Number(distributionTaskMatch[1])) });
        return;
      }

      const distributionRetryMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/retry$/);
      if (request.method === 'POST' && distributionRetryMatch) {
        sendJson(request, response, 200, repositories.distributionTasks.retry(Number(distributionRetryMatch[1])));
        return;
      }

      const distributionPublishNowMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/publish-now$/);
      if (request.method === 'POST' && distributionPublishNowMatch) {
        sendJson(request, response, 200, await scheduler.publishTaskNow(Number(distributionPublishNowMatch[1])));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks/retry-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, repositories.distributionTasks.retryMany(input.ids));
        return;
      }

      const distributionAssignScheduleMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/assign-schedule$/);
      if (request.method === 'POST' && distributionAssignScheduleMatch) {
        sendJson(request, response, 200, repositories.distributionTasks.assignSchedule(Number(distributionAssignScheduleMatch[1])));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks/assign-schedule-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, repositories.distributionTasks.assignScheduleMany(input.ids));
        return;
      }

      const distributionCancelMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/cancel$/);
      if (request.method === 'POST' && distributionCancelMatch) {
        sendJson(request, response, 200, repositories.distributionTasks.cancel(Number(distributionCancelMatch[1])));
        return;
      }

      const distributionReturnReviewMatch = request.url?.match(/^\/distribution-tasks\/(\d+)\/return-review$/);
      if (request.method === 'POST' && distributionReturnReviewMatch) {
        const input = await readBody(request) as { comment?: string };
        sendJson(request, response, 200, repositories.distributionTasks.returnToReview(
          Number(distributionReturnReviewMatch[1]),
          input.comment ?? 'Returned to review',
        ));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks/cancel-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, repositories.distributionTasks.cancelMany(input.ids));
        return;
      }

      if (request.method === 'POST' && request.url === '/distribution-tasks/delete-many') {
        const input = await readBody(request) as { ids: number[] };
        sendJson(request, response, 200, { deleted: repositories.distributionTasks.deleteMany(input.ids) });
        return;
      }

      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'GET' && requestUrl.pathname === '/publish-runs') {
        const taskId = requestUrl.searchParams.get('taskId');
        sendJson(request, response, 200, taskId ? repositories.publishRuns.listByTask(Number(taskId)) : repositories.publishRuns.list());
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/ai/styles') {
        const accountId = Number(requestUrl.searchParams.get('accountId'));
        if (!Number.isFinite(accountId) || accountId <= 0) {
          sendJson(request, response, 400, { error: 'accountId is required' });
          return;
        }
        const pluginCode = requestUrl.searchParams.get('pluginCode') ?? undefined;
        sendJson(request, response, 200, repositories.contentStyles.listForAccount(accountId, pluginCode));
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/ai/styles') {
        const input = await readBody(request) as CreateContentStyleInput;
        sendJson(request, response, 200, repositories.contentStyles.create(input));
        return;
      }

      const styleMatch = requestUrl.pathname.match(/^\/ai\/styles\/([^\/]+)$/);
      if (request.method === 'PUT' && styleMatch) {
        const input = await readBody(request) as UpdateContentStyleInput;
        sendJson(request, response, 200, repositories.contentStyles.update(decodeURIComponent(styleMatch[1]), input));
        return;
      }

      if (request.method === 'DELETE' && styleMatch) {
        sendJson(request, response, 200, { ok: repositories.contentStyles.delete(decodeURIComponent(styleMatch[1])) });
        return;
      }

      const styleCopyMatch = requestUrl.pathname.match(/^\/ai\/styles\/([^\/]+)\/copy-to-accounts$/);
      if (request.method === 'POST' && styleCopyMatch) {
        const input = await readBody(request) as CopyContentStyleInput;
        sendJson(request, response, 200, repositories.contentStyles.copyToAccounts(
          decodeURIComponent(styleCopyMatch[1]),
          input.targetAccountIds,
          input.nameSuffix,
        ));
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/review-items') {
        sendJson(request, response, 200, repositories.reviewItems.listPending());
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/review-items') {
        const input = await readBody(request) as CreateReviewItemInput;
        sendJson(request, response, 200, repositories.reviewItems.create(input));
        return;
      }

      const reviewApproveMatch = requestUrl.pathname.match(/^\/review-items\/(\d+)\/approve$/);
      if (request.method === 'POST' && reviewApproveMatch) {
        const input = await readBody(request) as { reviewerId?: string; comment?: string };
        sendJson(request, response, 200, repositories.reviewItems.approve(
          Number(reviewApproveMatch[1]),
          input.reviewerId ?? 'operator',
          input.comment ?? '',
        ));
        return;
      }

      const reviewRejectMatch = requestUrl.pathname.match(/^\/review-items\/(\d+)\/reject$/);
      if (request.method === 'POST' && reviewRejectMatch) {
        const input = await readBody(request) as { reviewerId?: string; comment?: string };
        sendJson(request, response, 200, repositories.reviewItems.reject(
          Number(reviewRejectMatch[1]),
          input.reviewerId ?? 'operator',
          input.comment ?? '',
        ));
        return;
      }

      const reviewRewriteMatch = requestUrl.pathname.match(/^\/review-items\/(\d+)\/rewrite$/);
      if (request.method === 'POST' && reviewRewriteMatch) {
        const input = await readBody(request) as { reviewerId?: string; comment?: string; rewrittenBody?: string };
        sendJson(request, response, 200, await rewriteReviewItem(
          repositories,
          httpAiService,
          Number(reviewRewriteMatch[1]),
          input.reviewerId ?? 'operator',
          input.comment ?? '',
          input.rewrittenBody,
        ));
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

      if (request.method === 'GET' && requestUrl.pathname === '/ai/hot-topics') {
        sendJson(request, response, 200, await httpAiService.fetchHotTopics(requestUrl.searchParams.get('force') === 'true'));
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/ai/hot-people') {
        sendJson(request, response, 200, hotPeopleService.list());
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/ai/hot-people-queue-summary') {
        sendJson(request, response, 200, repositories.hotTopicAnalysis.getQueueSummary());
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/ai/hot-people-analyze-progress') {
        sendJson(request, response, 200, hotPeopleService.getAnalyzeProgress());
        return;
      }

      if (request.method === 'GET' && requestUrl.pathname === '/ai/hot-people-failed') {
        sendJson(request, response, 200, repositories.hotTopicAnalysis.listFailed());
        return;
      }

      if (request.method === 'DELETE' && requestUrl.pathname === '/ai/hot-people') {
        sendJson(request, response, 200, { deleted: repositories.hotPeople.deleteAll() });
        return;
      }

      if (request.method === 'DELETE' && requestUrl.pathname === '/ai/hot-topics') {
        sendJson(request, response, 200, { deleted: repositories.hotTopicsHistory.deleteAll() });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/ai/hot-people/reset-analysis') {
        sendJson(request, response, 200, {
          deleted: repositories.hotPeople.deleteToday(),
          reset: repositories.hotTopicAnalysis.resetToday(),
        });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/ai/hot-people/analyze') {
        const input = await readBody(request) as AnalyzeHotPeopleInput;
        sendJson(request, response, 200, await hotPeopleService.analyzePendingHotTopics(input));
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/ai/hot-bazi/generate-batch') {
        const input = await readBody(request) as GenerateHotBaziBatchInput;
        sendJson(request, response, 200, await hotBaziService.generateBatch(input));
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

      if (request.method === 'POST' && requestUrl.pathname === '/ai/workflow-runs') {
        const input = await readBody(request) as StartWorkflowRunInput;
        sendJson(request, response, 200, await startWorkflowRun(null as any, repositories, input));
        return;
      }

      const workflowRunMatch = requestUrl.pathname.match(/^\/ai\/workflow-runs\/([^\/]+)$/);
      if (request.method === 'GET' && workflowRunMatch) {
        const run = repositories.aiWorkflowRuns.findByRunId(decodeURIComponent(workflowRunMatch[1]));
        sendJson(request, response, run ? 200 : 404, run ?? { error: 'Workflow run not found' });
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
        sendJson(request, response, 200, await httpAiService.generateText(input));
        return;
      }

      if (request.method === 'POST' && request.url === '/ai/generate-image') {
        const input = await readBody(request) as AiImageOptions;
        sendJson(request, response, 200, { url: await httpAiService.generateImage(input) });
        return;
      }

      // Publishing Strategies HTTP routes
      if (request.method === 'GET' && requestUrl.pathname === '/publishing-strategies') {
        sendJson(request, response, 200, repositories.publishingStrategies.list());
        return;
      }

      const publishingStrategyMatch = requestUrl.pathname.match(/^\/publishing-strategies\/(.+)$/);
      if (request.method === 'GET' && publishingStrategyMatch) {
        const workflowCode = decodeURIComponent(publishingStrategyMatch[1]);
        const strategy = repositories.publishingStrategies.findByWorkflow(workflowCode);
        sendJson(request, response, strategy ? 200 : 404, strategy ?? { error: 'Not found' });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/publishing-strategies') {
        const input = await readBody(request) as CreatePublishingStrategyInput;
        sendJson(request, response, 200, repositories.publishingStrategies.upsert(input));
        return;
      }

      if (request.method === 'DELETE' && publishingStrategyMatch) {
        const workflowCode = decodeURIComponent(publishingStrategyMatch[1]);
        repositories.publishingStrategies.delete(workflowCode);
        sendJson(request, response, 200, { ok: true });
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
