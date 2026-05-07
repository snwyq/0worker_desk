export const schemaSql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  appliedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  configJson TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'weibo',
  browserMode TEXT NOT NULL,
  providerProfileId TEXT NOT NULL DEFAULT '',
  wsEndpoint TEXT NOT NULL DEFAULT '',
  debuggingPort INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  healthMessage TEXT NOT NULL DEFAULT '',
  lastCheckedAt TEXT NOT NULL DEFAULT '',
  manualActionReason TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  activePluginCode TEXT NOT NULL DEFAULT '',
  aiConfigJson TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  accountId INTEGER NOT NULL,
  content TEXT NOT NULL,
  mediaPaths TEXT NOT NULL DEFAULT '[]',
  scheduledAt TEXT NOT NULL,
  status TEXT NOT NULL,
  lastError TEXT NOT NULL DEFAULT '',
  screenshotPath TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS publish_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshotPath TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (postId) REFERENCES posts(id),
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  tenantId TEXT NOT NULL DEFAULT '',
  accountId INTEGER,
  pluginCode TEXT NOT NULL DEFAULT '',
  styleId TEXT NOT NULL DEFAULT '',
  runId TEXT NOT NULL DEFAULT '',
  topicsJson TEXT NOT NULL DEFAULT '[]',
  mediaJson TEXT NOT NULL DEFAULT '[]',
  sourceJson TEXT NOT NULL DEFAULT '{}',
  riskJson TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contentId INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (contentId) REFERENCES content_items(id)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contentId INTEGER,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  mimeType TEXT NOT NULL DEFAULT '',
  sizeBytes INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (contentId) REFERENCES content_items(id)
);

CREATE TABLE IF NOT EXISTS distribution_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contentId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  platform TEXT NOT NULL,
  legacyPostId INTEGER,
  scheduledAt TEXT NOT NULL,
  status TEXT NOT NULL,
  platformPayload TEXT NOT NULL DEFAULT '{}',
  lastError TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (contentId) REFERENCES content_items(id),
  FOREIGN KEY (accountId) REFERENCES accounts(id),
  FOREIGN KEY (legacyPostId) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS publish_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  startedAt TEXT NOT NULL,
  finishedAt TEXT NOT NULL,
  screenshotPath TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  FOREIGN KEY (taskId) REFERENCES distribution_tasks(id),
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_platform_status ON accounts(platform, status);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts(status, scheduledAt);
CREATE INDEX IF NOT EXISTS idx_distribution_tasks_status_scheduled ON distribution_tasks(status, scheduledAt);
CREATE INDEX IF NOT EXISTS idx_distribution_tasks_account_status ON distribution_tasks(accountId, status);
CREATE INDEX IF NOT EXISTS idx_distribution_tasks_legacy_post ON distribution_tasks(legacyPostId);
CREATE INDEX IF NOT EXISTS idx_publish_runs_task_created ON publish_runs(taskId, createdAt);
CREATE INDEX IF NOT EXISTS idx_publish_runs_platform_status ON publish_runs(platform, status);

CREATE TABLE IF NOT EXISTS content_styles (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL DEFAULT '',
  accountId INTEGER,
  pluginCode TEXT NOT NULL,
  workflowCode TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  promptTemplateId TEXT NOT NULL DEFAULT '',
  modelPolicyJson TEXT NOT NULL DEFAULT '{}',
  reviewPolicyJson TEXT NOT NULL DEFAULT '{}',
  dispatchPolicyJson TEXT NOT NULL DEFAULT '{}',
  dedupePolicyJson TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_content_styles_account_plugin ON content_styles(accountId, pluginCode);
CREATE INDEX IF NOT EXISTS idx_content_styles_plugin_status ON content_styles(pluginCode, status);

CREATE TABLE IF NOT EXISTS review_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contentId INTEGER NOT NULL,
  reviewMode TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewerId TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  rewriteError TEXT NOT NULL DEFAULT '',
  rewrittenBody TEXT NOT NULL DEFAULT '',
  approvedAt TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (contentId) REFERENCES content_items(id)
);

CREATE INDEX IF NOT EXISTS idx_review_items_status ON review_items(status);
CREATE INDEX IF NOT EXISTS idx_review_items_content ON review_items(contentId);

CREATE TABLE IF NOT EXISTS ai_plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  configJson TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pluginCode TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  definitionJson TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(pluginCode, code)
);

CREATE TABLE IF NOT EXISTS publishing_strategies (
  id TEXT PRIMARY KEY,
  workflowCode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  maxDailyPosts INTEGER NOT NULL DEFAULT 3,
  minIntervalMins INTEGER NOT NULL DEFAULT 120,
  activeTimeRangesJson TEXT NOT NULL DEFAULT '[]',
  jitterMins INTEGER NOT NULL DEFAULT 15,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publishing_strategies_workflow ON publishing_strategies(workflowCode);

CREATE TABLE IF NOT EXISTS ai_workflow_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  runId TEXT NOT NULL UNIQUE,
  pluginCode TEXT NOT NULL DEFAULT '',
  workflowCode TEXT NOT NULL,
  accountId INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  contextSnapshot TEXT NOT NULL DEFAULT '{}',
  logs TEXT NOT NULL DEFAULT '[]',
  startedAt TEXT NOT NULL,
  finishedAt TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (accountId) REFERENCES accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_status ON ai_workflow_runs(status);

CREATE TABLE IF NOT EXISTS hot_topics_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  title TEXT,
  url TEXT,
  mobilUrl TEXT,
  thumbnail TEXT,
  extra TEXT,
  desc TEXT,
  author TEXT,
  hotValue TEXT,
  hot_value TEXT,
  rank INTEGER,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hot_topics_created_at ON hot_topics_history(createdAt);
CREATE INDEX IF NOT EXISTS idx_hot_topics_platform ON hot_topics_history(platform);

CREATE TABLE IF NOT EXISTS hot_topic_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotTopicId INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  extractedNamesJson TEXT NOT NULL DEFAULT '[]',
  retryCount INTEGER NOT NULL DEFAULT 0,
  nextRetryAt TEXT NOT NULL DEFAULT '',
  lastError TEXT NOT NULL DEFAULT '',
  processedAt TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (hotTopicId) REFERENCES hot_topics_history(id)
);

CREATE INDEX IF NOT EXISTS idx_hot_topic_analysis_status ON hot_topic_analysis(status);

CREATE TABLE IF NOT EXISTS public_figure_evidence_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  imageUrl TEXT NOT NULL DEFAULT '',
  birthDate TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  updateTime TEXT NOT NULL,
  createTime TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_figure_evidence_update_time ON public_figure_evidence_cache(updateTime);

CREATE TABLE IF NOT EXISTS hot_people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  birthday TEXT NOT NULL DEFAULT '',
  verifyBirthday TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  constellation TEXT NOT NULL DEFAULT '',
  sizhu TEXT NOT NULL DEFAULT '',
  dayunInfo TEXT NOT NULL DEFAULT '',
  photoUrl TEXT NOT NULL DEFAULT '',
  promptText TEXT NOT NULL DEFAULT '',
  sourceTopicTitle TEXT NOT NULL DEFAULT '',
  sourcePlatform TEXT NOT NULL DEFAULT '',
  analysisStatus TEXT NOT NULL DEFAULT 'pending',
  updateTime TEXT NOT NULL,
  createTime TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hot_people_name_birthday ON hot_people(name, birthday);
CREATE INDEX IF NOT EXISTS idx_hot_people_update_time ON hot_people(updateTime);

CREATE TABLE IF NOT EXISTS hot_bazi_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contentId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  platform TEXT NOT NULL,
  hotPersonId INTEGER,
  sourceTopic TEXT NOT NULL DEFAULT '',
  scheduledAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  automationEnabled INTEGER NOT NULL DEFAULT 0,
  intervalMinutes INTEGER NOT NULL DEFAULT 60,
  scheduleRuleJson TEXT NOT NULL DEFAULT '{}',
  mediaPathsJson TEXT NOT NULL DEFAULT '[]',
  platformPayload TEXT NOT NULL DEFAULT '{}',
  lastError TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (contentId) REFERENCES content_items(id),
  FOREIGN KEY (accountId) REFERENCES accounts(id),
  FOREIGN KEY (hotPersonId) REFERENCES hot_people(id)
);

CREATE INDEX IF NOT EXISTS idx_hot_bazi_tasks_scheduled ON hot_bazi_tasks(scheduledAt, status);
CREATE INDEX IF NOT EXISTS idx_hot_bazi_tasks_account_status ON hot_bazi_tasks(accountId, status);

CREATE TABLE IF NOT EXISTS source_columns (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pluginCode TEXT NOT NULL DEFAULT '',
  workflowCode TEXT NOT NULL DEFAULT '',
  styleId TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  enqueueSource TEXT NOT NULL DEFAULT '',
  sortIndex INTEGER NOT NULL DEFAULT 0,
  builtin INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_columns_sort ON source_columns(sortIndex);
`;
