import type { Account, AppSetting, ConnectionTestResult, ContentItem, CreateAccountInput, CreateContentItemInput, CreatePostInput, DeleteAccountResult, DeletePostResult, DistributionTask, Platform, PlatformCapabilities, Post, PublishAttemptResult, PublishNowResult, PublishRun, SchedulerStatus, UpdateAccountInput, UpdateCheckResult, UpdateConfig, UpdateContentItemInput, UpdateDistributionTaskInput } from '../shared/types';

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
  },
  distributionTasks: {
    list: (): Promise<DistributionTask[]> => {
      if (window.weiboPublisher?.distributionTasks) {
        return window.weiboPublisher.distributionTasks.list();
      }
      return httpJson<DistributionTask[]>('/distribution-tasks');
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
};
