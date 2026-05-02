import type { Account, AppSetting, ConnectionTestResult, ContentItem, CreateAccountInput, CreateContentItemInput, CreatePostInput, DeletePostResult, DistributionTask, Platform, PlatformCapabilities, Post, PublishAttemptResult, PublishNowResult, PublishRun, SchedulerStatus, UpdateAccountInput, UpdateCheckResult, UpdateConfig, UpdateContentItemInput, UpdateDistributionTaskInput } from '../shared/types';

declare global {
  interface Window {
    weiboPublisher: {
      accounts: {
        list: () => Promise<Account[]>;
        create: (input: CreateAccountInput) => Promise<Account>;
        update: (id: number, input: UpdateAccountInput) => Promise<Account>;
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
      settings: {
        list: () => Promise<AppSetting[]>;
        set: (key: string, value: string) => Promise<AppSetting[]>;
      };
      platforms: {
        list: () => Promise<Platform[]>;
      };
      platformCapabilities: {
        list: () => Promise<PlatformCapabilities[]>;
      };
      contents: {
        list: () => Promise<ContentItem[]>;
        create: (input: CreateContentItemInput) => Promise<ContentItem>;
        update: (id: number, input: UpdateContentItemInput) => Promise<ContentItem>;
        delete: (id: number) => Promise<{ ok: boolean }>;
      };
      distributionTasks: {
        list: () => Promise<DistributionTask[]>;
        update: (id: number, input: UpdateDistributionTaskInput) => Promise<DistributionTask>;
        retry: (id: number) => Promise<DistributionTask>;
        cancel: (id: number) => Promise<DistributionTask>;
        retryMany: (ids: number[]) => Promise<DistributionTask[]>;
        cancelMany: (ids: number[]) => Promise<DistributionTask[]>;
      };
      publishRuns: {
        list: (taskId?: number) => Promise<PublishRun[]>;
      };
      updates: {
        status: () => Promise<{ config: UpdateConfig }>;
        check: () => Promise<UpdateCheckResult>;
      };
      helpDocs: {
        get: () => Promise<{ userGuide: string; updateGuide: string; releaseNotes: string }>;
      };
    };
  }
}
