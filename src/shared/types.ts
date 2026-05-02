export type AccountStatus = 'active' | 'paused' | 'needs_manual_action' | 'login_expired' | 'risk_blocked';
export type BrowserMode = 'manual_ws' | 'manual_port' | 'adspower' | 'bitbrowser' | 'gologin';
export type PostStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'failed' | 'needs_manual_action';
export type LogLevel = 'info' | 'warning' | 'error';

export interface Account {
  id: number;
  name: string;
  platform: 'weibo';
  browserMode: BrowserMode;
  providerProfileId: string;
  wsEndpoint: string;
  debuggingPort: number | null;
  status: AccountStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  platform: 'weibo';
  browserMode: BrowserMode;
  providerProfileId: string;
  wsEndpoint: string;
  debuggingPort: number | null;
  status: AccountStatus;
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
