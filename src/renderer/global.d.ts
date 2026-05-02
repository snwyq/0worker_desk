import type { Account, ConnectionTestResult, CreateAccountInput, CreatePostInput, DeletePostResult, Post, PublishAttemptResult, PublishNowResult, SchedulerStatus } from '../shared/types';

declare global {
  interface Window {
    weiboPublisher: {
      accounts: {
        list: () => Promise<Account[]>;
        create: (input: CreateAccountInput) => Promise<Account>;
        testConnection: (accountId: number) => Promise<ConnectionTestResult>;
      };
      posts: {
        list: () => Promise<Post[]>;
        create: (input: CreatePostInput) => Promise<Post>;
        delete: (postId: number) => Promise<DeletePostResult>;
        due: () => Promise<Post[]>;
        attemptPublish: (postId: number) => Promise<PublishAttemptResult>;
        publishNow: (postId: number) => Promise<PublishNowResult>;
      };
      scheduler: {
        start: () => Promise<SchedulerStatus>;
        stop: () => Promise<SchedulerStatus>;
        status: () => Promise<SchedulerStatus>;
      };
      media: {
        selectFiles: () => Promise<string[]>;
      };
    };
  }
}
