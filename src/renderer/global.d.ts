import type { Account, AiGenerateOptions, AiPlugin, AiResponse, AiWorkflow, AnalyzeHotPeopleInput, AnalyzeHotPeopleResult, AppSetting, ConnectionTestResult, ContentItem, ContentStyle, CopyContentStyleInput, CreateAccountInput, CreateContentItemInput, CreateContentStyleInput, CreateDistributionTaskInput, CreateHotBaziTaskInput, CreatePostInput, CreateReviewItemInput, DeleteAccountResult, DeletePostResult, DispatchSimulationEntry, DistributionTask, GenerateHotBaziBatchInput, GenerateHotBaziBatchResult, HotBaziTask, HotPerson, Platform, PlatformCapabilities, Post, PublishAttemptResult, PublishNowResult, PublishRun, ReviewItem, SchedulerStatus, SourceColumn, TopicPersonPair, UpdateAccountInput, UpdateCheckResult, UpdateConfig, UpdateContentItemInput, UpdateContentStyleInput, UpdateDistributionTaskInput, UpdateHotBaziTaskInput, PublishingStrategy, CreatePublishingStrategyInput, UpdatePublishingStrategyInput } from '../shared/types';

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
        selectDirectory: () => Promise<string>;
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
        delete?: (id: number) => Promise<{ ok: boolean }>;
        publishNow?: (id: number) => Promise<PublishAttemptResult>;
        retryMany: (ids: number[]) => Promise<DistributionTask[]>;
        cancelMany: (ids: number[]) => Promise<DistributionTask[]>;
        deleteMany?: (ids: number[]) => Promise<{ deleted: number }>;
        returnToReview?: (id: number, comment?: string) => Promise<DistributionTask>;
        assignSchedule?: (id: number) => Promise<DistributionTask>;
        assignScheduleMany?: (ids: number[]) => Promise<DistributionTask[]>;
      };
      sourceColumns?: {
        list: () => Promise<SourceColumn[]>;
      };
      publishingStrategies: {
        list: () => Promise<PublishingStrategy[]>;
        findByWorkflow: (workflowCode: string) => Promise<PublishingStrategy | null>;
        upsert: (input: CreatePublishingStrategyInput) => Promise<PublishingStrategy>;
        delete: (workflowCode: string) => Promise<{ ok: boolean }>;
      };
      hotBaziTasks?: {
        list: () => Promise<HotBaziTask[]>;
        create: (input: CreateHotBaziTaskInput) => Promise<HotBaziTask>;
        update: (id: number, input: UpdateHotBaziTaskInput) => Promise<HotBaziTask>;
        delete: (id: number) => Promise<{ ok: boolean }>;
        deleteMany: (ids: number[]) => Promise<{ deleted: number }>;
        enqueue: (id: number) => Promise<DistributionTask>;
        enqueueMany: (ids: number[]) => Promise<DistributionTask[]>;
      };
      facePalmTasks?: {
        list: () => Promise<FacePalmTask[]>;
        deleteMany: (ids: number[]) => Promise<{ deleted: number }>;
        enqueue: (id: number) => Promise<DistributionTask>;
        enqueueMany: (ids: number[]) => Promise<DistributionTask[]>;
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
        listPlugins: () => Promise<AiPlugin[]>;
        listStyles: (accountId: number, pluginCode?: string) => Promise<ContentStyle[]>;
        createStyle: (input: CreateContentStyleInput) => Promise<ContentStyle>;
        updateStyle: (id: string, input: UpdateContentStyleInput) => Promise<ContentStyle>;
        copyStyleToAccounts: (id: string, input: CopyContentStyleInput) => Promise<ContentStyle[]>;
        deleteStyle: (id: string) => Promise<{ ok: boolean }>;
        listWorkflows: (pluginCode: string) => Promise<AiWorkflow[]>;
        startWorkflowRun: (input: {
          accountId: number | null;
          pluginCode: string;
          workflowCode: string;
          inputParams?: Record<string, unknown>;
        }) => Promise<import('../shared/types').AiWorkflowRun>;
        getWorkflowRun: (runId: string) => Promise<import('../shared/types').AiWorkflowRun | null>;
        listHotTopics: (force?: boolean) => Promise<{ items: any[]; lastFetchTime: string | null; sourceStatus?: Array<{ platform: string; ok: boolean; reason?: string; count?: number }>; insertedCount?: number }>;
        deleteAllHotTopics: () => Promise<{ deleted: number }>;
        listHotPeople: () => Promise<HotPerson[]>;
        getHotPeopleQueueSummary: () => Promise<{ pendingTopics: number; coolingFailedTopics: number; nextRetryAt?: string }>;
        getHotPeopleAnalyzeProgress: () => Promise<{ running: boolean; selectedTopics: number; processedTopics: number; pendingTopics: number }>;
        deleteAllHotPeople: () => Promise<{ deleted: number }>;
        resetHotPeopleAnalysis: () => Promise<{ deleted: number; reset: number }>;
        analyzeHotPeople: (input?: AnalyzeHotPeopleInput) => Promise<AnalyzeHotPeopleResult>;
        generateHotBaziBatch?: (input: GenerateHotBaziBatchInput) => Promise<GenerateHotBaziBatchResult>;
        generateFacePalmBatch?: (input: GenerateFacePalmBatchInput) => Promise<GenerateFacePalmBatchResult>;
        regenerateHotBaziMedia?: (taskIds: number[], mediaDir?: string) => Promise<{ successCount: number; totalRequested: number }>;
        getHotBaziDefaultPrompt?: () => Promise<{ prompt: string }>;
        getFacePalmDefaultPrompt?: (category: string) => Promise<{ prompt: string }>;
        listTodayTopicPeople?: () => Promise<TopicPersonPair[]>;
        onHotBaziProgress?: (callback: (event: any, data: any) => void) => (() => void);
        generateHotBaziVideo?: (taskId: number) => Promise<{ ok: boolean; videoPath?: string; durationSec?: number; error?: string }>;
        generateHotBaziVideoBatch?: (taskIds: number[]) => Promise<{ successCount: number; totalRequested: number; errors: string[] }>;
        onHotBaziVideoProgress?: (callback: (event: any, data: any) => void) => (() => void);
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
