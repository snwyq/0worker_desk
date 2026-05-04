import type { Account, AiGenerateOptions, AiImageOptions, AiPlugin, AiResponse, AiWorkflow, AiWorkflowRun, AppSetting, ConnectionTestResult, ContentItem, ContentVersion, ContentStyle, CopyContentStyleInput, CreateAccountInput, CreateContentItemInput, CreateContentStyleInput, CreateDistributionTaskInput, CreatePostInput, CreateReviewItemInput, DeleteAccountResult, DeletePostResult, DistributionTask, Platform, PlatformCapabilities, Post, PublishAttemptResult, PublishNowResult, PublishRun, ReviewItem, SchedulerStatus, UpdateAccountInput, UpdateCheckResult, UpdateConfig, UpdateContentItemInput, UpdateContentStyleInput, UpdateDistributionTaskInput } from '../shared/types';


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
    returnToReview: (id: number, comment = 'Returned to review'): Promise<DistributionTask> => {
      if (window.weiboPublisher?.distributionTasks?.returnToReview) {
        return window.weiboPublisher.distributionTasks.returnToReview(id, comment);
      }
      return httpJson<DistributionTask>(`/distribution-tasks/${id}/return-review`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
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
    listHotTopics: async (force = false): Promise<{ items: any[], lastFetchTime: string | null }> => {
      if (window.weiboPublisher?.ai) {
        return await window.weiboPublisher.ai.listHotTopics(force);
      }
      return await httpJson<{ items: any[], lastFetchTime: string | null }>(`/ai/hot-topics${force ? '?force=true' : ''}`);
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
