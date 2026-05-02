export const schemaSql = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'weibo',
  browserMode TEXT NOT NULL,
  providerProfileId TEXT NOT NULL DEFAULT '',
  wsEndpoint TEXT NOT NULL DEFAULT '',
  debuggingPort INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
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
`;
