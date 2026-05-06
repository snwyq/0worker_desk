import type { Account, AiGenerateOptions, AiImageOptions, AiPlugin, AiResponse, AiWorkflow, AiWorkflowRun, AnalyzeHotPeopleInput, AnalyzeHotPeopleResult, AppSetting, ConnectionTestResult, ContentItem, ContentVersion, ContentStyle, CopyContentStyleInput, CreateAccountInput, CreateContentItemInput, CreateContentStyleInput, CreateDispatchRuleProfileInput, CreateDistributionTaskInput, CreateHotBaziTaskInput, CreatePostInput, CreateReviewItemInput, DeleteAccountResult, DeletePostResult, DispatchRuleProfile, DispatchSimulationEntry, DistributionTask, GenerateHotBaziBatchInput, GenerateHotBaziBatchResult, HotBaziTask, HotPerson, Platform, PlatformCapabilities, Post, PublishAttemptResult, PublishNowResult, PublishRun, ReviewItem, SchedulerStatus, SourceColumn, UpdateAccountInput, UpdateCheckResult, UpdateConfig, UpdateContentItemInput, UpdateContentStyleInput, UpdateDispatchRuleProfileInput, UpdateDistributionTaskInput, UpdateHotBaziTaskInput, PublishingStrategy, CreatePublishingStrategyInput, UpdatePublishingStrategyInput } from '../shared/types';


const httpBaseUrl = 'http://127.0.0.1:5183';

async function httpJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${httpBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  return body as T;
}

export const appApi = {
  accounts: {
    list: (): Promise<Account[]> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.list();
      }
      return httpJson<Account[]>('/accounts');
    },
    create: (input: CreateAccountInput): Promise<Account> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.create(input);
      }
      return httpJson<Account>('/accounts', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    update: (id: number, input: UpdateAccountInput): Promise<Account> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.update(id, input);
      }
      return httpJson<Account>(`/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    delete: (id: number): Promise<DeleteAccountResult> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.delete(id);
      }
      return httpJson<DeleteAccountResult>(`/accounts/${id}`, {
        method: 'DELETE',
      });
    },
    testConnection: (accountId: number): Promise<ConnectionTestResult> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.testConnection(accountId);
      }
      return httpJson<ConnectionTestResult>(`/accounts/${accountId}/test-connection`, {
        method: 'POST',
      });
    },
    syncAdsPower: (): Promise<{ ok: boolean; message: string; totalSynced: number; newlyAdded: number }> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.syncAdsPower();
      }
      return httpJson<{ ok: boolean; message: string; totalSynced: number; newlyAdded: number }>('/accounts/sync-adspower', {
        method: 'POST',
      });
    },
    openBrowser: (accountId: number): Promise<ConnectionTestResult> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.accounts.openBrowser(accountId);
      }
      return httpJson<ConnectionTestResult>(`/accounts/${accountId}/open-browser`, {
        method: 'POST',
      });
    },
  },
  posts: {
    list: (): Promise<Post[]> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.posts.list();
      }
      return httpJson<Post[]>('/posts');
    },
    create: (input: CreatePostInput): Promise<Post> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.posts.create(input);
      }
      return httpJson<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    delete: async (postId: number): Promise<DeletePostResult> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.posts.delete(postId);
      }
      return httpJson<DeletePostResult>(`/posts/${postId}`, {
        method: 'DELETE',
      });
    },
    attemptPublish: (postId: number): Promise<PublishAttemptResult> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.posts.attemptPublish(postId);
      }
      return httpJson<PublishAttemptResult>(`/posts/${postId}/attempt-publish`, {
        method: 'POST',
      });
    },
    publishNow: (postId: number): Promise<PublishNowResult> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.posts.publishNow(postId);
      }
      return httpJson<PublishNowResult>(`/posts/${postId}/publish-now`, {
        method: 'POST',
      });
    },
  },
  scheduler: {
    start: (): Promise<SchedulerStatus> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.scheduler.start();
      }
      return httpJson<SchedulerStatus>('/scheduler/start', { method: 'POST' });
    },
    stop: (): Promise<SchedulerStatus> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.scheduler.stop();
      }
      return httpJson<SchedulerStatus>('/scheduler/stop', { method: 'POST' });
    },
    status: (): Promise<SchedulerStatus> => {
      if (window.weiboPublisher) {
        return window.weiboPublisher.scheduler.status();
      }
      return httpJson<SchedulerStatus>('/scheduler/status');
    },
  },
  media: {
    selectFiles: async (): Promise<string[]> => {
      if (window.weiboPublisher?.media) {
        return window.weiboPublisher.media.selectFiles();
      }
      return httpJson<string[]>('/media/select-files', { method: 'POST' });
    },
  },
  settings: {
    list: (): Promise<AppSetting[]> => {
      if (window.weiboPublisher?.settings) {
        return window.weiboPublisher.settings.list();
      }
      return httpJson<AppSetting[]>('/settings');
    },
    set: (key: string, value: string): Promise<AppSetting[]> => {
      if (window.weiboPublisher?.settings) {
        return window.weiboPublisher.settings.set(key, value);
      }
      return httpJson<AppSetting[]>('/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      });
    },
  },
  platforms: {
    list: (): Promise<Platform[]> => {
      if (window.weiboPublisher?.platforms) {
        return window.weiboPublisher.platforms.list();
      }
      return httpJson<Platform[]>('/platforms');
    },
  },
  platformCapabilities: {
    list: (): Promise<PlatformCapabilities[]> => {
      if (window.weiboPublisher?.platformCapabilities) {
        return window.weiboPublisher.platformCapabilities.list();
      }
      return httpJson<PlatformCapabilities[]>('/platform-capabilities');
    },
  },
  contents: {
    list: (): Promise<ContentItem[]> => {
      if (window.weiboPublisher?.contents) {
        return window.weiboPublisher.contents.list();
      }
      return httpJson<ContentItem[]>('/contents');
    },
    create: (input: CreateContentItemInput): Promise<ContentItem> => {
      if (window.weiboPublisher?.contents) {
        return window.weiboPublisher.contents.create(input);
      }
      return httpJson<ContentItem>('/contents', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    update: (id: number, input: UpdateContentItemInput): Promise<ContentItem> => {
      if (window.weiboPublisher?.contents) {
        return window.weiboPublisher.contents.update(id, input);
      }
      return httpJson<ContentItem>(`/contents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    delete: (id: number): Promise<{ ok: boolean }> => {
      if (window.weiboPublisher?.contents) {
        return window.weiboPublisher.contents.delete(id);
      }
      return httpJson<{ ok: boolean }>(`/contents/${id}`, {
        method: 'DELETE',
      });
    },
    versions: (contentId: number): Promise<ContentVersion[]> => {
      if (window.weiboPublisher?.contents) {
        return window.weiboPublisher.contents.versions(contentId) as Promise<ContentVersion[]>;
      }
      return httpJson<ContentVersion[]>(`/contents/${contentId}/versions`);
    },
  },
  distributionTasks: {
    list: (): Promise<DistributionTask[]> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.list();
      }
      return httpJson<DistributionTask[]>('/distribution-tasks');
    },
    create: (input: CreateDistributionTaskInput): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.create(input);
      }
      return httpJson<DistributionTask>('/distribution-tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    update: (id: number, input: UpdateDistributionTaskInput): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.update(id, input);
      }
      return httpJson<DistributionTask>(`/distribution-tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    retry: (id: number): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.retry(id);
      }
      return httpJson<DistributionTask>(`/distribution-tasks/${id}/retry`, {
        method: 'POST',
      });
    },
    cancel: (id: number): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.cancel(id);
      }
      return httpJson<DistributionTask>(`/distribution-tasks/${id}/cancel`, {
        method: 'POST',
      });
    },
    delete: (id: number): Promise<{ ok: boolean }> => {
      if (window.weiboPublisher?.distributionTasks?.delete) {
        return window.weiboPublisher.distributionTasks.delete(id);
      }
      return httpJson<{ ok: boolean }>(`/distribution-tasks/${id}`, {
        method: 'DELETE',
      });
    },
    publishNow: (id: number): Promise<PublishAttemptResult> => {
      if (window.weiboPublisher?.distributionTasks?.publishNow) {
        return window.weiboPublisher.distributionTasks.publishNow(id);
      }
      return httpJson<PublishAttemptResult>(`/distribution-tasks/${id}/publish-now`, {
        method: 'POST',
      });
    },
    retryMany: (ids: number[]): Promise<DistributionTask[]> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.retryMany(ids);
      }
      return httpJson<DistributionTask[]>('/distribution-tasks/retry-many', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },
    cancelMany: (ids: number[]): Promise<DistributionTask[]> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.cancelMany(ids);
      }
      return httpJson<DistributionTask[]>('/distribution-tasks/cancel-many', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },
    deleteMany: (ids: number[]): Promise<{ deleted: number }> => {
      if (window.weiboPublisher?.distributionTasks?.deleteMany) {
        return window.weiboPublisher.distributionTasks.deleteMany(ids);
      }
      return httpJson<{ deleted: number }>('/distribution-tasks/delete-many', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },
    returnToReview: (id: number, comment = 'Returned to review'): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks?.returnToReview) {
        return window.weiboPublisher.distributionTasks.returnToReview(id, comment);
      }
      return httpJson<DistributionTask>(`/distribution-tasks/${id}/return-review`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
    },
    assignSchedule: (id: number): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks?.assignSchedule) {
        return window.weiboPublisher.distributionTasks.assignSchedule(id);
      }
      return httpJson<DistributionTask>(`/distribution-tasks/${id}/assign-schedule`, { method: 'POST' });
    },
    assignScheduleMany: (ids: number[]): Promise<DistributionTask[]> => {
      if (window.weiboPublisher?.distributionTasks?.assignScheduleMany) {
        return window.weiboPublisher.distributionTasks.assignScheduleMany(ids);
      }
      return httpJson<DistributionTask[]>(`/distribution-tasks/assign-schedule-many`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },
  },
  dispatchRules: {
    list: (): Promise<DispatchRuleProfile[]> => {
      if (window.weiboPublisher?.dispatchRules) {
        return window.weiboPublisher.dispatchRules.list();
      }
      return httpJson<DispatchRuleProfile[]>('/dispatch-rules');
    },
    create: (input: CreateDispatchRuleProfileInput): Promise<DispatchRuleProfile> => {
      if (window.weiboPublisher?.dispatchRules) {
        return window.weiboPublisher.dispatchRules.create(input);
      }
      return httpJson<DispatchRuleProfile>('/dispatch-rules', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    update: (id: number, input: UpdateDispatchRuleProfileInput): Promise<DispatchRuleProfile> => {
      if (window.weiboPublisher?.dispatchRules) {
        return window.weiboPublisher.dispatchRules.update(id, input);
      }
      return httpJson<DispatchRuleProfile>(`/dispatch-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    delete: (id: number): Promise<{ ok: boolean }> => {
      if (window.weiboPublisher?.dispatchRules) {
        return window.weiboPublisher.dispatchRules.delete(id);
      }
      return httpJson<{ ok: boolean }>(`/dispatch-rules/${id}`, { method: 'DELETE' });
    },
    toggle: (id: number, enabled: boolean): Promise<DispatchRuleProfile> => {
      if (window.weiboPublisher?.dispatchRules) {
        return window.weiboPublisher.dispatchRules.toggle(id, enabled);
      }
      return httpJson<DispatchRuleProfile>(`/dispatch-rules/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
    },
    simulate: (id: number, horizonHours = 48): Promise<DispatchSimulationEntry[]> => {
      if (window.weiboPublisher?.dispatchRules?.simulate) {
        return window.weiboPublisher.dispatchRules.simulate(id, horizonHours);
      }
      return httpJson<DispatchSimulationEntry[]>(`/dispatch-rules/${id}/simulate`, {
        method: 'POST',
        body: JSON.stringify({ horizonHours }),
      });
    },
  },
  sourceColumns: {
    list: (): Promise<SourceColumn[]> => {
      if (window.weiboPublisher?.sourceColumns) {
        return window.weiboPublisher.sourceColumns.list();
      }
      return httpJson<SourceColumn[]>('/source-columns');
    },
  },
  publishingStrategies: {
    list: (): Promise<PublishingStrategy[]> => {
      if (window.weiboPublisher?.publishingStrategies) {
        return window.weiboPublisher.publishingStrategies.list();
      }
      return httpJson<PublishingStrategy[]>('/publishing-strategies');
    },
    findByWorkflow: async (workflowCode: string): Promise<PublishingStrategy | null> => {
      try {
        // 优先使用 Electron 桥接
        if (window.weiboPublisher?.publishingStrategies?.findByWorkflow) {
          return await window.weiboPublisher.publishingStrategies.findByWorkflow(workflowCode);
        }
        // 如果是在 Web 开发环境或桥接失效，尝试 HTTP 但不强制
        const result = await httpJson<PublishingStrategy>(`/publishing-strategies/${workflowCode}`).catch(() => null);
        return result;
      } catch (err) {
        // 任何错误（包括 404, 网络错误等）一律视为“未配置”，返回 null 触发默认策略
        console.warn('Strategy fetch failed, falling back to default:', err);
        return null;
      }
    },
    upsert: (input: CreatePublishingStrategyInput): Promise<PublishingStrategy> => {
      if (window.weiboPublisher?.publishingStrategies) {
        return window.weiboPublisher.publishingStrategies.upsert(input);
      }
      return httpJson<PublishingStrategy>('/publishing-strategies', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    delete: (workflowCode: string): Promise<{ ok: boolean }> => {
      if (window.weiboPublisher?.publishingStrategies) {
        return window.weiboPublisher.publishingStrategies.delete(workflowCode);
      }
      return httpJson<{ ok: boolean }>(`/publishing-strategies/${workflowCode}`, {
        method: 'DELETE',
      });
    },
  },
  hotBaziTasks: {
    list: (): Promise<HotBaziTask[]> => {
      if (window.weiboPublisher?.hotBaziTasks) {
        return window.weiboPublisher.hotBaziTasks.list();
      }
      return httpJson<HotBaziTask[]>('/hot-bazi-tasks');
    },
    create: (input: CreateHotBaziTaskInput): Promise<HotBaziTask> => {
      if (window.weiboPublisher?.hotBaziTasks?.create) {
        return window.weiboPublisher.hotBaziTasks.create(input);
      }
      return httpJson<HotBaziTask>('/hot-bazi-tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    update: (id: number, input: UpdateHotBaziTaskInput): Promise<HotBaziTask> => {
      if (window.weiboPublisher?.hotBaziTasks?.update) {
        return window.weiboPublisher.hotBaziTasks.update(id, input);
      }
      return httpJson<HotBaziTask>(`/hot-bazi-tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    delete: (id: number): Promise<{ ok: boolean }> => {
      if (window.weiboPublisher?.hotBaziTasks?.delete) {
        return window.weiboPublisher.hotBaziTasks.delete(id);
      }
      return httpJson<{ ok: boolean }>(`/hot-bazi-tasks/${id}`, {
        method: 'DELETE',
      });
    },
    deleteMany: (ids: number[]): Promise<{ deleted: number }> => {
      if (window.weiboPublisher?.hotBaziTasks?.deleteMany) {
        return window.weiboPublisher.hotBaziTasks.deleteMany(ids);
      }
      return httpJson<{ deleted: number }>('/hot-bazi-tasks/delete-many', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },
    enqueue: (id: number): Promise<DistributionTask> => {
      if (window.weiboPublisher?.hotBaziTasks?.enqueue) {
        return window.weiboPublisher.hotBaziTasks.enqueue(id);
      }
      return httpJson<DistributionTask>(`/hot-bazi-tasks/${id}/enqueue`, {
        method: 'POST',
      });
    },
    enqueueMany: (ids: number[]): Promise<DistributionTask[]> => {
      if (window.weiboPublisher?.hotBaziTasks?.enqueueMany) {
        return window.weiboPublisher.hotBaziTasks.enqueueMany(ids);
      }
      return httpJson<DistributionTask[]>('/hot-bazi-tasks/enqueue-many', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
    },
  },
  publishRuns: {
    list: (taskId?: number): Promise<PublishRun[]> => {
      if (window.weiboPublisher?.publishRuns) {
        return window.weiboPublisher.publishRuns.list(taskId);
      }
      return httpJson<PublishRun[]>(taskId ? `/publish-runs?taskId=${taskId}` : '/publish-runs');
    },
  },
  updates: {
    status: (): Promise<{ config: UpdateConfig }> => {
      if (window.weiboPublisher?.updates) {
        return window.weiboPublisher.updates.status();
      }
      return httpJson<{ config: UpdateConfig }>('/updates/status');
    },
    check: (): Promise<UpdateCheckResult> => {
      if (window.weiboPublisher?.updates) {
        return window.weiboPublisher.updates.check();
      }
      return httpJson<UpdateCheckResult>('/updates/check', { method: 'POST' });
    },
  },
  helpDocs: {
    get: (): Promise<{ userGuide: string; updateGuide: string; releaseNotes: string }> => {
      if (window.weiboPublisher?.helpDocs) {
        return window.weiboPublisher.helpDocs.get();
      }
      return httpJson<{ userGuide: string; updateGuide: string; releaseNotes: string }>('/help-docs');
    },
  },
  app: {
    relaunch: (): Promise<void> => {
      if (window.weiboPublisher?.app) {
        return window.weiboPublisher.app.relaunch();
      }
      return httpJson<void>('/app/relaunch', { method: 'POST' });
    },
  },
  ai: {
    generate: (options: AiGenerateOptions): Promise<AiResponse> => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.generate(options);
      }
      return httpJson<AiResponse>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    },
    generateImage: (options: AiImageOptions): Promise<{ url: string }> => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.generateImage(options);
      }
      return httpJson<{ url: string }>('/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    },
    listPlugins: (): Promise<AiPlugin[]> => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.listPlugins();
      }
      return httpJson<AiPlugin[]>('/ai/plugins');
    },
    listStyles: (accountId: number, pluginCode?: string): Promise<ContentStyle[]> => {
      if (window.weiboPublisher?.ai?.listStyles) {
        return window.weiboPublisher.ai.listStyles(accountId, pluginCode);
      }
      const query = new URLSearchParams({ accountId: String(accountId) });
      if (pluginCode) {
        query.set('pluginCode', pluginCode);
      }
      return httpJson<ContentStyle[]>(`/ai/styles?${query.toString()}`);
    },
    createStyle: (input: CreateContentStyleInput): Promise<ContentStyle> => {
      if (window.weiboPublisher?.ai?.createStyle) {
        return window.weiboPublisher.ai.createStyle(input);
      }
      return httpJson<ContentStyle>('/ai/styles', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    updateStyle: (id: string, input: UpdateContentStyleInput): Promise<ContentStyle> => {
      if (window.weiboPublisher?.ai?.updateStyle) {
        return window.weiboPublisher.ai.updateStyle(id, input);
      }
      return httpJson<ContentStyle>(`/ai/styles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    copyStyleToAccounts: (id: string, input: CopyContentStyleInput): Promise<ContentStyle[]> => {
      if (window.weiboPublisher?.ai?.copyStyleToAccounts) {
        return window.weiboPublisher.ai.copyStyleToAccounts(id, input);
      }
      return httpJson<ContentStyle[]>(`/ai/styles/${encodeURIComponent(id)}/copy-to-accounts`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    deleteStyle: (id: string): Promise<{ ok: boolean }> => {
      if (window.weiboPublisher?.ai?.deleteStyle) {
        return window.weiboPublisher.ai.deleteStyle(id);
      }
      return httpJson<{ ok: boolean }>(`/ai/styles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    listWorkflows: (pluginCode: string): Promise<AiWorkflow[]> => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.listWorkflows(pluginCode);
      }
      return httpJson<AiWorkflow[]>(`/ai/plugins/${pluginCode}/workflows`);
    },
    startWorkflowRun: (input: {
      accountId: number | null;
      pluginCode: string;
      workflowCode: string;
      inputParams?: Record<string, unknown>;
    }): Promise<AiWorkflowRun> => {
      if (window.weiboPublisher?.ai?.startWorkflowRun) {
        return window.weiboPublisher.ai.startWorkflowRun(input);
      }
      return httpJson<AiWorkflowRun>('/ai/workflow-runs', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    getWorkflowRun: (runId: string): Promise<AiWorkflowRun | null> => {
      if (window.weiboPublisher?.ai?.getWorkflowRun) {
        return window.weiboPublisher.ai.getWorkflowRun(runId);
      }
      return httpJson<AiWorkflowRun>(`/ai/workflow-runs/${encodeURIComponent(runId)}`);
    },
    listHotTopics: async (force = false): Promise<{ items: any[], lastFetchTime: string | null; sourceStatus?: Array<{ platform: string; ok: boolean; reason?: string; count?: number }>; insertedCount?: number }> => {
      if (window.weiboPublisher?.ai) {
        return await window.weiboPublisher.ai.listHotTopics(force);
      }
      return await httpJson<{ items: any[], lastFetchTime: string | null; sourceStatus?: Array<{ platform: string; ok: boolean; reason?: string; count?: number }>; insertedCount?: number }>(`/ai/hot-topics${force ? '?force=true' : ''}`);
    },
    deleteAllHotTopics: (): Promise<{ deleted: number }> => {
      if (window.weiboPublisher?.ai?.deleteAllHotTopics) {
        return window.weiboPublisher.ai.deleteAllHotTopics();
      }
      return httpJson<{ deleted: number }>('/ai/hot-topics', {
        method: 'DELETE',
      });
    },
    listHotPeople: (): Promise<HotPerson[]> => {
      if (window.weiboPublisher?.ai?.listHotPeople) {
        return window.weiboPublisher.ai.listHotPeople();
      }
      return httpJson<HotPerson[]>('/ai/hot-people');
    },
    getHotPeopleQueueSummary: (): Promise<{ pendingTopics: number; coolingFailedTopics: number; nextRetryAt?: string }> => {
      if (window.weiboPublisher?.ai?.getHotPeopleQueueSummary) {
        return window.weiboPublisher.ai.getHotPeopleQueueSummary();
      }
      return httpJson<{ pendingTopics: number; coolingFailedTopics: number; nextRetryAt?: string }>('/ai/hot-people-queue-summary');
    },
    getHotPeopleAnalyzeProgress: (): Promise<{ running: boolean; selectedTopics: number; processedTopics: number; pendingTopics: number }> => {
      if (window.weiboPublisher?.ai?.getHotPeopleAnalyzeProgress) {
        return window.weiboPublisher.ai.getHotPeopleAnalyzeProgress();
      }
      return httpJson<{ running: boolean; selectedTopics: number; processedTopics: number; pendingTopics: number }>('/ai/hot-people-analyze-progress');
    },
    deleteAllHotPeople: (): Promise<{ deleted: number }> => {
      if (window.weiboPublisher?.ai?.deleteAllHotPeople) {
        return window.weiboPublisher.ai.deleteAllHotPeople();
      }
      return httpJson<{ deleted: number }>('/ai/hot-people', {
        method: 'DELETE',
      });
    },
    resetHotPeopleAnalysis: (): Promise<{ deleted: number; reset: number }> => {
      if (window.weiboPublisher?.ai?.resetHotPeopleAnalysis) {
        return window.weiboPublisher.ai.resetHotPeopleAnalysis();
      }
      return httpJson<{ deleted: number; reset: number }>('/ai/hot-people/reset-analysis', {
        method: 'POST',
      });
    },
    analyzeHotPeople: (input: AnalyzeHotPeopleInput = {}): Promise<AnalyzeHotPeopleResult> => {
      if (window.weiboPublisher?.ai?.analyzeHotPeople) {
        return window.weiboPublisher.ai.analyzeHotPeople(input);
      }
      return httpJson<AnalyzeHotPeopleResult>('/ai/hot-people/analyze', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    generateHotBaziBatch: (input: GenerateHotBaziBatchInput): Promise<GenerateHotBaziBatchResult> => {
      if (window.weiboPublisher?.ai?.generateHotBaziBatch) {
        return window.weiboPublisher.ai.generateHotBaziBatch(input);
      }
      return httpJson<GenerateHotBaziBatchResult>('/ai/hot-bazi/generate-batch', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    previewWorkflow: (pluginCode: string, workflowCode: string, inputParams: any): Promise<{ runId: string }> => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.previewWorkflow(pluginCode, workflowCode, inputParams);
      }
      return httpJson<{ runId: string }>(`/ai/plugins/${pluginCode}/workflows/${workflowCode}/preview`, {
        method: 'POST',
        body: JSON.stringify(inputParams),
      });
    },
    startAgentSchedule: (accountId: number): Promise<{ ok: boolean; message: string }> => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.startAgentSchedule(accountId);
      }
      return httpJson<{ ok: boolean; message: string }>(`/ai/agent/${accountId}/start`, { method: 'POST' });
    },
    onWorkflowLog: (callback: (log: any) => void): (() => void) => {
      if (window.weiboPublisher?.ai) {
        return window.weiboPublisher.ai.onWorkflowLog(callback);
      }
      return () => {};
    },
  },
  review: {
    listItems: (): Promise<ReviewItem[]> => {
      if (window.weiboPublisher?.review) {
        return window.weiboPublisher.review.listItems();
      }
      return httpJson<ReviewItem[]>('/review-items');
    },
    create: (input: CreateReviewItemInput): Promise<ReviewItem> => {
      if (window.weiboPublisher?.review) {
        return window.weiboPublisher.review.create(input);
      }
      return httpJson<ReviewItem>('/review-items', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    approve: (id: number, reviewerId: string, comment = ''): Promise<ReviewItem> => {
      if (window.weiboPublisher?.review) {
        return window.weiboPublisher.review.approve(id, reviewerId, comment);
      }
      return httpJson<ReviewItem>(`/review-items/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId, comment }),
      });
    },
    reject: (id: number, reviewerId: string, comment = ''): Promise<ReviewItem> => {
      if (window.weiboPublisher?.review?.reject) {
        return window.weiboPublisher.review.reject(id, reviewerId, comment);
      }
      return httpJson<ReviewItem>(`/review-items/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId, comment }),
      });
    },
    rewrite: (id: number, reviewerId: string, comment = '', rewrittenBody?: string): Promise<ReviewItem> => {
      if (window.weiboPublisher?.review?.rewrite) {
        return window.weiboPublisher.review.rewrite(id, reviewerId, comment, rewrittenBody);
      }
      return httpJson<ReviewItem>(`/review-items/${id}/rewrite`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId, comment, rewrittenBody }),
      });
    },
  },
};
