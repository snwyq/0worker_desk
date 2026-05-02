export type PlatformCode = 'wechat_official' | 'wechat_channels' | 'xiaohongshu' | 'douyin' | 'weibo';
export type AccountStatus = 'active' | 'paused' | 'needs_manual_action' | 'login_expired' | 'risk_blocked';
export type BrowserMode = 'manual_ws' | 'manual_port' | 'adspower' | 'bitbrowser' | 'gologin';
export type PostStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'failed' | 'needs_manual_action';
export type LogLevel = 'info' | 'warning' | 'error';
export type ContentSource = 'manual' | 'ai' | 'imported';
export type ContentStatus = 'draft' | 'ready' | 'archived';

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
  createdAt: string;
  updatedAt: string;
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
}

export interface UpdateContentItemInput {
  title: string;
  body: string;
  status: ContentStatus;
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
