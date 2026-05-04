import type { Account, AiGenerateOptions, AiImageOptions, AiPlugin, AiResponse, AiWorkflow, AppSetting, ConnectionTestResult, ContentItem, ContentStyle, CopyContentStyleInput, CreateAccountInput, CreateContentItemInput, CreateContentStyleInput, CreateDistributionTaskInput, CreatePostInput, CreateReviewItemInput, DeleteAccountResult, DeletePostResult, DistributionTask, Platform, PlatformCapabilities, Post, PublishAttemptResult, PublishNowResult, PublishRun, ReviewItem, SchedulerStatus, UpdateAccountInput, UpdateCheckResult, UpdateConfig, UpdateContentItemInput, UpdateContentStyleInput, UpdateDistributionTaskInput } from '../shared/types';

declare global {
  interface Window {
    weiboPublisher: {
      accounts: {
        list: () => Promise<Account[]>;
        create: (input: CreateAccountInput) => Promise<Account>;
        update: (id: number, input: UpdateAccountInput) => Promise<Account>;
        delete: (id: number) => Promise<DeleteAccountResult>;
        testConnection: (accountId: number) => Promise<ConnectionTestResult>;
        syncAdsPower: () => Promise<{ ok: boolean; message: string; totalSynced: number; newlyAdded: number }>;
        openBrowser: (accountId: number) => Promise<ConnectionTestResult>;
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
        versions: (id: number) => Promise<unknown[]>;
      };
      distributionTasks: {
        list: () => Promise<DistributionTask[]>;
        create: (input: CreateDistributionTaskInput) => Promise<DistributionTask>;
        update: (id: number, input: UpdateDistributionTaskInput) => Promise<DistributionTask>;
        retry: (id: number) => Promise<DistributionTask>;
        cancel: (id: number) => Promise<DistributionTask>;
        publishNow?: (id: number) => Promise<PublishAttemptResult>;
        retryMany: (ids: number[]) => Promise<DistributionTask[]>;
        cancelMany: (ids: number[]) => Promise<DistributionTask[]>;
        returnToReview?: (id: number, comment?: string) => Promise<DistributionTask>;
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
      app: {
        relaunch: () => Promise<void>;
      };
      ai: {
        generate: (options: AiGenerateOptions) => Promise<AiResponse>;
        generateImage: (options: AiImageOptions) => Promise<{ url: string }>;
        listPlugins: () => Promise<AiPlugin[]>;
        listStyles: (accountId: number, pluginCode?: string) => Promise<ContentStyle[]>;
        createStyle: (input: CreateContentStyleInput) => Promise<ContentStyle>;
        updateStyle: (id: string, input: UpdateContentStyleInput) => Promise<ContentStyle>;
        copyStyleToAccounts: (id: string, input: CopyContentStyleInput) => Promise<ContentStyle[]>;
        listWorkflows: (pluginCode: string) => Promise<AiWorkflow[]>;
        startWorkflowRun: (input: {
          accountId: number | null;
          pluginCode: string;
          workflowCode: string;
          inputParams?: Record<string, unknown>;
        }) => Promise<import('../shared/types').AiWorkflowRun>;
        getWorkflowRun: (runId: string) => Promise<import('../shared/types').AiWorkflowRun | null>;
        listHotTopics: (force?: boolean) => Promise<{ items: any[]; lastFetchTime: string | null }>;
        previewWorkflow: (pluginCode: string, workflowCode: string, inputParams: any) => Promise<{ runId: string }>;
        startAgentSchedule: (accountId: number) => Promise<{ ok: boolean; message: string }>;
        onWorkflowLog: (callback: (log: any) => void) => (() => void);
      };
      review: {
        listItems: () => Promise<ReviewItem[]>;
        create: (input: CreateReviewItemInput) => Promise<ReviewItem>;
        approve: (id: number, reviewerId: string, comment?: string) => Promise<ReviewItem>;
        reject?: (id: number, reviewerId: string, comment?: string) => Promise<ReviewItem>;
        rewrite?: (id: number, reviewerId: string, comment?: string, rewrittenBody?: string) => Promise<ReviewItem>;
      };
    };
  }
}
