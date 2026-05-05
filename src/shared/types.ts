export type PlatformCode = 'wechat_official' | 'wechat_channels' | 'xiaohongshu' | 'douyin' | 'weibo';
export type AccountStatus = 'active' | 'paused' | 'needs_manual_action' | 'login_expired' | 'risk_blocked';
export type BrowserMode = 'manual_ws' | 'manual_port' | 'adspower' | 'bitbrowser' | 'gologin';
export type PostStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'failed' | 'needs_manual_action';
export type LogLevel = 'info' | 'warning' | 'error';
export type ContentSource = 'manual' | 'ai' | 'imported';
export type ContentStatus = 'draft' | 'ready' | 'reviewing' | 'approved' | 'rejected' | 'scheduled' | 'published' | 'failed' | 'archived';
export type ContentStyleStatus = 'active' | 'paused';
export type ReviewMode = 'manual' | 'auto' | 'sample';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'rewriting';

export interface Account {
  id: number;
  name: string;
  platform: PlatformCode;
  browserMode: BrowserMode;
  providerProfileId: string;
  wsEndpoint: string;
  debuggingPort: number | null;
  status: AccountStatus;
  healthMessage: string;
  lastCheckedAt: string;
  manualActionReason: string;
  notes: string;
  activePluginCode: string;
  aiConfigJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AiPlugin {
  id: number;
  code: string;
  name: string;
  description: string;
  configJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AiWorkflow {
  id: number;
  pluginCode: string;
  code: string;
  name: string;
  definitionJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type AiWorkflowRunStatus = 'running' | 'paused' | 'failed' | 'completed';

export interface AiWorkflowRun {
  id: number;
  runId: string;
  pluginCode: string;
  workflowCode: string;
  accountId: number | null;
  status: AiWorkflowRunStatus;
  contextSnapshot: Record<string, unknown>;
  logs: any[];
  startedAt: string;
  finishedAt: string;
}

export interface CreateAccountInput {
  name: string;
  platform: PlatformCode;
  browserMode: BrowserMode;
  providerProfileId: string;
  wsEndpoint: string;
  debuggingPort: number | null;
  status: AccountStatus;
  healthMessage?: string;
  lastCheckedAt?: string;
  manualActionReason?: string;
  notes: string;
  activePluginCode?: string;
  aiConfigJson?: Record<string, unknown>;
}

export interface UpdateAccountInput {
  name: string;
  browserMode: BrowserMode;
  providerProfileId: string;
  wsEndpoint: string;
  debuggingPort: number | null;
  status: AccountStatus;
  healthMessage?: string;
  lastCheckedAt?: string;
  manualActionReason?: string;
  notes: string;
  activePluginCode?: string;
  aiConfigJson?: Record<string, unknown>;
}

export interface Post {
  id: number;
  accountId: number;
  content: string;
  mediaPaths: string[];
  scheduledAt: string;
  status: PostStatus;
  lastError: string;
  screenshotPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  accountId: number;
  content: string;
  mediaPaths: string[];
  scheduledAt: string;
  status: PostStatus;
}

export interface PublishLog {
  id: number;
  postId: number;
  accountId: number;
  level: LogLevel;
  message: string;
  screenshotPath: string;
  createdAt: string;
}

export interface Platform {
  id: number;
  code: PlatformCode;
  name: string;
  enabled: boolean;
  sortOrder: number;
  configJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCapabilities {
  platform: PlatformCode;
  displayName: string;
  text: boolean;
  images: boolean;
  video: boolean;
  richText: boolean;
  scheduledPublish: boolean;
  manualHandoff: boolean;
  implemented: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface ContentItem {
  id: number;
  title: string;
  body: string;
  source: ContentSource;
  status: ContentStatus;
  tenantId: string;
  accountId: number | null;
  pluginCode: string;
  styleId: string;
  runId: string;
  topicsJson: string[];
  mediaJson: Record<string, unknown>[];
  sourceJson: Record<string, unknown>;
  riskJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersion {
  id: number;
  contentId: number;
  title: string;
  body: string;
  source: ContentSource;
  createdAt: string;
}

export interface CreateContentItemInput {
  title: string;
  body: string;
  source: ContentSource;
  status: ContentStatus;
  tenantId?: string;
  accountId?: number | null;
  pluginCode?: string;
  styleId?: string;
  runId?: string;
  topicsJson?: string[];
  mediaJson?: Record<string, unknown>[];
  sourceJson?: Record<string, unknown>;
  riskJson?: Record<string, unknown>;
}

export interface UpdateContentItemInput {
  title: string;
  body: string;
  status: ContentStatus;
}

export interface ContentStyle {
  id: string;
  tenantId: string;
  accountId: number | null;
  pluginCode: string;
  workflowCode: string;
  name: string;
  description: string;
  promptTemplateId: string;
  modelPolicyJson: Record<string, unknown>;
  reviewPolicyJson: Record<string, unknown>;
  dispatchPolicyJson: Record<string, unknown>;
  dedupePolicyJson: Record<string, unknown>;
  status: ContentStyleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentStyleInput {
  id?: string;
  tenantId?: string;
  accountId?: number | null;
  pluginCode: string;
  workflowCode: string;
  name: string;
  description?: string;
  promptTemplateId?: string;
  modelPolicyJson?: Record<string, unknown>;
  reviewPolicyJson?: Record<string, unknown>;
  dispatchPolicyJson?: Record<string, unknown>;
  dedupePolicyJson?: Record<string, unknown>;
  status?: ContentStyleStatus;
}

export interface UpdateContentStyleInput {
  workflowCode?: string;
  name?: string;
  description?: string;
  promptTemplateId?: string;
  modelPolicyJson?: Record<string, unknown>;
  reviewPolicyJson?: Record<string, unknown>;
  dispatchPolicyJson?: Record<string, unknown>;
  dedupePolicyJson?: Record<string, unknown>;
  status?: ContentStyleStatus;
}

export interface CopyContentStyleInput {
  targetAccountIds: number[];
  nameSuffix?: string;
}

export interface ReviewItem {
  id: number;
  contentId: number;
  reviewMode: ReviewMode;
  status: ReviewStatus;
  reviewerId: string;
  comment: string;
  rewriteError: string;
  rewrittenBody: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewItemInput {
  contentId: number;
  reviewMode: ReviewMode;
  status: ReviewStatus;
  comment?: string;
}

export interface DistributionTask {
  id: number;
  contentId: number;
  accountId: number;
  platform: PlatformCode;
  legacyPostId: number | null;
  scheduledAt: string;
  status: PostStatus;
  platformPayload: Record<string, unknown>;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributionTaskInput {
  contentId: number;
  accountId: number;
  platform: PlatformCode;
  legacyPostId?: number | null;
  scheduledAt: string;
  status: PostStatus;
  platformPayload: Record<string, unknown>;
}

export interface UpdateDistributionTaskInput {
  contentId?: number;
  accountId?: number;
  scheduledAt: string;
  status: PostStatus;
  platformPayload: Record<string, unknown>;
}

export interface PublishRun {
  id: number;
  taskId: number;
  accountId: number;
  platform: PlatformCode;
  status: PostStatus;
  message: string;
  startedAt: string;
  finishedAt: string;
  screenshotPath: string;
  createdAt: string;
}

export interface CreatePublishRunInput {
  taskId: number;
  accountId: number;
  platform: PlatformCode;
  status: PostStatus;
  message: string;
  startedAt: string;
  finishedAt: string;
  screenshotPath: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  currentUrl?: string;
}

export interface PublishAttemptResult {
  ok: boolean;
  message: string;
  status?: PostStatus;
}

export interface PublishNowResult {
  ok: boolean;
  message: string;
  status?: PostStatus;
}

export interface DeletePostResult {
  ok: boolean;
  message: string;
}

export interface DeleteAccountResult {
  ok: boolean;
  message: string;
}

export interface SchedulerStatus {
  running: boolean;
  intervalMs: number;
  lastRunAt: string;
  lastMessage: string;
}

export interface UpdateCheckResult {
  ok: boolean;
  message: string;
  currentVersion: string;
  updateAvailable?: boolean;
}

export interface UpdateConfig {
  enabled: boolean;
  provider: 'github';
  owner: string;
  repo: string;
  channel: string;
  canCheck: boolean;
  reason?: string;
}

export interface AiGenerateOptions {
  prompt: string;
  provider?: 'dashscope' | 'apiyi';
  model?: string;
  maxTokens?: number;
}

export interface AiImageOptions {
  prompt: string;
  size?: string;
}

export interface AiResponse {
  content: string;
  usage?: any;
}

export type HotPersonGender = '男' | '女' | '';
export type HotPersonAnalysisStatus = 'pending' | 'completed' | 'failed';
export type HotPeopleProvider = 'mock' | 'dashscope' | 'apiyi';
export type HotPeopleRetriever = 'mock' | 'model' | 'wikipedia';

export interface HotPerson {
  id: number;
  name: string;
  gender: HotPersonGender;
  birthday: string;
  verifyBirthday: string;
  bio: string;
  constellation: string;
  sizhu: string;
  dayunInfo: string;
  photoUrl: string;
  promptText: string;
  sourceTopicTitle: string;
  sourcePlatform: string;
  analysisStatus: HotPersonAnalysisStatus;
  updateTime: string;
  createTime: string;
}

export interface UpsertHotPersonInput {
  name: string;
  gender?: HotPersonGender;
  birthday?: string;
  verifyBirthday?: string;
  bio?: string;
  constellation?: string;
  sizhu?: string;
  dayunInfo?: string;
  photoUrl?: string;
  promptText?: string;
  sourceTopicTitle?: string;
  sourcePlatform?: string;
  analysisStatus?: HotPersonAnalysisStatus;
}

export interface AnalyzeHotPeopleInput {
  limit?: number;
  retriever?: HotPeopleRetriever;
  provider?: HotPeopleProvider;
}

export interface AnalyzeHotPeopleResult {
  selectedTopics: number;
  processedTopics: number;
  skippedTopics: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  failedReasons: string[];
  pendingTopics: number;
  coolingFailedTopics: number;
  nextRetryAt?: string;
  items: HotPerson[];
}

export type HotBaziScheduleStatus = 'draft' | 'queued' | 'reviewing' | 'published' | 'failed' | 'paused';

export interface HotBaziTask {
  id: number;
  contentId: number;
  accountId: number;
  platform: PlatformCode;
  hotPersonId: number | null;
  sourceTopic: string;
  scheduledAt: string;
  status: HotBaziScheduleStatus;
  automationEnabled: boolean;
  intervalMinutes: number;
  scheduleRuleJson: Record<string, unknown>;
  mediaPathsJson: string[];
  platformPayload: Record<string, unknown>;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotBaziTaskInput {
  contentId: number;
  accountId: number;
  platform: PlatformCode;
  hotPersonId?: number | null;
  sourceTopic?: string;
  scheduledAt: string;
  status: HotBaziScheduleStatus;
  automationEnabled?: boolean;
  intervalMinutes?: number;
  scheduleRuleJson?: Record<string, unknown>;
  mediaPathsJson?: string[];
  platformPayload?: Record<string, unknown>;
}

export interface UpdateHotBaziTaskInput {
  scheduledAt?: string;
  status?: HotBaziScheduleStatus;
  automationEnabled?: boolean;
  intervalMinutes?: number;
  scheduleRuleJson?: Record<string, unknown>;
  mediaPathsJson?: string[];
  platformPayload?: Record<string, unknown>;
}

export interface GenerateHotBaziBatchInput {
  accountId: number;
  scheduleRule: string;
  automationEnabled: boolean;
  intervalMinutes: number;
  requireReview: boolean;
  mediaPaths: string[];
  promptTemplate?: string;
  model?: 'qwen3.5-plus' | 'deepseek-v3.2' | 'kimi-k2.5';
  limit?: number;
}

export interface GenerateHotBaziBatchResult {
  createdContents: number;
  createdReviews: number;
  createdTasks: number;
  skippedPeople: number;
  failedPeople: number;
  taskIds: number[];
  contentIds: number[];
  errors: string[];
}
