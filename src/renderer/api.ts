import type { Account, ConnectionTestResult, CreateAccountInput, CreatePostInput, DeletePostResult, Post, PublishAttemptResult, PublishNowResult, SchedulerStatus } from '../shared/types';

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
};
