# Weibo Publisher MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Electron MVP that manages Weibo accounts, queued posts, manual browser connections, and publish attempts through Playwright.

**Architecture:** The app uses Electron for the desktop shell, React for the renderer UI, SQLite for local persistence, and Playwright for browser automation. Vendor-specific fingerprint browser integration is isolated behind connector classes, with the MVP supporting manual websocket and debugging-port connections.

**Tech Stack:** TypeScript, Electron, React, Vite, Playwright, SQLite, Vitest.

---

## File Structure

- `package.json`: scripts, runtime dependencies, development dependencies.
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`: TypeScript, Vite, and test configuration.
- `electron/main.ts`: creates the Electron window, owns IPC handlers, starts the worker loop.
- `electron/preload.ts`: exposes a typed bridge API to the renderer.
- `src/shared/types.ts`: shared account, post, log, and settings types.
- `src/main/db/schema.ts`: SQLite schema statements.
- `src/main/db/database.ts`: database connection, migrations, and repository methods.
- `src/main/browser/BrowserConnector.ts`: connector interface and session types.
- `src/main/browser/ManualWsConnector.ts`: connects to a browser by websocket endpoint.
- `src/main/browser/ManualPortConnector.ts`: resolves a websocket endpoint from a local debugging port.
- `src/main/browser/BrowserConnectorFactory.ts`: selects the correct connector per account.
- `src/main/publisher/WeiboPublisher.ts`: encapsulates Weibo web selectors and publish flow.
- `src/main/publisher/PublishWorker.ts`: polls due posts, locks work, records outcomes.
- `src/main/ipc/handlers.ts`: IPC handler registration for accounts, posts, logs, and worker actions.
- `src/renderer/App.tsx`: main app shell and view routing.
- `src/renderer/components/*.tsx`: reusable UI elements.
- `src/renderer/pages/AccountsPage.tsx`: account table and edit form.
- `src/renderer/pages/QueuePage.tsx`: post queue table and create form.
- `src/renderer/pages/RunsPage.tsx`: publish attempt logs.
- `src/renderer/pages/SettingsPage.tsx`: local settings.
- `src/renderer/styles.css`: application styling.
- `tests/main/*.test.ts`: unit tests for database, connectors, and worker decisions.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Create package manifest**

Create `package.json` with:

```json
{
  "name": "weibo-publisher-mvp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && electron .\"",
    "build": "tsc -p tsconfig.node.json && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json"
  },
  "dependencies": {
    "@playwright/test": "^1.44.0",
    "better-sqlite3": "^9.6.0",
    "electron": "^30.0.0",
    "lucide-react": "^0.468.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^20.12.12",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "concurrently": "^8.2.2",
    "typescript": "^5.4.5",
    "vite": "^5.2.0",
    "vitest": "^1.6.0",
    "wait-on": "^7.2.0"
  }
}
```

- [ ] **Step 2: Add TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/renderer", "src/shared"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["electron", "src/main", "src/shared", "tests/main"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add minimal Electron and renderer files**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weibo Publisher MVP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

Create `electron/main.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

Create `electron/preload.ts`:

```ts
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('weiboPublisher', {
  version: '0.1.0',
});
```

Create `src/renderer/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/renderer/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Local operations console</p>
          <h1>Weibo Publisher MVP</h1>
        </div>
      </section>
      <section className="empty-state">
        <h2>Project scaffold ready</h2>
        <p>Accounts, queue, runs, and settings will be added in the next tasks.</p>
      </section>
    </main>
  );
}
```

Create `src/renderer/styles.css`:

```css
:root {
  color: #17211b;
  background: #f4f1e8;
  font-family: "Aptos", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 980px;
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(32, 82, 69, 0.09), transparent 38%),
    #f4f1e8;
}

.app-shell {
  min-height: 100vh;
  padding: 28px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(23, 33, 27, 0.14);
  padding-bottom: 22px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #496257;
  font-size: 13px;
}

h1,
h2,
p {
  margin-top: 0;
}

.empty-state {
  max-width: 640px;
  margin-top: 48px;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install successfully and `package-lock.json` is created.

- [ ] **Step 5: Verify scaffold**

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run build`

Expected: PASS and creates `dist` plus `dist-electron`.

## Task 2: Shared Types and Database Layer

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/main/db/schema.ts`
- Create: `src/main/db/database.ts`
- Create: `tests/main/database.test.ts`

- [ ] **Step 1: Write failing database test**

Create `tests/main/database.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';

describe('database repositories', () => {
  test('creates an account and a queued post', () => {
    const db = createDatabase(':memory:');

    const account = db.accounts.create({
      name: 'demo weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: 'test account',
    });

    const post = db.posts.create({
      accountId: account.id,
      content: 'hello from mvp',
      mediaPaths: [],
      scheduledAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
      status: 'queued',
    });

    expect(account.id).toBeGreaterThan(0);
    expect(post.accountId).toBe(account.id);
    expect(db.posts.listDue(new Date('2026-05-01T10:00:01.000Z').toISOString())).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/main/database.test.ts`

Expected: FAIL because `src/main/db/database.ts` does not exist.

- [ ] **Step 3: Add shared types**

Create `src/shared/types.ts`:

```ts
export type AccountStatus = 'active' | 'paused' | 'needs_manual_action' | 'login_expired' | 'risk_blocked';
export type BrowserMode = 'manual_ws' | 'manual_port' | 'adspower' | 'bitbrowser' | 'gologin';
export type PostStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'failed' | 'needs_manual_action';
export type LogLevel = 'info' | 'warning' | 'error';

export interface Account {
  id: number;
  name: string;
  platform: 'weibo';
  browserMode: BrowserMode;
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
```

- [ ] **Step 4: Add schema and repositories**

Create `src/main/db/schema.ts`:

```ts
export const schemaSql = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'weibo',
  browserMode TEXT NOT NULL,
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
```

Create `src/main/db/database.ts`:

```ts
import Database from 'better-sqlite3';
import { schemaSql } from './schema.js';
import type { Account, CreateAccountInput, CreatePostInput, Post } from '../../shared/types.js';

function now() {
  return new Date().toISOString();
}

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: Number(row.id),
    name: String(row.name),
    platform: 'weibo',
    browserMode: row.browserMode as Account['browserMode'],
    wsEndpoint: String(row.wsEndpoint),
    debuggingPort: row.debuggingPort === null ? null : Number(row.debuggingPort),
    status: row.status as Account['status'],
    notes: String(row.notes),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: Number(row.id),
    accountId: Number(row.accountId),
    content: String(row.content),
    mediaPaths: JSON.parse(String(row.mediaPaths)) as string[],
    scheduledAt: String(row.scheduledAt),
    status: row.status as Post['status'],
    lastError: String(row.lastError),
    screenshotPath: String(row.screenshotPath),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function createDatabase(filename: string) {
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(schemaSql);

  return {
    accounts: {
      create(input: CreateAccountInput): Account {
        const timestamp = now();
        const result = sqlite.prepare(`
          INSERT INTO accounts (name, platform, browserMode, wsEndpoint, debuggingPort, status, notes, createdAt, updatedAt)
          VALUES (@name, @platform, @browserMode, @wsEndpoint, @debuggingPort, @status, @notes, @createdAt, @updatedAt)
        `).run({ ...input, createdAt: timestamp, updatedAt: timestamp });
        return mapAccount(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
      },
      list(): Account[] {
        return sqlite.prepare('SELECT * FROM accounts ORDER BY id DESC').all().map((row) => mapAccount(row as Record<string, unknown>));
      },
    },
    posts: {
      create(input: CreatePostInput): Post {
        const timestamp = now();
        const result = sqlite.prepare(`
          INSERT INTO posts (accountId, content, mediaPaths, scheduledAt, status, createdAt, updatedAt)
          VALUES (@accountId, @content, @mediaPaths, @scheduledAt, @status, @createdAt, @updatedAt)
        `).run({ ...input, mediaPaths: JSON.stringify(input.mediaPaths), createdAt: timestamp, updatedAt: timestamp });
        return mapPost(sqlite.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
      },
      listDue(nowIso: string): Post[] {
        return sqlite.prepare(`
          SELECT * FROM posts
          WHERE status = 'queued' AND scheduledAt <= ?
          ORDER BY scheduledAt ASC, id ASC
        `).all(nowIso).map((row) => mapPost(row as Record<string, unknown>));
      },
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/main/database.test.ts`

Expected: PASS.

## Task 3: Browser Connectors

**Files:**
- Create: `src/main/browser/BrowserConnector.ts`
- Create: `src/main/browser/ManualWsConnector.ts`
- Create: `src/main/browser/ManualPortConnector.ts`
- Create: `src/main/browser/BrowserConnectorFactory.ts`
- Create: `tests/main/browser-connectors.test.ts`

- [ ] **Step 1: Write failing connector tests**

Create `tests/main/browser-connectors.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { createConnectorForAccount } from '../../src/main/browser/BrowserConnectorFactory.js';
import type { Account } from '../../src/shared/types.js';

function account(overrides: Partial<Account>): Account {
  return {
    id: 1,
    name: 'demo',
    platform: 'weibo',
    browserMode: 'manual_ws',
    wsEndpoint: '',
    debuggingPort: null,
    status: 'active',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('browser connector factory', () => {
  test('selects manual websocket connector', () => {
    const connector = createConnectorForAccount(account({ browserMode: 'manual_ws', wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/demo' }));
    expect(connector.kind).toBe('manual_ws');
  });

  test('selects manual port connector', () => {
    const connector = createConnectorForAccount(account({ browserMode: 'manual_port', debuggingPort: 9222 }));
    expect(connector.kind).toBe('manual_port');
  });

  test('rejects vendor modes until providers are implemented', () => {
    expect(() => createConnectorForAccount(account({ browserMode: 'adspower' }))).toThrow('not implemented');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/main/browser-connectors.test.ts`

Expected: FAIL because connector files do not exist.

- [ ] **Step 3: Implement connector interface and classes**

Create `src/main/browser/BrowserConnector.ts`:

```ts
import type { Browser } from 'playwright';
import type { Account } from '../../shared/types.js';

export interface BrowserSession {
  browser: Browser;
  account: Account;
}

export interface BrowserConnector {
  kind: Account['browserMode'];
  connect(account: Account): Promise<BrowserSession>;
}
```

Create `src/main/browser/ManualWsConnector.ts`:

```ts
import { chromium } from 'playwright';
import type { Account } from '../../shared/types.js';
import type { BrowserConnector, BrowserSession } from './BrowserConnector.js';

export class ManualWsConnector implements BrowserConnector {
  kind = 'manual_ws' as const;

  async connect(account: Account): Promise<BrowserSession> {
    if (!account.wsEndpoint.trim()) {
      throw new Error('Missing websocket endpoint');
    }
    const browser = await chromium.connectOverCDP(account.wsEndpoint);
    return { browser, account };
  }
}
```

Create `src/main/browser/ManualPortConnector.ts`:

```ts
import { chromium } from 'playwright';
import type { Account } from '../../shared/types.js';
import type { BrowserConnector, BrowserSession } from './BrowserConnector.js';

interface VersionResponse {
  webSocketDebuggerUrl?: string;
}

export class ManualPortConnector implements BrowserConnector {
  kind = 'manual_port' as const;

  async connect(account: Account): Promise<BrowserSession> {
    if (!account.debuggingPort) {
      throw new Error('Missing debugging port');
    }
    const response = await fetch(`http://127.0.0.1:${account.debuggingPort}/json/version`);
    if (!response.ok) {
      throw new Error(`Unable to read debugging endpoint from port ${account.debuggingPort}`);
    }
    const body = (await response.json()) as VersionResponse;
    if (!body.webSocketDebuggerUrl) {
      throw new Error('Debugging endpoint did not include webSocketDebuggerUrl');
    }
    const browser = await chromium.connectOverCDP(body.webSocketDebuggerUrl);
    return { browser, account };
  }
}
```

Create `src/main/browser/BrowserConnectorFactory.ts`:

```ts
import type { Account } from '../../shared/types.js';
import type { BrowserConnector } from './BrowserConnector.js';
import { ManualPortConnector } from './ManualPortConnector.js';
import { ManualWsConnector } from './ManualWsConnector.js';

export function createConnectorForAccount(account: Account): BrowserConnector {
  if (account.browserMode === 'manual_ws') {
    return new ManualWsConnector();
  }
  if (account.browserMode === 'manual_port') {
    return new ManualPortConnector();
  }
  throw new Error(`Browser provider ${account.browserMode} is not implemented`);
}
```

- [ ] **Step 4: Run connector tests**

Run: `npm test -- tests/main/browser-connectors.test.ts`

Expected: PASS.

## Task 4: Publisher and Worker Decisions

**Files:**
- Create: `src/main/publisher/WeiboPublisher.ts`
- Create: `src/main/publisher/PublishWorker.ts`
- Create: `tests/main/publish-worker.test.ts`

- [ ] **Step 1: Write failing worker decision test**

Create `tests/main/publish-worker.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { shouldPublishPost } from '../../src/main/publisher/PublishWorker.js';
import type { Account, Post } from '../../src/shared/types.js';

const account: Account = {
  id: 1,
  name: 'demo',
  platform: 'weibo',
  browserMode: 'manual_port',
  wsEndpoint: '',
  debuggingPort: 9222,
  status: 'active',
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const post: Post = {
  id: 1,
  accountId: 1,
  content: 'hello',
  mediaPaths: [],
  scheduledAt: '2026-05-01T10:00:00.000Z',
  status: 'queued',
  lastError: '',
  screenshotPath: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('publish worker decisions', () => {
  test('allows due queued posts for active accounts', () => {
    expect(shouldPublishPost(post, account, '2026-05-01T10:00:01.000Z')).toEqual({ ok: true });
  });

  test('blocks paused accounts', () => {
    expect(shouldPublishPost(post, { ...account, status: 'paused' }, '2026-05-01T10:00:01.000Z')).toEqual({
      ok: false,
      reason: 'Account is not active',
    });
  });

  test('blocks future posts', () => {
    expect(shouldPublishPost(post, account, '2026-05-01T09:59:59.000Z')).toEqual({
      ok: false,
      reason: 'Post is not due',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/main/publish-worker.test.ts`

Expected: FAIL because publisher files do not exist.

- [ ] **Step 3: Implement publisher skeleton and worker decision logic**

Create `src/main/publisher/WeiboPublisher.ts`:

```ts
import type { Browser } from 'playwright';
import type { Post } from '../../shared/types.js';

export interface PublishResult {
  status: 'published' | 'failed' | 'needs_manual_action';
  message: string;
  screenshotPath?: string;
}

export class WeiboPublisher {
  async publish(browser: Browser, post: Post): Promise<PublishResult> {
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto('https://weibo.com/', { waitUntil: 'domcontentloaded' });

    if (/login|passport/i.test(page.url())) {
      return { status: 'needs_manual_action', message: 'Weibo login page detected' };
    }

    if (!post.content.trim()) {
      return { status: 'failed', message: 'Post content is empty' };
    }

    return {
      status: 'failed',
      message: 'Weibo compose selectors are not configured yet; run dry automation only',
    };
  }
}
```

Create `src/main/publisher/PublishWorker.ts`:

```ts
import type { Account, Post } from '../../shared/types.js';

export interface Decision {
  ok: boolean;
  reason?: string;
}

export function shouldPublishPost(post: Post, account: Account, nowIso: string): Decision {
  if (post.status !== 'queued') {
    return { ok: false, reason: 'Post is not queued' };
  }
  if (account.status !== 'active') {
    return { ok: false, reason: 'Account is not active' };
  }
  if (post.scheduledAt > nowIso) {
    return { ok: false, reason: 'Post is not due' };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run worker tests**

Run: `npm test -- tests/main/publish-worker.test.ts`

Expected: PASS.

## Task 5: IPC and Renderer Dashboard

**Files:**
- Create: `src/main/ipc/handlers.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/pages/AccountsPage.tsx`
- Create: `src/renderer/pages/QueuePage.tsx`
- Create: `src/renderer/pages/RunsPage.tsx`
- Create: `src/renderer/pages/SettingsPage.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Add IPC handler shell**

Create `src/main/ipc/handlers.ts`:

```ts
import { ipcMain } from 'electron';
import type { CreateAccountInput, CreatePostInput } from '../../shared/types.js';

export interface AppRepositories {
  accounts: {
    create(input: CreateAccountInput): unknown;
    list(): unknown[];
  };
  posts: {
    create(input: CreatePostInput): unknown;
    listDue(nowIso: string): unknown[];
  };
}

export function registerIpcHandlers(repositories: AppRepositories) {
  ipcMain.handle('accounts:list', () => repositories.accounts.list());
  ipcMain.handle('accounts:create', (_event, input: CreateAccountInput) => repositories.accounts.create(input));
  ipcMain.handle('posts:create', (_event, input: CreatePostInput) => repositories.posts.create(input));
  ipcMain.handle('posts:due', () => repositories.posts.listDue(new Date().toISOString()));
}
```

- [ ] **Step 2: Wire database and IPC in main process**

Modify `electron/main.ts` to create a database under the app data path and register handlers:

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/main/db/database.js';
import { registerIpcHandlers } from '../src/main/ipc/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databasePath = path.join(app.getPath('userData'), 'weibo-publisher.sqlite');
const repositories = createDatabase(databasePath);
registerIpcHandlers(repositories);

async function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 3: Expose typed preload API**

Modify `electron/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { CreateAccountInput, CreatePostInput } from '../src/shared/types.js';

contextBridge.exposeInMainWorld('weiboPublisher', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (input: CreateAccountInput) => ipcRenderer.invoke('accounts:create', input),
  },
  posts: {
    create: (input: CreatePostInput) => ipcRenderer.invoke('posts:create', input),
    due: () => ipcRenderer.invoke('posts:due'),
  },
});
```

- [ ] **Step 4: Add renderer pages**

Create `src/renderer/pages/AccountsPage.tsx`:

```tsx
export function AccountsPage() {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Accounts</h2>
        <button type="button">Add account</button>
      </div>
      <p className="muted">Add Weibo browser environments by websocket endpoint or debugging port.</p>
    </section>
  );
}
```

Create `src/renderer/pages/QueuePage.tsx`:

```tsx
export function QueuePage() {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Queue</h2>
        <button type="button">Create post</button>
      </div>
      <p className="muted">Schedule text and image posts for active accounts.</p>
    </section>
  );
}
```

Create `src/renderer/pages/RunsPage.tsx`:

```tsx
export function RunsPage() {
  return (
    <section className="panel">
      <h2>Runs</h2>
      <p className="muted">Recent publish attempts and screenshots will appear here.</p>
    </section>
  );
}
```

Create `src/renderer/pages/SettingsPage.tsx`:

```tsx
export function SettingsPage() {
  return (
    <section className="panel">
      <h2>Settings</h2>
      <p className="muted">Default delay and local screenshot folder settings will appear here.</p>
    </section>
  );
}
```

Modify `src/renderer/App.tsx`:

```tsx
import { useState } from 'react';
import { AccountsPage } from './pages/AccountsPage';
import { QueuePage } from './pages/QueuePage';
import { RunsPage } from './pages/RunsPage';
import { SettingsPage } from './pages/SettingsPage';

type View = 'accounts' | 'queue' | 'runs' | 'settings';

const views: Array<{ id: View; label: string }> = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'queue', label: 'Queue' },
  { id: 'runs', label: 'Runs' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  const [view, setView] = useState<View>('accounts');

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Local console</p>
          <h1>Weibo Publisher</h1>
        </div>
        <nav>
          {views.map((item) => (
            <button
              className={item.id === view ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => setView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace">
        {view === 'accounts' && <AccountsPage />}
        {view === 'queue' && <QueuePage />}
        {view === 'runs' && <RunsPage />}
        {view === 'settings' && <SettingsPage />}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Expand styles**

Modify `src/renderer/styles.css` with the dashboard layout:

```css
:root {
  color: #17211b;
  background: #f4f1e8;
  font-family: "Aptos", "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 980px;
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(32, 82, 69, 0.09), transparent 38%),
    #f4f1e8;
}

button,
input,
textarea,
select {
  font: inherit;
}

.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 28px;
  border-right: 1px solid rgba(23, 33, 27, 0.14);
  background: rgba(255, 255, 255, 0.36);
}

.eyebrow {
  margin: 0 0 4px;
  color: #496257;
  font-size: 13px;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  font-size: 28px;
  line-height: 1.1;
}

nav {
  display: grid;
  gap: 8px;
}

.nav-item {
  border: 1px solid transparent;
  background: transparent;
  color: #30433a;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
  border-radius: 6px;
}

.nav-item.active {
  border-color: rgba(32, 82, 69, 0.22);
  background: #fffaf0;
  color: #17211b;
}

.workspace {
  padding: 32px;
}

.panel {
  border: 1px solid rgba(23, 33, 27, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.58);
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-header button {
  border: 0;
  border-radius: 6px;
  background: #205245;
  color: #fff;
  cursor: pointer;
  padding: 9px 14px;
}

.muted {
  color: #5d6b64;
}
```

- [ ] **Step 6: Verify renderer build**

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

## Task 6: Final Verification

**Files:**
- Modify only if verification reveals a concrete issue.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS for database, connector, and worker tests.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Start dev app**

Run: `npm run dev`

Expected: Vite starts at `http://127.0.0.1:5173` and Electron opens the dashboard.

## Self-Review

- Spec coverage: The plan covers manual browser connection, account and post persistence, worker publish decisions, the Weibo publisher shell, failure classification foundation, and an operational UI.
- Placeholder scan: The plan intentionally leaves vendor providers out of MVP scope and names them as unsupported modes. The only Weibo selector work in MVP is a safe publisher skeleton, because exact selectors must be captured during browser testing.
- Type consistency: Account, post, connector, and worker names are consistent across tasks.
- Scope note: Full Weibo compose selector automation should be implemented as a follow-up after a test account is available in an opened fingerprint browser environment.
