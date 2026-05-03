import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { schemaSql } from './schema.js';
import type {
  Account,
  AiPlugin,
  AiWorkflow,
  AiWorkflowRun,
  AiWorkflowRunStatus,
  AppSetting,
  ContentItem,
  ContentVersion,
  CreateAccountInput,
  CreateContentItemInput,
  CreateDistributionTaskInput,
  CreatePostInput,
  CreatePublishRunInput,
  DistributionTask,
  Platform,
  Post,
  PublishRun,
  UpdateAccountInput,
  UpdateContentItemInput,
  UpdateDistributionTaskInput,
} from '../../shared/types.js';

function now() {
  return new Date().toISOString();
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  const parsed = JSON.parse(String(value || '{}')) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: Number(row.id),
    name: String(row.name),
    platform: row.platform as Account['platform'],
    browserMode: row.browserMode as Account['browserMode'],
    providerProfileId: String(row.providerProfileId),
    wsEndpoint: String(row.wsEndpoint),
    debuggingPort: row.debuggingPort === null ? null : Number(row.debuggingPort),
    status: row.status as Account['status'],
    healthMessage: String(row.healthMessage ?? ''),
    lastCheckedAt: String(row.lastCheckedAt ?? ''),
    manualActionReason: String(row.manualActionReason ?? ''),
    notes: String(row.notes),
    activePluginCode: String(row.activePluginCode ?? ''),
    aiConfigJson: parseJsonObject(row.aiConfigJson),
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

function mapPlatform(row: Record<string, unknown>): Platform {
  return {
    id: Number(row.id),
    code: row.code as Platform['code'],
    name: String(row.name),
    enabled: Number(row.enabled) === 1,
    sortOrder: Number(row.sortOrder),
    configJson: parseJsonObject(row.configJson),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: Number(row.id),
    title: String(row.title),
    body: String(row.body),
    source: row.source as ContentItem['source'],
    status: row.status as ContentItem['status'],
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapContentVersion(row: Record<string, unknown>): ContentVersion {
  return {
    id: Number(row.id),
    contentId: Number(row.contentId),
    title: String(row.title),
    body: String(row.body),
    source: row.source as ContentVersion['source'],
    createdAt: String(row.createdAt),
  };
}

function mapDistributionTask(row: Record<string, unknown>): DistributionTask {
  return {
    id: Number(row.id),
    contentId: Number(row.contentId),
    accountId: Number(row.accountId),
    platform: row.platform as DistributionTask['platform'],
    legacyPostId: row.legacyPostId === null || row.legacyPostId === undefined ? null : Number(row.legacyPostId),
    scheduledAt: String(row.scheduledAt),
    status: row.status as DistributionTask['status'],
    platformPayload: parseJsonObject(row.platformPayload),
    lastError: String(row.lastError),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapPublishRun(row: Record<string, unknown>): PublishRun {
  return {
    id: Number(row.id),
    taskId: Number(row.taskId),
    accountId: Number(row.accountId),
    platform: row.platform as PublishRun['platform'],
    status: row.status as PublishRun['status'],
    message: String(row.message),
    startedAt: String(row.startedAt),
    finishedAt: String(row.finishedAt),
    screenshotPath: String(row.screenshotPath),
    createdAt: String(row.createdAt),
  };
}

function mapAiPlugin(row: Record<string, unknown>): AiPlugin {
  return {
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    description: String(row.description),
    configJson: parseJsonObject(row.configJson),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapAiWorkflow(row: Record<string, unknown>): AiWorkflow {
  return {
    id: Number(row.id),
    pluginCode: String(row.pluginCode),
    code: String(row.code),
    name: String(row.name),
    definitionJson: parseJsonObject(row.definitionJson),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapAiWorkflowRun(row: Record<string, unknown>): AiWorkflowRun {
  return {
    id: Number(row.id),
    runId: String(row.runId),
    pluginCode: String(row.pluginCode ?? ''),
    workflowCode: String(row.workflowCode),
    accountId: row.accountId === null ? null : Number(row.accountId),
    status: row.status as AiWorkflowRunStatus,
    contextSnapshot: parseJsonObject(row.contextSnapshot),
    logs: JSON.parse(String(row.logs || '[]')) as any[],
    startedAt: String(row.startedAt),
    finishedAt: String(row.finishedAt),
  };
}

function firstRow(row: unknown): Record<string, unknown> {
  if (!row) {
    throw new Error('Expected database row was not found');
  }
  return row as Record<string, unknown>;
}

export async function createDatabase(filename: string) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const sqlite = new Database(filename);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  // 强制同步热点表结构（镜像化重构阶段特供）
  sqlite.exec('DROP TABLE IF EXISTS hot_topics_history;');
  sqlite.exec(schemaSql);
  
  // [ULTIMATE SYNC] 暴力同步 API Key，绕过所有逻辑，直接写入数据库
  const syncTs = new Date().toISOString();
  const rawKeys = [
    ['ai.dashscopeKey', 'sk-59063e5f9c6d4cdf9d7e1803fa18ae39'],
    ['ai.apiyiKey', 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce'],
    ['ai.apiYiKey', 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce'],
    ['ai.tophubKey', '06d2a2c31c219c88ea3ee3fe1b7bb33c']
  ];
  
  for (const [k, v] of rawKeys) {
    sqlite.prepare(`
      INSERT INTO app_settings (key, value, description, updatedAt)
      VALUES (?, ?, 'Auto-injected by system', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `).run(k, v, syncTs);
  }
  console.log('[AI-DEBUG] Ultimate Key Sync Finished.');

  // 🔴 紧急硬编码注入：确保猫小仙数据在任何查询前存在
  try {
    const nowTs = new Date().toISOString();
    sqlite.prepare('INSERT OR IGNORE INTO ai_plugins (code, name, description, configJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      'maoxiaoxian', '猫小仙内容矩阵', '基于命理算法与实时热点的内容创作引擎', '{}', nowTs, nowTs
    );
    
    const wfDef = JSON.stringify({
      trigger: 'auto',
      frequency: '1/day',
      steps: [
        { id: 'step1', type: 'bazi_calc', birthDateKey: 'userBirth', outputKey: 'baziResult' },
        { id: 'step2', type: 'tophub_search', nodeId: 'KqndgxeLl9', outputKey: 'hotTopics' },
        { id: 'step3', type: 'llm', prompt: '结合命理结果 {{state.baziResult.summary}} 和今日热点 {{state.hotTopics[0]}}，写一篇治愈系微博文案。', inputKey: 'none', outputKey: 'finalContent' },
        { id: 'step4', type: 'image_gen', prompt: '一张充满意境的禅意背景图，适合微博配图', model: 'dall-e-3', outputKey: 'coverImage' }
      ]
    });

    sqlite.prepare('INSERT OR IGNORE INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      'maoxiaoxian', 'maoxiaoxian.daily_topics', '每日治愈系话题生成', wfDef, nowTs, nowTs
    );
  } catch (e) {
    console.error('Seed error:', e);
  }

  function select(sql: string, params: unknown[] = []) {
    return sqlite.prepare(sql).all(params) as Array<Record<string, unknown>>;
  }

  function applyMigration(id: string, callback: () => void) {
    const existing = sqlite.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(id);
    if (existing) {
      return;
    }

    const apply = sqlite.transaction(() => {
      callback();
      sqlite.prepare('INSERT INTO schema_migrations (id, appliedAt) VALUES (?, ?)').run(id, now());
    });
    apply();
  }

  function upsertSetting(key: string, value: string, description: string) {
    sqlite.prepare(`
      INSERT INTO app_settings (key, value, description, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = excluded.description
    `).run(key, value, description, now());
  }

  // [FORCE SYNC] 强制同步 AI API 密钥，确保认证链路畅通
  upsertSetting('ai.dashscopeKey', process.env.DASH_SCOPE_API_KEY || 'sk-59063e5f9c6d4cdf9d7e1803fa18ae39', 'Aliyun DashScope API Key.');
  upsertSetting('ai.apiyiKey', process.env.API_YI_KEY || 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce', 'APIYi (Gemini/OpenAI) API Key.');
  upsertSetting('ai.apiYiKey', process.env.API_YI_KEY || 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce', 'APIYi (Gemini/OpenAI) API Key.');

  function seedPlatform(code: string, name: string, sortOrder: number) {
    const timestamp = now();
    sqlite.prepare(`
      INSERT INTO platforms (code, name, enabled, sortOrder, configJson, createdAt, updatedAt)
      VALUES (?, ?, 1, ?, '{}', ?, ?)
      ON CONFLICT(code) DO NOTHING
    `).run(code, name, sortOrder, timestamp, timestamp);
  }

  applyMigration('001_initial_enterprise_schema', () => {
    seedPlatform('wechat_official', '微信公众号', 10);
    seedPlatform('wechat_channels', '视频号', 20);
    seedPlatform('xiaohongshu', '小红书', 30);
    seedPlatform('douyin', '抖音', 40);
    seedPlatform('weibo', '微博', 50);

    upsertSetting('scheduler.intervalMs', '30000', 'Automatic publishing scheduler interval in milliseconds.');
    upsertSetting('http.port', '5183', 'Local HTTP API port.');
    upsertSetting('http.allowedOrigins', 'http://127.0.0.1:5173,http://localhost:5173,null', 'Comma-separated local frontend origins allowed to access the HTTP API.');
    upsertSetting('browser.connectionTimeoutMs', '12000', 'Browser connection test timeout in milliseconds.');
    upsertSetting('adspower.apiKey', process.env.ADSPOWER_API_KEY ?? '', 'AdsPower Local API key.');
    upsertSetting('updates.enabled', 'true', 'Enable GitHub Releases update checks.');
    upsertSetting('updates.provider', 'github', 'Desktop update provider.');
    upsertSetting('updates.owner', '', 'GitHub repository owner for releases.');
    upsertSetting('updates.repo', '', 'GitHub repository name for releases.');
    upsertSetting('ui.language', 'zh', 'Default interface language.');
    upsertSetting('ui.enabledBrowserModes', 'adspower,manual_port,manual_ws', 'Comma-separated enabled browser modes shown in account creation.');
  });

  applyMigration('002_seed_maoxiaoxian_plugin', () => {
    // 注入猫小仙插件
    const timestamp = now();
    sqlite.prepare('INSERT INTO ai_plugins (code, name, description, configJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      'maoxiaoxian',
      '猫小仙内容矩阵',
      '基于命理算法与实时热点的内容创作引擎',
      '{}',
      timestamp,
      timestamp
    );

    // 注入每日话题生成工作流
    const workflowDef = {
      trigger: 'auto',
      frequency: '1/day',
      steps: [
        { id: 'step1', type: 'bazi_calc', birthDateKey: 'userBirth', outputKey: 'baziResult' },
        { id: 'step2', type: 'tophub_search', nodeId: 'KqndgxeLl9', outputKey: 'hotTopics' },
        { id: 'step3', type: 'llm', prompt: '结合命理结果 {{state.baziResult.summary}} 和今日热点 {{state.hotTopics[0]}}，写一篇治愈系微博文案。', inputKey: 'none', outputKey: 'finalContent' },
        { id: 'step4', type: 'image_gen', prompt: '一张充满意境的禅意背景图，适合微博配图', model: 'dall-e-3', outputKey: 'coverImage' }
      ]
    };

    sqlite.prepare('INSERT INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      'maoxiaoxian',
      'maoxiaoxian.daily_topics',
      '每日治愈系话题生成',
      JSON.stringify(workflowDef),
      timestamp,
      timestamp
    );
  });

  applyMigration('003_seed_maoxiaoxian_v2', () => {
    const timestamp = now();
    sqlite.prepare('INSERT OR REPLACE INTO ai_plugins (code, name, description, configJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      'maoxiaoxian',
      '猫小仙内容矩阵',
      '基于命理算法与实时热点的内容创作引擎',
      '{}',
      timestamp,
      timestamp
    );

    const workflowDef = {
      trigger: 'auto',
      frequency: '1/day',
      steps: [
        { id: 'step1', type: 'bazi_calc', birthDateKey: 'userBirth', outputKey: 'baziResult' },
        { id: 'step2', type: 'tophub_search', nodeId: 'KqndgxeLl9', outputKey: 'hotTopics' },
        { id: 'step3', type: 'llm', prompt: '结合命理结果 {{state.baziResult.summary}} 和今日热点 {{state.hotTopics[0]}}，写一篇治愈系微博文案。', inputKey: 'none', outputKey: 'finalContent' },
        { id: 'step4', type: 'image_gen', prompt: '一张充满意境的禅意背景图，适合微博配图', model: 'dall-e-3', outputKey: 'coverImage' }
      ]
    };

    sqlite.prepare('INSERT OR REPLACE INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
      'maoxiaoxian',
      'maoxiaoxian.daily_topics',
      '每日治愈系话题生成',
      JSON.stringify(workflowDef),
      timestamp,
      timestamp
    );
  });

  applyMigration('004_fix_workflow_runs_columns', () => {
    try {
      sqlite.prepare('ALTER TABLE ai_workflow_runs ADD COLUMN pluginCode TEXT NOT NULL DEFAULT ""').run();
    } catch (e) {}
    try {
      sqlite.prepare('ALTER TABLE ai_workflow_runs ADD COLUMN workflowCode TEXT NOT NULL DEFAULT ""').run();
    } catch (e) {}
  });

  applyMigration('005_fix_accounts_columns', () => {
    try {
      sqlite.prepare('ALTER TABLE accounts ADD COLUMN activePluginCode TEXT NOT NULL DEFAULT ""').run();
    } catch (e) {}
    try {
      sqlite.prepare('ALTER TABLE accounts ADD COLUMN aiConfigJson TEXT NOT NULL DEFAULT "{}"').run();
    } catch (e) {}
  });

  // ---------------------------------------------------------
  // 强力硬编码注入 (Brute Force Seed)
  // 确保无论迁移逻辑如何，数据在启动时必须存在
  // ---------------------------------------------------------
  const ts = now();
  sqlite.prepare('INSERT OR REPLACE INTO ai_plugins (code, name, description, configJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    'maoxiaoxian', '猫小仙内容矩阵', '基于命理算法与实时热点的内容创作引擎', '{}', ts, ts
  );

  // 强制补全 API Key 设置项
  upsertSetting('ai.dashscopeKey', process.env.DASH_SCOPE_API_KEY || 'sk-59063e5f9c6d4cdf9d7e1803fa18ae39', 'Aliyun DashScope API Key.');
  upsertSetting('ai.apiyiKey', process.env.API_YI_KEY || 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce', 'APIYi (Gemini/OpenAI) API Key.');
  
  const wfConfig = JSON.stringify({
    trigger: 'auto',
    frequency: '1/day',
    steps: [
      { id: 'step1', type: 'bazi_calc', birthDateKey: 'userBirth', outputKey: 'baziResult' },
      { id: 'step2', type: 'tophub_search', nodeId: 'KqndgxeLl9', outputKey: 'hotTopics' },
      { id: 'step3', type: 'llm', prompt: '结合命理结果 {{state.baziResult.summary}} 和今日热点 {{state.hotTopics[0]}}，写一篇治愈系微博文案。', inputKey: 'none', outputKey: 'finalContent' },
      { id: 'step4', type: 'image_gen', prompt: '一张充满意境的禅意背景图，适合微博配图', model: 'dall-e-3', outputKey: 'coverImage' }
    ]
  });

  sqlite.prepare('INSERT OR REPLACE INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    'maoxiaoxian', 'maoxiaoxian.daily_topics', '每日治愈系话题生成', wfConfig, ts, ts
  );

  return {
    migrations: {
      list(): string[] {
        return select('SELECT id FROM schema_migrations ORDER BY appliedAt ASC').map((row) => String(row.id));
      },
    },
    settings: {
      get(key: string): string | null {
        const appRow = sqlite.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value?: unknown } | undefined;
        if (appRow) {
          return String(appRow.value);
        }

        const legacyRow = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value?: unknown } | undefined;
        return legacyRow ? String(legacyRow.value) : null;
      },
      set(key: string, value: string, description = ''): void {
        sqlite.prepare(`
          INSERT INTO app_settings (key, value, description, updatedAt)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
        `).run(key, value, description, now());
      },
      list(): AppSetting[] {
        return select('SELECT * FROM app_settings ORDER BY key ASC').map((row) => ({
          key: String(row.key),
          value: String(row.value),
          description: String(row.description),
          updatedAt: String(row.updatedAt),
        }));
      },
    },
    platforms: {
      list(): Platform[] {
        return select('SELECT * FROM platforms WHERE enabled = 1 ORDER BY sortOrder ASC, id ASC').map(mapPlatform);
      },
    },
    accounts: {
      create(input: CreateAccountInput): Account {
        const timestamp = now();
        const result = sqlite.prepare(`
          INSERT INTO accounts (name, platform, browserMode, providerProfileId, wsEndpoint, debuggingPort, status, notes, activePluginCode, aiConfigJson, createdAt, updatedAt)
          VALUES (@name, @platform, @browserMode, @providerProfileId, @wsEndpoint, @debuggingPort, @status, @notes, @activePluginCode, @aiConfigJson, @createdAt, @updatedAt)
        `).run({ 
          ...input, 
          activePluginCode: input.activePluginCode ?? '',
          aiConfigJson: JSON.stringify(input.aiConfigJson ?? {}),
          createdAt: timestamp, 
          updatedAt: timestamp 
        });
        return mapAccount(firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid)));
      },
      list(): Account[] {
        return select('SELECT * FROM accounts ORDER BY id DESC').map(mapAccount);
      },
      listByPlugin(pluginCode: string): Account[] {
        return select('SELECT * FROM accounts WHERE activePluginCode = ? ORDER BY id DESC', [pluginCode]).map(mapAccount);
      },
      findById(id: number): Account | null {
        const row = sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        return row ? mapAccount(row as Record<string, unknown>) : null;
      },
      update(id: number, input: UpdateAccountInput): Account {
        sqlite.prepare(`
          UPDATE accounts
          SET name = ?, browserMode = ?, providerProfileId = ?, wsEndpoint = ?, debuggingPort = ?, status = ?, healthMessage = ?, lastCheckedAt = ?, manualActionReason = ?, notes = ?, activePluginCode = ?, aiConfigJson = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          input.name,
          input.browserMode,
          input.providerProfileId,
          input.wsEndpoint,
          input.debuggingPort,
          input.status,
          input.healthMessage ?? '',
          input.lastCheckedAt ?? '',
          input.manualActionReason ?? '',
          input.notes,
          input.activePluginCode ?? '',
          JSON.stringify(input.aiConfigJson ?? {}),
          now(),
          id,
        );
        return mapAccount(firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(id)));
      },
      updateHealth(id: number, input: { status: Account['status']; healthMessage: string; manualActionReason?: string }): Account {
        sqlite.prepare(`
          UPDATE accounts
          SET status = ?, healthMessage = ?, manualActionReason = ?, lastCheckedAt = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          input.status,
          input.healthMessage,
          input.manualActionReason ?? '',
          now(),
          now(),
          id,
        );
        return mapAccount(firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(id)));
      },
      delete(id: number): boolean {
        sqlite.transaction(() => {
          sqlite.prepare(`
            DELETE FROM publish_logs
            WHERE accountId = ?
               OR postId IN (SELECT id FROM posts WHERE accountId = ?)
          `).run(id, id);
          sqlite.prepare(`
            DELETE FROM publish_runs
            WHERE accountId = ?
               OR taskId IN (
                 SELECT id FROM distribution_tasks
                 WHERE accountId = ?
                    OR legacyPostId IN (SELECT id FROM posts WHERE accountId = ?)
               )
          `).run(id, id, id);
          sqlite.prepare(`
            DELETE FROM distribution_tasks
            WHERE accountId = ?
               OR legacyPostId IN (SELECT id FROM posts WHERE accountId = ?)
          `).run(id, id);
          sqlite.prepare('DELETE FROM posts WHERE accountId = ?').run(id);
          sqlite.prepare('DELETE FROM accounts WHERE id = ?').run(id);
        })();
        return !this.findById(id);
      },
    },
    posts: {
      create(input: CreatePostInput): Post {
        const timestamp = now();
        const create = sqlite.transaction(() => {
          const postResult = sqlite.prepare(`
            INSERT INTO posts (accountId, content, mediaPaths, scheduledAt, status, createdAt, updatedAt)
            VALUES (@accountId, @content, @mediaPaths, @scheduledAt, @status, @createdAt, @updatedAt)
          `).run({
            ...input,
            mediaPaths: JSON.stringify(input.mediaPaths),
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          const account = firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(input.accountId));
          const contentResult = sqlite.prepare(`
            INSERT INTO content_items (title, body, source, status, createdAt, updatedAt)
            VALUES (?, ?, 'manual', 'ready', ?, ?)
          `).run(input.content.slice(0, 48) || 'Untitled content', input.content, timestamp, timestamp);
          sqlite.prepare(`
            INSERT INTO content_versions (contentId, title, body, source, createdAt)
            VALUES (?, ?, ?, 'manual', ?)
          `).run(contentResult.lastInsertRowid, input.content.slice(0, 48) || 'Untitled content', input.content, timestamp);
          sqlite.prepare(`
            INSERT INTO distribution_tasks (contentId, accountId, platform, legacyPostId, scheduledAt, status, platformPayload, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            contentResult.lastInsertRowid,
            input.accountId,
            String(account.platform),
            postResult.lastInsertRowid,
            input.scheduledAt,
            input.status,
            JSON.stringify({ content: input.content, mediaPaths: input.mediaPaths }),
            timestamp,
            timestamp,
          );
          return postResult.lastInsertRowid;
        });
        const id = create();
        return mapPost(firstRow(sqlite.prepare('SELECT * FROM posts WHERE id = ?').get(id)));
      },
      list(): Post[] {
        return select('SELECT * FROM posts ORDER BY createdAt DESC, id DESC').map(mapPost);
      },
      findById(id: number): Post | null {
        const row = sqlite.prepare('SELECT * FROM posts WHERE id = ?').get(id);
        return row ? mapPost(row as Record<string, unknown>) : null;
      },
      listDue(nowIso: string): Post[] {
        return select(`
          SELECT * FROM posts
          WHERE status = 'queued' AND scheduledAt <= ?
          ORDER BY scheduledAt ASC, id ASC
        `, [nowIso]).map(mapPost);
      },
      updateStatus(id: number, status: Post['status'], lastError = '', screenshotPath = ''): void {
        sqlite.prepare(`
          UPDATE posts
          SET status = ?, lastError = ?, screenshotPath = ?, updatedAt = ?
          WHERE id = ?
        `).run(status, lastError, screenshotPath, now(), id);
      },
      delete(id: number): boolean {
        sqlite.transaction(() => {
          sqlite.prepare('DELETE FROM publish_logs WHERE postId = ?').run(id);
          sqlite.prepare('DELETE FROM publish_runs WHERE taskId IN (SELECT id FROM distribution_tasks WHERE legacyPostId = ?)').run(id);
          sqlite.prepare('DELETE FROM distribution_tasks WHERE legacyPostId = ?').run(id);
          sqlite.prepare('DELETE FROM posts WHERE id = ?').run(id);
        })();
        return !this.findById(id);
      },
    },
    contentItems: {
      create(input: CreateContentItemInput): ContentItem {
        const timestamp = now();
        const create = sqlite.transaction(() => {
          const result = sqlite.prepare(`
            INSERT INTO content_items (title, body, source, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(input.title, input.body, input.source, input.status, timestamp, timestamp);
          sqlite.prepare(`
            INSERT INTO content_versions (contentId, title, body, source, createdAt)
            VALUES (?, ?, ?, ?, ?)
          `).run(result.lastInsertRowid, input.title, input.body, input.source, timestamp);
          return result.lastInsertRowid;
        });
        const id = create();
        return mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(id)));
      },
      list(): ContentItem[] {
        return select('SELECT * FROM content_items ORDER BY updatedAt DESC, id DESC').map(mapContentItem);
      },
      findById(id: number): ContentItem | null {
        const row = sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(id);
        return row ? mapContentItem(row as Record<string, unknown>) : null;
      },
      listVersions(contentId: number): ContentVersion[] {
        return select('SELECT * FROM content_versions WHERE contentId = ? ORDER BY createdAt DESC, id DESC', [contentId]).map(mapContentVersion);
      },
      update(id: number, input: UpdateContentItemInput): ContentItem {
        const timestamp = now();
        const update = sqlite.transaction(() => {
          sqlite.prepare(`
            UPDATE content_items
            SET title = ?, body = ?, status = ?, updatedAt = ?
            WHERE id = ?
          `).run(input.title, input.body, input.status, timestamp, id);
          sqlite.prepare(`
            INSERT INTO content_versions (contentId, title, body, source, createdAt)
            VALUES (?, ?, ?, 'manual', ?)
          `).run(id, input.title, input.body, timestamp);
        });
        update();
        return mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(id)));
      },
      delete(id: number): boolean {
        sqlite.transaction(() => {
          sqlite.prepare('DELETE FROM publish_runs WHERE taskId IN (SELECT id FROM distribution_tasks WHERE contentId = ?)').run(id);
          sqlite.prepare('DELETE FROM distribution_tasks WHERE contentId = ?').run(id);
          sqlite.prepare('DELETE FROM content_versions WHERE contentId = ?').run(id);
          sqlite.prepare('DELETE FROM media_assets WHERE contentId = ?').run(id);
          sqlite.prepare('DELETE FROM content_items WHERE id = ?').run(id);
        })();
        return !this.findById(id);
      },
    },
    distributionTasks: {
      create(input: CreateDistributionTaskInput): DistributionTask {
        const timestamp = now();
        const result = sqlite.prepare(`
          INSERT INTO distribution_tasks (contentId, accountId, platform, legacyPostId, scheduledAt, status, platformPayload, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.contentId,
          input.accountId,
          input.platform,
          input.legacyPostId ?? null,
          input.scheduledAt,
          input.status,
          JSON.stringify(input.platformPayload),
          timestamp,
          timestamp,
        );
        return mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(result.lastInsertRowid)));
      },
      listDue(nowIso: string): DistributionTask[] {
        return select(`
          SELECT * FROM distribution_tasks
          WHERE status = 'queued' AND scheduledAt <= ?
          ORDER BY scheduledAt ASC, id ASC
        `, [nowIso]).map(mapDistributionTask);
      },
      list(): DistributionTask[] {
        return select('SELECT * FROM distribution_tasks ORDER BY scheduledAt DESC, id DESC').map(mapDistributionTask);
      },
      updateStatus(id: number, status: DistributionTask['status'], lastError = ''): void {
        sqlite.prepare(`
          UPDATE distribution_tasks
          SET status = ?, lastError = ?, updatedAt = ?
          WHERE id = ?
        `).run(status, lastError, now(), id);
      },
      update(id: number, input: UpdateDistributionTaskInput): DistributionTask {
        const timestamp = now();
        const existing = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
        const nextContentId = input.contentId ?? existing.contentId;
        const nextAccountId = input.accountId ?? existing.accountId;
        const account = mapAccount(firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(nextAccountId)));
        firstRow(sqlite.prepare('SELECT id FROM content_items WHERE id = ?').get(nextContentId));

        sqlite.prepare(`
          UPDATE distribution_tasks
          SET contentId = ?, accountId = ?, platform = ?, scheduledAt = ?, status = ?, platformPayload = ?, lastError = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          nextContentId,
          nextAccountId,
          account.platform,
          input.scheduledAt,
          input.status,
          JSON.stringify(input.platformPayload),
          input.status === 'failed' ? existing.lastError : '',
          timestamp,
          id,
        );
        const task = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
        if (task.legacyPostId) {
          const mediaPaths = Array.isArray(task.platformPayload.mediaPaths) ? task.platformPayload.mediaPaths : [];
          sqlite.prepare(`
            UPDATE posts
            SET accountId = ?, scheduledAt = ?, status = ?, content = ?, mediaPaths = ?, lastError = ?, updatedAt = ?
            WHERE id = ?
          `).run(
            task.accountId,
            task.scheduledAt,
            task.status,
            String(task.platformPayload.content ?? ''),
            JSON.stringify(mediaPaths),
            task.status === 'failed' ? existing.lastError : '',
            now(),
            task.legacyPostId,
          );
        }
        return task;
      },
      retry(id: number): DistributionTask {
        sqlite.prepare(`
          UPDATE distribution_tasks
          SET status = 'queued', lastError = '', updatedAt = ?
          WHERE id = ?
        `).run(now(), id);
        const task = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
        if (task.legacyPostId) {
          sqlite.prepare(`
            UPDATE posts
            SET status = 'queued', lastError = '', updatedAt = ?
            WHERE id = ?
          `).run(now(), task.legacyPostId);
        }
        return task;
      },
      retryMany(ids: number[]): DistributionTask[] {
        return ids.map((id) => this.retry(id));
      },
      cancel(id: number): DistributionTask {
        sqlite.prepare(`
          UPDATE distribution_tasks
          SET status = 'failed', lastError = 'Cancelled by operator', updatedAt = ?
          WHERE id = ?
        `).run(now(), id);
        const task = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
        if (task.legacyPostId) {
          sqlite.prepare(`
            UPDATE posts
            SET status = 'failed', lastError = 'Cancelled by operator', updatedAt = ?
            WHERE id = ?
          `).run(now(), task.legacyPostId);
        }
        return task;
      },
      cancelMany(ids: number[]): DistributionTask[] {
        return ids.map((id) => this.cancel(id));
      },
      delete(id: number): boolean {
        sqlite.transaction(() => {
          sqlite.prepare('DELETE FROM publish_runs WHERE taskId = ?').run(id);
          sqlite.prepare('DELETE FROM distribution_tasks WHERE id = ?').run(id);
        })();
        return !sqlite.prepare('SELECT id FROM distribution_tasks WHERE id = ?').get(id);
      },
    },
    hotTopicsHistory: {
      saveMany(items: any[]): void {
        const timestamp = now();
        const insert = sqlite.prepare(`
          INSERT INTO hot_topics_history (
            platform, title, url, mobilUrl, thumbnail, extra, desc, author, hotValue, hot_value, rank, createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        sqlite.transaction(() => {
          for (const item of items) {
            insert.run(
              item.platform,
              item.title || null,
              item.url || null,
              item.mobilUrl || null,
              item.thumbnail || null,
              item.extra || null,
              item.desc || null,
              item.author || null,
              item.hotValue || null,
              item.hot_value || null,
              item.rank || null,
              timestamp
            );
          }
        })();
      },
      getLatest(limit = 100): any[] {
        // 获取最近一次抓取的全部条目
        const lastTimestampRow = sqlite.prepare('SELECT createdAt FROM hot_topics_history ORDER BY createdAt DESC LIMIT 1').get() as { createdAt: string } | undefined;
        if (!lastTimestampRow) return [];
        
        return select('SELECT * FROM hot_topics_history WHERE createdAt = ? ORDER BY rank ASC LIMIT ?', [lastTimestampRow.createdAt, limit]);
      },
      getLastFetchTime(): string | null {
        const row = sqlite.prepare('SELECT createdAt FROM hot_topics_history ORDER BY createdAt DESC LIMIT 1').get() as { createdAt: string } | undefined;
        return row ? row.createdAt : null;
      }
    },
    publishRuns: {
      create(input: CreatePublishRunInput): PublishRun {
        const result = sqlite.prepare(`
          INSERT INTO publish_runs (taskId, accountId, platform, status, message, startedAt, finishedAt, screenshotPath, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.taskId,
          input.accountId,
          input.platform,
          input.status,
          input.message,
          input.startedAt,
          input.finishedAt,
          input.screenshotPath,
          now(),
        );
        return mapPublishRun(firstRow(sqlite.prepare('SELECT * FROM publish_runs WHERE id = ?').get(result.lastInsertRowid)));
      },
      listByTask(taskId: number): PublishRun[] {
        return select('SELECT * FROM publish_runs WHERE taskId = ? ORDER BY createdAt DESC, id DESC', [taskId]).map(mapPublishRun);
      },
      list(): PublishRun[] {
        return select('SELECT * FROM publish_runs ORDER BY createdAt DESC, id DESC').map(mapPublishRun);
      },
    },
    aiPlugins: {
      upsert(input: Omit<AiPlugin, 'id' | 'createdAt' | 'updatedAt'>): AiPlugin {
        const timestamp = now();
        sqlite.prepare(`
          INSERT INTO ai_plugins (code, name, description, configJson, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(code) DO UPDATE SET 
            name = excluded.name, 
            description = excluded.description, 
            configJson = excluded.configJson, 
            updatedAt = excluded.updatedAt
        `).run(input.code, input.name, input.description, JSON.stringify(input.configJson), timestamp, timestamp);
        return mapAiPlugin(firstRow(sqlite.prepare('SELECT * FROM ai_plugins WHERE code = ?').get(input.code)));
      },
      list(): AiPlugin[] {
        return select('SELECT * FROM ai_plugins ORDER BY name ASC').map(mapAiPlugin);
      },
      findByCode(code: string): AiPlugin | null {
        const row = sqlite.prepare('SELECT * FROM ai_plugins WHERE code = ?').get(code);
        return row ? mapAiPlugin(row as Record<string, unknown>) : null;
      }
    },
    aiWorkflows: {
      upsert(input: Omit<AiWorkflow, 'id' | 'createdAt' | 'updatedAt'>): AiWorkflow {
        const timestamp = now();
        sqlite.prepare(`
          INSERT INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(pluginCode, code) DO UPDATE SET 
            name = excluded.name, 
            definitionJson = excluded.definitionJson, 
            updatedAt = excluded.updatedAt
        `).run(input.pluginCode, input.code, input.name, JSON.stringify(input.definitionJson), timestamp, timestamp);
        return mapAiWorkflow(firstRow(sqlite.prepare('SELECT * FROM ai_workflows WHERE pluginCode = ? AND code = ?').get(input.pluginCode, input.code)));
      },
      list(): AiWorkflow[] {
        return select('SELECT * FROM ai_workflows ORDER BY name ASC').map(mapAiWorkflow);
      },
      listByPlugin(pluginCode: string): AiWorkflow[] {
        return select('SELECT * FROM ai_workflows WHERE pluginCode = ? ORDER BY name ASC', [pluginCode]).map(mapAiWorkflow);
      },
      findByCode(pluginCode: string, code: string): AiWorkflow | null {
        const row = sqlite.prepare('SELECT * FROM ai_workflows WHERE pluginCode = ? AND code = ?').get(pluginCode, code);
        return row ? mapAiWorkflow(row as Record<string, unknown>) : null;
      }
    },
    aiWorkflowRuns: {
      create(input: Omit<AiWorkflowRun, 'id' | 'status' | 'logs' | 'finishedAt' | 'contextSnapshot'>): AiWorkflowRun {
        const result = sqlite.prepare(`
          INSERT INTO ai_workflow_runs (runId, pluginCode, workflowCode, accountId, startedAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(input.runId, input.pluginCode, input.workflowCode, input.accountId, input.startedAt);
        return mapAiWorkflowRun(firstRow(sqlite.prepare('SELECT * FROM ai_workflow_runs WHERE id = ?').get(result.lastInsertRowid)));
      },
      updateStatus(runId: string, status: AiWorkflowRunStatus, contextSnapshot: Record<string, unknown>, logs: any[], finishedAt?: string): AiWorkflowRun {
        sqlite.prepare(`
          UPDATE ai_workflow_runs
          SET status = ?, contextSnapshot = ?, logs = ?, finishedAt = ?
          WHERE runId = ?
        `).run(status, JSON.stringify(contextSnapshot), JSON.stringify(logs), finishedAt ?? '', runId);
        return mapAiWorkflowRun(firstRow(sqlite.prepare('SELECT * FROM ai_workflow_runs WHERE runId = ?').get(runId)));
      },
      findByRunId(runId: string): AiWorkflowRun | null {
        const row = sqlite.prepare('SELECT * FROM ai_workflow_runs WHERE runId = ?').get(runId);
        return row ? mapAiWorkflowRun(row as Record<string, unknown>) : null;
      },
      listByWorkflow(pluginCode: string, workflowCode: string): AiWorkflowRun[] {
        return select('SELECT * FROM ai_workflow_runs WHERE pluginCode = ? AND workflowCode = ? ORDER BY startedAt DESC', [pluginCode, workflowCode]).map(mapAiWorkflowRun);
      }
    }
  };
}

export type AppDatabase = Awaited<ReturnType<typeof createDatabase>>;
