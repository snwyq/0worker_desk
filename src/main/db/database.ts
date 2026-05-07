import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { schemaSql } from './schema.js';
import { normalizePublishMediaPath } from '../../shared/mediaPaths.js';
import { SchedulingEngine } from '../core/workflow/SchedulingEngine.js';
import type {
  Account,
  AiPlugin,
  AiWorkflow,
  AiWorkflowRun,
  AiWorkflowRunStatus,
  AppSetting,
  AnalyzeHotPeopleResult,
  ContentItem,
  ContentStyle,
  ContentVersion,
  CreateAccountInput,
  CreateContentItemInput,
  CreateContentStyleInput,
  CreateDistributionTaskInput,
  CreatePostInput,
  CreatePublishRunInput,
  CreateReviewItemInput,
  DispatchSimulationEntry,
  PublishingStrategy,
  CreatePublishingStrategyInput,
  UpdatePublishingStrategyInput,
  Post,
  Platform,
  ReviewItem,
  DistributionTask,
  PublishRun,
  HotPerson,
  HotBaziTask,
  SourceColumn,
  UpdateAccountInput,
  UpdateContentStyleInput,
  UpdateContentItemInput,
  UpdateDistributionTaskInput,
  UpsertHotPersonInput,
  CreateHotBaziTaskInput,
  UpdateHotBaziTaskInput,
} from '../../shared/types.js';

function now() {
  return new Date().toISOString();
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  const parsed = JSON.parse(String(value || '{}')) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function parseJsonArray<T = unknown>(value: unknown): T[] {
  const parsed = JSON.parse(String(value || '[]')) as unknown;
  return Array.isArray(parsed) ? parsed as T[] : [];
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
    tenantId: String(row.tenantId ?? ''),
    accountId: row.accountId === null || row.accountId === undefined ? null : Number(row.accountId),
    pluginCode: String(row.pluginCode ?? ''),
    styleId: String(row.styleId ?? ''),
    runId: String(row.runId ?? ''),
    topicsJson: parseJsonArray<string>(row.topicsJson),
    mediaJson: parseJsonArray<Record<string, unknown>>(row.mediaJson),
    sourceJson: parseJsonObject(row.sourceJson),
    riskJson: parseJsonObject(row.riskJson),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapContentStyle(row: Record<string, unknown>): ContentStyle {
  return {
    id: String(row.id),
    tenantId: String(row.tenantId ?? ''),
    accountId: row.accountId === null || row.accountId === undefined ? null : Number(row.accountId),
    pluginCode: String(row.pluginCode),
    workflowCode: String(row.workflowCode),
    name: String(row.name),
    description: String(row.description ?? ''),
    promptTemplateId: String(row.promptTemplateId ?? ''),
    modelPolicyJson: parseJsonObject(row.modelPolicyJson),
    reviewPolicyJson: parseJsonObject(row.reviewPolicyJson),
    dispatchPolicyJson: parseJsonObject(row.dispatchPolicyJson),
    dedupePolicyJson: parseJsonObject(row.dedupePolicyJson),
    status: row.status as ContentStyle['status'],
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapReviewItem(row: Record<string, unknown>): ReviewItem {
  return {
    id: Number(row.id),
    contentId: Number(row.contentId),
    reviewMode: row.reviewMode as ReviewItem['reviewMode'],
    status: row.status as ReviewItem['status'],
    reviewerId: String(row.reviewerId ?? ''),
    comment: String(row.comment ?? ''),
    rewriteError: String(row.rewriteError ?? ''),
    rewrittenBody: String(row.rewrittenBody ?? ''),
    approvedAt: String(row.approvedAt ?? ''),
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

function readMediaPathsFromTask(content: ContentItem, task: DistributionTask): string[] {
  const payloadMedia = task.platformPayload.mediaPaths;
  if (Array.isArray(payloadMedia)) {
    return payloadMedia.map(normalizePublishMediaPath).filter(Boolean);
  }

  return content.mediaJson
    .map((item) => item.path ?? item.url ?? item.filePath)
    .map(normalizePublishMediaPath)
    .filter(Boolean);
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

function mapPublishingStrategy(row: Record<string, unknown>): PublishingStrategy {
  return {
    id: String(row.id),
    workflowCode: String(row.workflowCode),
    name: String(row.name),
    maxDailyPosts: Number(row.maxDailyPosts),
    minIntervalMins: Number(row.minIntervalMins),
    activeTimeRangesJson: parseJsonArray<string[]>(row.activeTimeRangesJson),
    jitterMins: Number(row.jitterMins),
    isActive: Number(row.isActive) === 1,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapHotPerson(row: Record<string, unknown>): HotPerson {
  return {
    id: Number(row.id),
    name: String(row.name),
    gender: String(row.gender ?? '') as HotPerson['gender'],
    birthday: String(row.birthday ?? ''),
    verifyBirthday: String(row.verifyBirthday ?? ''),
    bio: String(row.bio ?? ''),
    constellation: String(row.constellation ?? ''),
    sizhu: String(row.sizhu ?? ''),
    dayunInfo: String(row.dayunInfo ?? ''),
    photoUrl: String(row.photoUrl ?? ''),
    promptText: String(row.promptText ?? ''),
    sourceTopicTitle: String(row.sourceTopicTitle ?? ''),
    sourcePlatform: String(row.sourcePlatform ?? ''),
    analysisStatus: String(row.analysisStatus ?? 'pending') as HotPerson['analysisStatus'],
    updateTime: String(row.updateTime),
    createTime: String(row.createTime),
  };
}

function mapHotBaziTask(row: Record<string, unknown>): HotBaziTask {
  return {
    id: Number(row.id),
    contentId: Number(row.contentId),
    accountId: Number(row.accountId),
    platform: row.platform as HotBaziTask['platform'],
    hotPersonId: row.hotPersonId === null || row.hotPersonId === undefined ? null : Number(row.hotPersonId),
    sourceTopic: String(row.sourceTopic ?? ''),
    scheduledAt: String(row.scheduledAt),
    status: row.status as HotBaziTask['status'],
    automationEnabled: Number(row.automationEnabled ?? 0) === 1,
    intervalMinutes: Number(row.intervalMinutes ?? 60),
    scheduleRuleJson: parseJsonObject(row.scheduleRuleJson),
    mediaPathsJson: parseJsonArray<string>(row.mediaPathsJson),
    platformPayload: parseJsonObject(row.platformPayload),
    lastError: String(row.lastError ?? ''),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}


function mapPublicFigureEvidence(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    name: String(row.name),
    title: String(row.title ?? ''),
    summary: String(row.summary ?? ''),
    imageUrl: String(row.imageUrl ?? ''),
    birthDate: String(row.birthDate ?? ''),
    gender: String(row.gender ?? '') as '' | '男' | '女',
    source: String(row.source ?? ''),
    updateTime: String(row.updateTime),
    createTime: String(row.createTime),
  };
}

function mapSourceColumn(row: Record<string, unknown>): SourceColumn {
  return {
    id: String(row.id),
    label: String(row.label ?? ''),
    description: String(row.description ?? ''),
    pluginCode: String(row.pluginCode ?? ''),
    workflowCode: String(row.workflowCode ?? ''),
    styleId: String(row.styleId ?? ''),
    source: String(row.source ?? ''),
    enqueueSource: String(row.enqueueSource ?? ''),
    sortIndex: Number(row.sortIndex ?? 0),
    builtin: Number(row.builtin ?? 1) === 1,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export interface BuiltinSourceColumn {
  id: string;
  label: string;
  description: string;
  pluginCode: string;
  workflowCode: string;
  styleId: string;
  source: string;
  enqueueSource: string;
  sortIndex: number;
}

export const BUILTIN_SOURCE_COLUMNS: BuiltinSourceColumn[] = [
  {
    id: 'col_ai_hot_bazi',
    label: '热点八字 AI',
    description: '热点人物八字解读，日更命理内容。',
    pluginCode: 'maoxiaoxian',
    workflowCode: 'maoxiaoxian.daily_hot_person',
    styleId: 'mx_hot_bazi',
    source: 'ai',
    enqueueSource: '',
    sortIndex: 10,
  },
  {
    id: 'col_ai_hot_person',
    label: '热点人物 AI',
    description: '热点人物相关 AI 内容（不限风格）。',
    pluginCode: 'maoxiaoxian',
    workflowCode: 'maoxiaoxian.daily_hot_person',
    styleId: '',
    source: 'ai',
    enqueueSource: '',
    sortIndex: 20,
  },
  {
    id: 'col_ai_sharp_commentary',
    label: '犀利热点点评 AI',
    description: '观点型、长文点评内容。',
    pluginCode: 'maoxiaoxian',
    workflowCode: 'maoxiaoxian.hot_commentary',
    styleId: 'mx_sharp_commentary',
    source: 'ai',
    enqueueSource: '',
    sortIndex: 30,
  },
  {
    id: 'col_ai_healing_emotion',
    label: '治愈情绪 AI',
    description: '治愈系、情绪价值向内容。',
    pluginCode: 'maoxiaoxian',
    workflowCode: 'maoxiaoxian.manual_or_batch_topic',
    styleId: 'mx_healing_emotion',
    source: 'ai',
    enqueueSource: '',
    sortIndex: 40,
  },
  {
    id: 'col_ai_guoxue_daily',
    label: '国学面相 AI',
    description: '国学、面相等泛文化 AI 内容。',
    pluginCode: 'maoxiaoxian',
    workflowCode: 'maoxiaoxian.batch_guoxue',
    styleId: 'mx_guoxue_daily',
    source: 'ai',
    enqueueSource: '',
    sortIndex: 50,
  },
  {
    id: 'col_ai_writer',
    label: 'AI 写手',
    description: '其他 AI 生成内容（泛匹配）。',
    pluginCode: '',
    workflowCode: '',
    styleId: '',
    source: 'ai',
    enqueueSource: '',
    sortIndex: 60,
  },
  {
    id: 'col_manual',
    label: '手动投放',
    description: '人工撰写或临时插入的内容。',
    pluginCode: '',
    workflowCode: '',
    styleId: '',
    source: 'manual',
    enqueueSource: '',
    sortIndex: 70,
  },
  {
    id: 'col_imported',
    label: '导入内容',
    description: '外部批量导入的内容。',
    pluginCode: '',
    workflowCode: '',
    styleId: '',
    source: 'imported',
    enqueueSource: '',
    sortIndex: 80,
  },
];

function seedSourceColumns(sqlite: Database.Database, timestamp: string) {
  const upsert = sqlite.prepare(`
    INSERT INTO source_columns (
      id, label, description, pluginCode, workflowCode, styleId, source, enqueueSource,
      sortIndex, builtin, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      description = excluded.description,
      pluginCode = excluded.pluginCode,
      workflowCode = excluded.workflowCode,
      styleId = excluded.styleId,
      source = excluded.source,
      enqueueSource = excluded.enqueueSource,
      sortIndex = excluded.sortIndex,
      updatedAt = excluded.updatedAt
  `);
  for (const col of BUILTIN_SOURCE_COLUMNS) {
    upsert.run(
      col.id,
      col.label,
      col.description,
      col.pluginCode,
      col.workflowCode,
      col.styleId,
      col.source,
      col.enqueueSource,
      col.sortIndex,
      timestamp,
      timestamp,
    );
  }
}

export function inferSourceColumnId(legacy: {
  pluginCode?: string;
  workflowCode?: string;
  styleId?: string;
  source?: string;
  enqueueSource?: string;
}): string | null {
  const norm = {
    pluginCode: legacy.pluginCode ?? '',
    workflowCode: legacy.workflowCode ?? '',
    styleId: legacy.styleId ?? '',
    source: legacy.source ?? '',
    enqueueSource: legacy.enqueueSource ?? '',
  };
  let best: { id: string; score: number } | null = null;
  for (const col of BUILTIN_SOURCE_COLUMNS) {
    let score = 0;
    const fields: Array<[string, string]> = [
      [col.pluginCode, norm.pluginCode],
      [col.workflowCode, norm.workflowCode],
      [col.styleId, norm.styleId],
      [col.source, norm.source],
      [col.enqueueSource, norm.enqueueSource],
    ];
    let compatible = true;
    for (const [expected, actual] of fields) {
      if (!expected) continue; // column does not constrain this field
      if (expected === actual) {
        score += 1;
      } else {
        compatible = false;
        break;
      }
    }
    if (!compatible || score === 0) continue;
    // Weight styleId/workflowCode higher for specificity resolution.
    const weighted = score
      + (col.styleId && col.styleId === norm.styleId ? 2 : 0)
      + (col.workflowCode && col.workflowCode === norm.workflowCode ? 1 : 0);
    if (!best || weighted > best.score) {
      best = { id: col.id, score: weighted };
    }
  }
  return best?.id ?? null;
}

function firstRow(row: unknown): Record<string, unknown> {
  if (!row) {
    throw new Error('Expected database row was not found');
  }
  return row as Record<string, unknown>;
}

const maoxiaoxianWorkflowDefinition = {
  trigger: 'auto',
  frequency: '1/day',
  steps: [
    { id: 'step1', type: 'bazi_calc', birthDateKey: 'userBirth', outputKey: 'baziResult' },
    { id: 'step2', type: 'tophub_search', nodeId: 'KqndgxeLl9', outputKey: 'hotTopics' },
    { id: 'step3', type: 'llm', prompt: '结合命理结果 {{state.baziResult.summary}} 和今日热点 {{state.hotTopics[0]}}，写一篇治愈系微博文案。', inputKey: 'none', outputKey: 'finalContent' },
    { id: 'step4', type: 'image_gen', prompt: '一张充满意境的禅意背景图，适合微博配图', model: 'dall-e-3', outputKey: 'coverImage' },
  ],
};

function createMaoxiaoxianStyleWorkflow(styleId: string, prompt: string) {
  return {
    trigger: 'manual',
    frequency: 'manual',
    steps: [
      { id: 'fetch_hot_topics', type: 'tophub_search', nodeId: '3QeLwJEd7k', outputKey: 'hotTopics' },
      {
        id: 'generate_post',
        type: 'llm',
        prompt,
        inputKey: 'hotTopics',
        outputKey: 'final_post',
      },
      { id: 'persist_post', type: 'persist', dataKey: 'final_post', table: 'content_items' },
    ],
    settingsSchema: {
      topic: { type: 'string' },
      targetPersona: { type: 'string' },
      requirement: { type: 'string' },
      styleId: { type: 'string', default: styleId },
      reviewMode: { type: 'string', default: 'manual' },
    },
  };
}

const maoxiaoxianStyleWorkflows = [
  {
    code: 'maoxiaoxian.daily_hot_person',
    name: '热点人物命理解读',
    definition: createMaoxiaoxianStyleWorkflow(
      'mx_hot_bazi',
      '你是微博命理内容创作者。围绕选题 {{topic}} 和热点 {{state.hotTopics}}，写一条热点人物命理解读微博。要求：{{requirement}}。面向人群：{{targetPersona}}。避免绝对化断言，保留人工核验空间。',
    ),
  },
  {
    code: 'maoxiaoxian.manual_or_batch_topic',
    name: '治愈系情绪价值',
    definition: createMaoxiaoxianStyleWorkflow(
      'mx_healing_emotion',
      '你是治愈系微博博主。围绕选题 {{topic}}，结合热点 {{state.hotTopics}}，写一条温柔、轻盈、有情绪价值的微博。要求：{{requirement}}。面向人群：{{targetPersona}}。',
    ),
  },
  {
    code: 'maoxiaoxian.hot_commentary',
    name: '犀利热点点评',
    definition: createMaoxiaoxianStyleWorkflow(
      'mx_sharp_commentary',
      '你是观点型微博博主。围绕选题 {{topic}} 和热点 {{state.hotTopics}}，写一条有锋芒但不过度攻击的热点点评微博。要求：{{requirement}}。面向人群：{{targetPersona}}。',
    ),
  },
  {
    code: 'maoxiaoxian.batch_guoxue',
    name: '国学/面相泛内容',
    definition: createMaoxiaoxianStyleWorkflow(
      'mx_guoxue_daily',
      '你是国学泛内容微博博主。围绕选题 {{topic}}，结合热点 {{state.hotTopics}}，写一条适合日常发布的国学/面相泛内容微博。要求：{{requirement}}。面向人群：{{targetPersona}}。',
    ),
  },
];

function seedMaoxiaoxianPlugin(sqlite: Database.Database, timestamp: string) {
  sqlite.prepare(`
    INSERT INTO ai_plugins (code, name, description, configJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      configJson = excluded.configJson,
      updatedAt = excluded.updatedAt
  `).run(
    'maoxiaoxian',
    '猫小仙内容矩阵',
    '基于命理算法与实时热点的内容创作引擎',
    '{}',
    timestamp,
    timestamp,
  );

  sqlite.prepare(`
    INSERT INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(pluginCode, code) DO UPDATE SET
      name = excluded.name,
      definitionJson = excluded.definitionJson,
      updatedAt = excluded.updatedAt
  `).run(
    'maoxiaoxian',
    'maoxiaoxian.daily_topics',
    '每日治愈系话题生成',
    JSON.stringify(maoxiaoxianWorkflowDefinition),
    timestamp,
    timestamp,
  );

  const upsertWorkflow = sqlite.prepare(`
    INSERT INTO ai_workflows (pluginCode, code, name, definitionJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(pluginCode, code) DO UPDATE SET
      name = excluded.name,
      definitionJson = excluded.definitionJson,
      updatedAt = excluded.updatedAt
  `);

  for (const workflow of maoxiaoxianStyleWorkflows) {
    upsertWorkflow.run(
      'maoxiaoxian',
      workflow.code,
      workflow.name,
      JSON.stringify(workflow.definition),
      timestamp,
      timestamp,
    );
  }
}

function seedDefaultContentStyles(sqlite: Database.Database, timestamp: string) {
  const styles = [
    {
      id: 'mx_hot_bazi',
      name: '热点人物命理解读',
      workflowCode: 'maoxiaoxian.daily_hot_person',
      reviewPolicyJson: { mode: 'manual' },
      dispatchPolicyJson: { dailyLimit: 3, minIntervalMinutes: 90 },
    },
    {
      id: 'mx_healing_emotion',
      name: '治愈系情绪价值',
      workflowCode: 'maoxiaoxian.manual_or_batch_topic',
      reviewPolicyJson: { mode: 'auto', autoApproveWhenRiskBelow: 20 },
      dispatchPolicyJson: { dailyLimit: 6, minIntervalMinutes: 45 },
    },
    {
      id: 'mx_sharp_commentary',
      name: '犀利热点点评',
      workflowCode: 'maoxiaoxian.hot_commentary',
      reviewPolicyJson: { mode: 'manual' },
      dispatchPolicyJson: { dailyLimit: 2, minIntervalMinutes: 120 },
    },
    {
      id: 'mx_guoxue_daily',
      name: '国学/面相泛内容',
      workflowCode: 'maoxiaoxian.batch_guoxue',
      reviewPolicyJson: { mode: 'sample', sampleRate: 0.3 },
      dispatchPolicyJson: { dailyLimit: 8, minIntervalMinutes: 40 },
    },
  ];

  const upsert = sqlite.prepare(`
    INSERT INTO content_styles (
      id, tenantId, accountId, pluginCode, workflowCode, name, description, promptTemplateId,
      modelPolicyJson, reviewPolicyJson, dispatchPolicyJson, dedupePolicyJson, status, createdAt, updatedAt
    )
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      workflowCode = excluded.workflowCode,
      name = excluded.name,
      reviewPolicyJson = excluded.reviewPolicyJson,
      dispatchPolicyJson = excluded.dispatchPolicyJson,
      updatedAt = excluded.updatedAt
  `);

  for (const style of styles) {
    upsert.run(
      style.id,
      'tenant_default',
      'maoxiaoxian',
      style.workflowCode,
      style.name,
      '',
      `${style.id}.prompt`,
      '{}',
      JSON.stringify(style.reviewPolicyJson),
      JSON.stringify(style.dispatchPolicyJson),
      '{}',
      timestamp,
      timestamp,
    );
  }
}


export async function createDatabase(filename: string) {
  let db: AppDatabase;
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const sqlite = new Database(filename);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
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
    seedMaoxiaoxianPlugin(sqlite, nowTs);
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
    seedMaoxiaoxianPlugin(sqlite, now());
  });

  applyMigration('003_seed_maoxiaoxian_v2', () => {
    seedMaoxiaoxianPlugin(sqlite, now());
  });

  applyMigration('004_fix_workflow_runs_columns', () => {
    try {
      sqlite.prepare('ALTER TABLE ai_workflow_runs ADD COLUMN pluginCode TEXT NOT NULL DEFAULT ""').run();
    } catch (e) { }
    try {
      sqlite.prepare('ALTER TABLE ai_workflow_runs ADD COLUMN workflowCode TEXT NOT NULL DEFAULT ""').run();
    } catch (e) { }
  });

  applyMigration('005_review_rewrite_feedback', () => {
    try {
      sqlite.prepare("ALTER TABLE review_items ADD COLUMN rewriteError TEXT NOT NULL DEFAULT ''").run();
    } catch (e) { }
    try {
      sqlite.prepare("ALTER TABLE review_items ADD COLUMN rewrittenBody TEXT NOT NULL DEFAULT ''").run();
    } catch (e) { }
  });

  applyMigration('005_fix_accounts_columns', () => {
    try {
      sqlite.prepare('ALTER TABLE accounts ADD COLUMN activePluginCode TEXT NOT NULL DEFAULT ""').run();
    } catch (e) { }
    try {
      sqlite.prepare('ALTER TABLE accounts ADD COLUMN aiConfigJson TEXT NOT NULL DEFAULT "{}"').run();
    } catch (e) { }
  });

  applyMigration('006_ai_review_pipeline_schema', () => {
    const contentColumns = [
      ['tenantId', "TEXT NOT NULL DEFAULT ''"],
      ['accountId', 'INTEGER'],
      ['pluginCode', "TEXT NOT NULL DEFAULT ''"],
      ['styleId', "TEXT NOT NULL DEFAULT ''"],
      ['runId', "TEXT NOT NULL DEFAULT ''"],
      ['topicsJson', "TEXT NOT NULL DEFAULT '[]'"],
      ['mediaJson', "TEXT NOT NULL DEFAULT '[]'"],
      ['sourceJson', "TEXT NOT NULL DEFAULT '{}'"],
      ['riskJson', "TEXT NOT NULL DEFAULT '{}'"],
    ];
    for (const [name, definition] of contentColumns) {
      try {
        sqlite.prepare(`ALTER TABLE content_items ADD COLUMN ${name} ${definition}`).run();
      } catch (e) { }
    }
    seedDefaultContentStyles(sqlite, now());
  });

  applyMigration('007_hot_people_verify_birthday', () => {
    try {
      sqlite.prepare("ALTER TABLE hot_people ADD COLUMN verifyBirthday TEXT NOT NULL DEFAULT ''").run();
    } catch (e) { }
  });

  applyMigration('008_hot_bazi_tasks', () => {
    sqlite.exec(`
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
    `);
  });


  applyMigration('020_source_columns', () => {
    sqlite.exec(`
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
    `);
  });

  applyMigration('021_seed_source_columns', () => {
    seedSourceColumns(sqlite, now());
  });


  // ---------------------------------------------------------
  // 强力硬编码注入 (Brute Force Seed)
  // 确保无论迁移逻辑如何，数据在启动时必须存在
  // ---------------------------------------------------------
  const ts = now();
  seedMaoxiaoxianPlugin(sqlite, ts);
  seedDefaultContentStyles(sqlite, ts);
  sqlite.exec(`
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
  `);
  seedSourceColumns(sqlite, ts);

  // 强制补全 API Key 设置项
  upsertSetting('ai.dashscopeKey', process.env.DASH_SCOPE_API_KEY || 'sk-59063e5f9c6d4cdf9d7e1803fa18ae39', 'Aliyun DashScope API Key.');
  upsertSetting('ai.apiyiKey', process.env.API_YI_KEY || 'sk-w4r7SeqXczkv2ZBlFaC0Ab837fEa4a3c8266C33aF37dD1Ce', 'APIYi (Gemini/OpenAI) API Key.');

  function getWorkflowCodeForContent(content: ContentItem, style: ContentStyle | null): string {
    if (style?.workflowCode) {
      return style.workflowCode;
    }
    const workflowCode = content.sourceJson.workflowCode;
    return typeof workflowCode === 'string' ? workflowCode : '';
  }

  function buildDispatchPlan(
    workflowCode: string,
    scheduledAt: string,
    assignedReason: string,
  ) {
    return {
      workflowCode,
      scheduledAt,
      assignedReason,
      explanation: `通过统一调度引擎分配于 ${scheduledAt}`,
    };
  }

  function getNumberPolicyValue(policy: Record<string, unknown> | undefined, key: string): number | null {
    if (!policy || typeof policy !== 'object') return null;
    const val = policy[key];
    return typeof val === 'number' ? val : null;
  }

  function readContentStyle(content: ContentItem): ContentStyle | null {
    if (!content.styleId) return null;
    const row = sqlite.prepare('SELECT * FROM content_styles WHERE id = ?').get(content.styleId);
    return row ? mapContentStyle(row as Record<string, unknown>) : null;
  }

  function resolveDispatchPolicyValue(accountId: number, contentId: number, key: string): number | null {
    const contentRow = sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(contentId);
    const content = contentRow ? mapContentItem(contentRow as Record<string, unknown>) : null;
    if (content?.styleId) {
      const styleRow = sqlite.prepare('SELECT * FROM content_styles WHERE id = ?').get(content.styleId);
      if (styleRow) {
        const style = mapContentStyle(styleRow as Record<string, unknown>);
        const styleValue = getNumberPolicyValue(style.dispatchPolicyJson, key);
        if (styleValue !== null) {
          return styleValue;
        }
      }
    }

    const accountRow = sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    if (!accountRow) {
      return null;
    }
    const account = mapAccount(accountRow as Record<string, unknown>);
    const dispatchPolicy = account.aiConfigJson.dispatchPolicy;
    return dispatchPolicy && typeof dispatchPolicy === 'object'
      ? getNumberPolicyValue(dispatchPolicy as Record<string, unknown>, key)
      : null;
  }

  function getContentStyleForContent(contentId: number): ContentStyle | null {
    const contentRow = sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(contentId);
    const content = contentRow ? mapContentItem(contentRow as Record<string, unknown>) : null;
    if (!content?.styleId) {
      return null;
    }
    const styleRow = sqlite.prepare('SELECT * FROM content_styles WHERE id = ?').get(content.styleId);
    return styleRow ? mapContentStyle(styleRow as Record<string, unknown>) : null;
  }
  function assertStyleConsecutiveLimit(
    contentId: number,
    accountId: number,
    scheduledAt: string,
    status: DistributionTask['status'],
    excludeTaskId: number | null = null,
  ): void {
    if (status !== 'queued' && status !== 'publishing') {
      return;
    }
    const style = getContentStyleForContent(contentId);
    if (!style?.id) {
      return;
    }
    const maxConsecutive = getNumberPolicyValue(style.dispatchPolicyJson, 'maxConsecutivePerAccount');
    if (!maxConsecutive || maxConsecutive <= 0) {
      return;
    }
    const scheduledTime = new Date(scheduledAt).getTime();
    if (!Number.isFinite(scheduledTime)) {
      return;
    }

    const existingRows = select(`
      SELECT dt.id, dt.scheduledAt, ci.styleId
      FROM distribution_tasks dt
      JOIN content_items ci ON ci.id = dt.contentId
      WHERE dt.accountId = ?
        AND dt.status IN ('queued', 'publishing')
        AND (? IS NULL OR dt.id <> ?)
      ORDER BY dt.scheduledAt ASC, dt.id ASC
    `, [accountId, excludeTaskId, excludeTaskId]) as Array<{ id: number; scheduledAt: string; styleId: string }>;

    const timeline = [
      ...existingRows.map((row) => ({
        id: row.id,
        scheduledAt: row.scheduledAt,
        styleId: row.styleId,
        candidate: false,
      })),
      {
        id: Number.MAX_SAFE_INTEGER,
        scheduledAt,
        styleId: style.id,
        candidate: true,
      },
    ].sort((a, b) => {
      const timeDiff = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      return timeDiff || Number(a.candidate) - Number(b.candidate) || a.id - b.id;
    });

    const candidateIndex = timeline.findIndex((item) => item.candidate);
    if (candidateIndex < 0) {
      return;
    }
    let consecutiveCount = 1;
    for (let index = candidateIndex - 1; index >= 0 && timeline[index].styleId === style.id; index -= 1) {
      consecutiveCount += 1;
    }
    for (let index = candidateIndex + 1; index < timeline.length && timeline[index].styleId === style.id; index += 1) {
      consecutiveCount += 1;
    }
    if (consecutiveCount > maxConsecutive) {
      throw new Error('SCHEDULE_STYLE_CONSECUTIVE_LIMIT: account would exceed the configured consecutive style limit');
    }
  }

  function assertNoScheduleConflict(
    contentId: number,
    accountId: number,
    scheduledAt: string,
    status: DistributionTask['status'],
    excludeTaskId: number | null = null,
  ): void {
    if (status !== 'queued' && status !== 'publishing') {
      return;
    }

    const row = sqlite.prepare(`
      SELECT id FROM distribution_tasks
      WHERE accountId = ?
        AND scheduledAt = ?
        AND status IN ('queued', 'publishing')
        AND (? IS NULL OR id <> ?)
      LIMIT 1
    `).get(accountId, scheduledAt, excludeTaskId, excludeTaskId);

    if (row) {
      throw new Error('SCHEDULE_CONFLICT: account already has an active distribution task at this time');
    }

    assertStyleConsecutiveLimit(contentId, accountId, scheduledAt, status, excludeTaskId);

    const dailyLimit = resolveDispatchPolicyValue(accountId, contentId, 'dailyLimit');
    if (!dailyLimit || dailyLimit <= 0) {
      return;
    }
    const scheduledDate = new Date(scheduledAt);
    if (!Number.isFinite(scheduledDate.getTime())) {
      return;
    }
    const dayStart = new Date(scheduledDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const dailyRow = sqlite.prepare(`
      SELECT COUNT(*) AS count FROM distribution_tasks
      WHERE accountId = ?
        AND scheduledAt >= ?
        AND scheduledAt < ?
        AND status IN ('queued', 'publishing', 'published')
        AND (? IS NULL OR id <> ?)
    `).get(accountId, dayStart.toISOString(), dayEnd.toISOString(), excludeTaskId, excludeTaskId) as { count?: number } | undefined;

    if (Number(dailyRow?.count ?? 0) >= dailyLimit) {
      throw new Error('SCHEDULE_DAILY_LIMIT: account has reached the configured daily distribution limit');
    }
  }

  function enqueueContentForDispatch(contentId: number, source: string): DistributionTask | null {
    const existing = sqlite.prepare('SELECT * FROM distribution_tasks WHERE contentId = ? ORDER BY id ASC LIMIT 1').get(contentId);
    if (existing) {
      return mapDistributionTask(existing as Record<string, unknown>);
    }

    const content = mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(contentId)));
    if (!content.accountId) {
      return null;
    }

    const account = mapAccount(firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(content.accountId)));
    const style = readContentStyle(content);
    const workflowCode = getWorkflowCodeForContent(content, style);

    const schedulingEngine = new SchedulingEngine(db);
    const scheduledAt = schedulingEngine.allocateScheduledTime(workflowCode);
    
    const timestamp = now();
    const result = sqlite.prepare(`
      INSERT INTO distribution_tasks (contentId, accountId, platform, legacyPostId, scheduledAt, status, platformPayload, createdAt, updatedAt)
      VALUES (?, ?, ?, NULL, ?, 'queued', ?, ?, ?)
    `).run(
      content.id,
      content.accountId,
      account.platform,
      scheduledAt,
      JSON.stringify({
        content: content.body,
        mediaPaths: content.mediaJson,
        topics: content.topicsJson,
        source,
        dispatchPlan: buildDispatchPlan(workflowCode, scheduledAt, `auto-assigned from ${source}`),
        trace: {
          tenantId: content.tenantId,
          pluginCode: content.pluginCode,
          styleId: content.styleId,
          runId: content.runId,
        },
      }),
      timestamp,
      timestamp,
    );

    return mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(result.lastInsertRowid)));
  }
  db = {
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
    contentStyles: {
      listForAccount(accountId: number, pluginCode?: string): ContentStyle[] {
        const params: unknown[] = [accountId];
        const pluginFilter = pluginCode ? 'AND pluginCode = ?' : '';
        if (pluginCode) {
          params.push(pluginCode);
        }
        return select(`
          SELECT * FROM content_styles
          WHERE status = 'active'
            AND (accountId = ? OR accountId IS NULL)
            ${pluginFilter}
          ORDER BY
            CASE id
              WHEN 'mx_hot_bazi' THEN 1
              WHEN 'mx_healing_emotion' THEN 2
              WHEN 'mx_sharp_commentary' THEN 3
              WHEN 'mx_guoxue_daily' THEN 4
              ELSE 99
            END,
            name ASC
        `, params).map(mapContentStyle);
      },
      findById(id: string): ContentStyle | null {
        const row = sqlite.prepare('SELECT * FROM content_styles WHERE id = ?').get(id);
        return row ? mapContentStyle(row as Record<string, unknown>) : null;
      },
      create(input: CreateContentStyleInput): ContentStyle {
        const timestamp = now();
        const id = (input.id || `style_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`).trim();
        sqlite.prepare(`
          INSERT INTO content_styles (
            id, tenantId, accountId, pluginCode, workflowCode, name, description, promptTemplateId,
            modelPolicyJson, reviewPolicyJson, dispatchPolicyJson, dedupePolicyJson, status, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          input.tenantId ?? '',
          input.accountId ?? null,
          input.pluginCode,
          input.workflowCode,
          input.name,
          input.description ?? '',
          input.promptTemplateId ?? '',
          JSON.stringify(input.modelPolicyJson ?? {}),
          JSON.stringify(input.reviewPolicyJson ?? {}),
          JSON.stringify(input.dispatchPolicyJson ?? {}),
          JSON.stringify(input.dedupePolicyJson ?? {}),
          input.status ?? 'active',
          timestamp,
          timestamp,
        );
        const created = this.findById(id);
        if (!created) {
          throw new Error('Content style was not created.');
        }
        return created;
      },
      update(id: string, input: UpdateContentStyleInput): ContentStyle {
        const existing = this.findById(id);
        if (!existing) {
          throw new Error(`Content style ${id} not found.`);
        }
        sqlite.prepare(`
          UPDATE content_styles
          SET workflowCode = ?, name = ?, description = ?, promptTemplateId = ?,
              modelPolicyJson = ?, reviewPolicyJson = ?, dispatchPolicyJson = ?, dedupePolicyJson = ?,
              status = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          input.workflowCode ?? existing.workflowCode,
          input.name ?? existing.name,
          input.description ?? existing.description,
          input.promptTemplateId ?? existing.promptTemplateId,
          JSON.stringify(input.modelPolicyJson ?? existing.modelPolicyJson),
          JSON.stringify(input.reviewPolicyJson ?? existing.reviewPolicyJson),
          JSON.stringify(input.dispatchPolicyJson ?? existing.dispatchPolicyJson),
          JSON.stringify(input.dedupePolicyJson ?? existing.dedupePolicyJson),
          input.status ?? existing.status,
          now(),
          id,
        );
        const updated = this.findById(id);
        if (!updated) {
          throw new Error(`Content style ${id} not found after update.`);
        }
        return updated;
      },
      copyToAccounts(sourceStyleId: string, targetAccountIds: number[], nameSuffix = '副本'): ContentStyle[] {
        const source = this.findById(sourceStyleId);
        if (!source) {
          throw new Error(`Content style ${sourceStyleId} not found.`);
        }
        const uniqueTargetIds = Array.from(new Set(targetAccountIds.filter((id) => Number.isFinite(id) && id > 0)));
        const filteredTargetIds = uniqueTargetIds.filter((accountId) => accountId !== source.accountId);
        const suffix = nameSuffix.trim() || '副本';
        const created: ContentStyle[] = [];
        sqlite.transaction(() => {
          for (const accountId of filteredTargetIds) {
            const account = sqlite.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId);
            if (!account) {
              throw new Error(`Account ${accountId} not found.`);
            }
            created.push(this.create({
              tenantId: source.tenantId,
              accountId,
              pluginCode: source.pluginCode,
              workflowCode: source.workflowCode,
              name: `${source.name} ${suffix}`,
              description: source.description,
              promptTemplateId: source.promptTemplateId,
              modelPolicyJson: source.modelPolicyJson,
              reviewPolicyJson: source.reviewPolicyJson,
              dispatchPolicyJson: source.dispatchPolicyJson,
              dedupePolicyJson: source.dedupePolicyJson,
              status: 'active',
            }));
          }
        })();
        return created;
      },
      delete(id: string): boolean {
        const existing = this.findById(id);
        if (!existing) {
          return false;
        }
        const linkedContents = select(
          `SELECT id FROM content_items WHERE styleId = ? AND status NOT IN ('published', 'rejected')`,
          [id],
        );
        if (linkedContents.length > 0) {
          throw new Error(`风格「${existing.name}」仍有 ${linkedContents.length} 条活跃内容关联，请先处理后再删除。`);
        }
        sqlite.prepare('DELETE FROM content_styles WHERE id = ?').run(id);
        return !this.findById(id);
      },
    },
    sourceColumns: {
      list(): SourceColumn[] {
        return select('SELECT * FROM source_columns ORDER BY sortIndex ASC, id ASC').map(mapSourceColumn);
      },
      findById(id: string): SourceColumn | null {
        const row = sqlite.prepare('SELECT * FROM source_columns WHERE id = ?').get(id);
        return row ? mapSourceColumn(row as Record<string, unknown>) : null;
      },
    },
    contentItems: {
      create(input: CreateContentItemInput): ContentItem {
        const timestamp = now();
        const create = sqlite.transaction(() => {
          const result = sqlite.prepare(`
            INSERT INTO content_items (
              title, body, source, status, tenantId, accountId, pluginCode, styleId, runId,
              topicsJson, mediaJson, sourceJson, riskJson, createdAt, updatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            input.title,
            input.body,
            input.source,
            input.status,
            input.tenantId ?? '',
            input.accountId ?? null,
            input.pluginCode ?? '',
            input.styleId ?? '',
            input.runId ?? '',
            JSON.stringify(input.topicsJson ?? []),
            JSON.stringify(input.mediaJson ?? []),
            JSON.stringify(input.sourceJson ?? {}),
            JSON.stringify(input.riskJson ?? {}),
            timestamp,
            timestamp,
          );
          sqlite.prepare(`
            INSERT INTO content_versions (contentId, title, body, source, createdAt)
            VALUES (?, ?, ?, ?, ?)
          `).run(result.lastInsertRowid, input.title, input.body, input.source, timestamp);
          return result.lastInsertRowid;
        });
        const id = create();
        if (input.status === 'approved' && input.accountId) {
          enqueueContentForDispatch(Number(id), 'content_approved');
        }
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
    reviewItems: {
      create(input: CreateReviewItemInput): ReviewItem {
        const timestamp = now();
        firstRow(sqlite.prepare('SELECT id FROM content_items WHERE id = ?').get(input.contentId));
        const result = sqlite.prepare(`
          INSERT INTO review_items (contentId, reviewMode, status, comment, rewriteError, rewrittenBody, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, '', '', ?, ?)
        `).run(
          input.contentId,
          input.reviewMode,
          input.status,
          input.comment ?? '',
          timestamp,
          timestamp,
        );
        return mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(result.lastInsertRowid)));
      },
      listPending(): ReviewItem[] {
        return select(`
          SELECT * FROM review_items
          WHERE status IN ('pending', 'rewriting')
          ORDER BY createdAt ASC, id ASC
        `).map(mapReviewItem);
      },
      approve(id: number, reviewerId: string, comment = ''): ReviewItem {
        const timestamp = now();
        const approve = sqlite.transaction(() => {
          sqlite.prepare(`
            UPDATE review_items
            SET status = 'approved', reviewerId = ?, comment = ?, approvedAt = ?, updatedAt = ?
            WHERE id = ?
          `).run(reviewerId, comment, timestamp, timestamp, id);
          const review = mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
          sqlite.prepare(`
            UPDATE content_items
            SET status = 'approved', updatedAt = ?
            WHERE id = ?
          `).run(timestamp, review.contentId);
          enqueueContentForDispatch(review.contentId, 'review_approved');
        });
        approve();
        return mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
      },
      reject(id: number, reviewerId: string, comment = ''): ReviewItem {
        const timestamp = now();
        const reject = sqlite.transaction(() => {
          sqlite.prepare(`
            UPDATE review_items
            SET status = 'rejected', reviewerId = ?, comment = ?, updatedAt = ?
            WHERE id = ?
          `).run(reviewerId, comment, timestamp, id);
          const review = mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
          sqlite.prepare(`
            UPDATE content_items
            SET status = 'rejected', updatedAt = ?
            WHERE id = ?
          `).run(timestamp, review.contentId);
        });
        reject();
        return mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
      },
      requestRewrite(id: number, reviewerId: string, comment = ''): ReviewItem {
        const timestamp = now();
        const rewrite = sqlite.transaction(() => {
          sqlite.prepare(`
            UPDATE review_items
            SET status = 'rewriting', reviewerId = ?, comment = ?, rewriteError = '', updatedAt = ?
            WHERE id = ?
          `).run(reviewerId, comment, timestamp, id);
          const review = mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
          sqlite.prepare(`
            UPDATE content_items
            SET status = 'reviewing', updatedAt = ?
            WHERE id = ?
          `).run(timestamp, review.contentId);
        });
        rewrite();
        return mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
      },
      applyRewrite(id: number, reviewerId: string, comment: string, rewrittenBody: string): ReviewItem {
        const timestamp = now();
        const apply = sqlite.transaction(() => {
          const review = mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
          const content = mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(review.contentId)));
          sqlite.prepare(`
            UPDATE content_items
            SET body = ?, status = 'reviewing', updatedAt = ?
            WHERE id = ?
          `).run(rewrittenBody, timestamp, review.contentId);
          sqlite.prepare(`
            INSERT INTO content_versions (contentId, title, body, source, createdAt)
            VALUES (?, ?, ?, 'ai', ?)
          `).run(review.contentId, content.title, rewrittenBody, timestamp);
          sqlite.prepare(`
            UPDATE review_items
            SET status = 'pending', reviewerId = ?, comment = ?, rewriteError = '', rewrittenBody = ?, updatedAt = ?
            WHERE id = ?
          `).run(reviewerId, `AI rewrite generated from: ${comment}`, rewrittenBody, timestamp, id);
        });
        apply();
        return mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
      },
      setRewriteError(id: number, message: string): ReviewItem {
        sqlite.prepare(`
          UPDATE review_items
          SET rewriteError = ?, updatedAt = ?
          WHERE id = ?
        `).run(message, now(), id);
        return mapReviewItem(firstRow(sqlite.prepare('SELECT * FROM review_items WHERE id = ?').get(id)));
      },
    },
    distributionTasks: {
      enqueueContent(contentId: number, source = 'approved_content'): DistributionTask | null {
        return enqueueContentForDispatch(contentId, source);
      },
      assignScheduleForContent(contentId: number, source = 'manual_reassign', options: { nowIso?: string } = {}): DistributionTask {
        const content = mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(contentId)));
        if (!content.accountId) {
          throw new Error('SCHEDULE_ACCOUNT_REQUIRED: content has no account for dispatch scheduling');
        }
        const existingRow = sqlite.prepare('SELECT * FROM distribution_tasks WHERE contentId = ? ORDER BY id ASC LIMIT 1').get(contentId);
        if (existingRow) {
          const existing = mapDistributionTask(existingRow as Record<string, unknown>);
          return this.assignSchedule(existing.id, { nowIso: options.nowIso });
        }
        const account = mapAccount(firstRow(sqlite.prepare('SELECT * FROM accounts WHERE id = ?').get(content.accountId)));
        const style = readContentStyle(content);
        const workflowCode = getWorkflowCodeForContent(content, style);
        
        const schedulingEngine = new SchedulingEngine(db);
        const scheduledAt = schedulingEngine.allocateScheduledTime(workflowCode);
        
        const timestamp = now();
        const payload = {
          content: content.body,
          mediaPaths: content.mediaJson,
          topics: content.topicsJson,
          source,
          dispatchPlan: buildDispatchPlan(workflowCode, scheduledAt, `assigned from ${source}`),
          trace: {
            tenantId: content.tenantId,
            pluginCode: content.pluginCode,
            styleId: content.styleId,
            runId: content.runId,
          },
        };
        const result = sqlite.prepare(`
          INSERT INTO distribution_tasks (contentId, accountId, platform, legacyPostId, scheduledAt, status, platformPayload, createdAt, updatedAt)
          VALUES (?, ?, ?, NULL, ?, 'queued', ?, ?, ?)
        `).run(content.id, content.accountId, account.platform, scheduledAt, JSON.stringify(payload), timestamp, timestamp);
        return mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(result.lastInsertRowid)));
      },
      assignSchedule(id: number, options: { nowIso?: string } = {}): DistributionTask {
        const existing = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
        const content = mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(existing.contentId)));
        const style = readContentStyle(content);
        const workflowCode = getWorkflowCodeForContent(content, style);

        const schedulingEngine = new SchedulingEngine(db);
        const scheduledAt = schedulingEngine.allocateScheduledTime(workflowCode);

        const nextPayload = {
          ...existing.platformPayload,
          dispatchPlan: buildDispatchPlan(workflowCode, scheduledAt, `reassigned`),
        };
        const timestamp = now();
        sqlite.prepare(`
          UPDATE distribution_tasks
          SET scheduledAt = ?, status = 'queued', platformPayload = ?, lastError = '', updatedAt = ?
          WHERE id = ?
        `).run(scheduledAt, JSON.stringify(nextPayload), timestamp, id);
        if (existing.legacyPostId) {
          sqlite.prepare(`
            UPDATE posts
            SET scheduledAt = ?, status = 'queued', lastError = '', updatedAt = ?
            WHERE id = ?
          `).run(scheduledAt, timestamp, existing.legacyPostId);
        }
        return mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
      },
      assignScheduleMany(ids: number[], options: { nowIso?: string } = {}): DistributionTask[] {
        const assigned: DistributionTask[] = [];
        sqlite.transaction(() => {
          for (const id of ids) {
            assigned.push(this.assignSchedule(id, options));
          }
        })();
        return assigned;
      },
      ensureLegacyPost(taskId: number): Post {
        const timestamp = now();
        const create = sqlite.transaction(() => {
          const task = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(taskId)));
          if (task.legacyPostId) {
            return task.legacyPostId;
          }

          const content = mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(task.contentId)));
          const body = typeof task.platformPayload.content === 'string' && task.platformPayload.content.trim()
            ? task.platformPayload.content
            : content.body;
          const mediaPaths = readMediaPathsFromTask(content, task);
          const postResult = sqlite.prepare(`
            INSERT INTO posts (accountId, content, mediaPaths, scheduledAt, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'queued', ?, ?)
          `).run(
            task.accountId,
            body,
            JSON.stringify(mediaPaths),
            task.scheduledAt,
            timestamp,
            timestamp,
          );
          sqlite.prepare(`
            UPDATE distribution_tasks
            SET legacyPostId = ?, updatedAt = ?
            WHERE id = ?
          `).run(postResult.lastInsertRowid, timestamp, task.id);
          return postResult.lastInsertRowid;
        });
        const postId = create();
        return mapPost(firstRow(sqlite.prepare('SELECT * FROM posts WHERE id = ?').get(postId)));
      },
      create(input: CreateDistributionTaskInput): DistributionTask {
        const timestamp = now();
        const existingRow = sqlite.prepare(`
          SELECT * FROM distribution_tasks
          WHERE contentId = ? AND accountId = ?
          ORDER BY id ASC
          LIMIT 1
        `).get(input.contentId, input.accountId);
        if (existingRow) {
          const existing = mapDistributionTask(existingRow as Record<string, unknown>);
          sqlite.prepare(`
            UPDATE distribution_tasks
            SET platform = ?, legacyPostId = ?, scheduledAt = ?, status = ?, platformPayload = ?, lastError = '', updatedAt = ?
            WHERE id = ?
          `).run(
            input.platform,
            input.legacyPostId ?? existing.legacyPostId,
            input.scheduledAt,
            input.status,
            JSON.stringify(input.platformPayload),
            timestamp,
            existing.id,
          );
          return mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(existing.id)));
        }

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
          const content = mapContentItem(firstRow(sqlite.prepare('SELECT * FROM content_items WHERE id = ?').get(task.contentId)));
          const mediaPaths = readMediaPathsFromTask(content, task);
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
      returnToReview(id: number, comment = 'Returned to review'): DistributionTask {
        const timestamp = now();
        const message = `Returned to review: ${comment}`;
        const move = sqlite.transaction(() => {
          const task = mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
          sqlite.prepare(`
            UPDATE distribution_tasks
            SET status = 'failed', lastError = ?, updatedAt = ?
            WHERE id = ?
          `).run(message, timestamp, id);
          sqlite.prepare(`
            UPDATE content_items
            SET status = 'reviewing', updatedAt = ?
            WHERE id = ?
          `).run(timestamp, task.contentId);
          sqlite.prepare(`
            INSERT INTO review_items (contentId, reviewMode, status, comment, createdAt, updatedAt)
            SELECT ?, 'manual', 'pending', ?, ?, ?
            WHERE NOT EXISTS (
              SELECT 1 FROM review_items
              WHERE contentId = ? AND status = 'pending'
            )
          `).run(task.contentId, comment, timestamp, timestamp, task.contentId);
          if (task.legacyPostId) {
            sqlite.prepare(`
              UPDATE posts
              SET status = 'failed', lastError = ?, updatedAt = ?
              WHERE id = ?
            `).run(message, timestamp, task.legacyPostId);
          }
        });
        move();
        return mapDistributionTask(firstRow(sqlite.prepare('SELECT * FROM distribution_tasks WHERE id = ?').get(id)));
      },
      delete(id: number): boolean {
        sqlite.transaction(() => {
          const row = sqlite.prepare('SELECT legacyPostId FROM distribution_tasks WHERE id = ?').get(id) as { legacyPostId?: number | null } | undefined;
          sqlite.prepare('DELETE FROM publish_runs WHERE taskId = ?').run(id);
          sqlite.prepare('DELETE FROM distribution_tasks WHERE id = ?').run(id);
          if (row?.legacyPostId !== null && row?.legacyPostId !== undefined) {
            sqlite.prepare('DELETE FROM publish_logs WHERE postId = ?').run(Number(row.legacyPostId));
            sqlite.prepare('DELETE FROM posts WHERE id = ?').run(Number(row.legacyPostId));
          }
        })();
        return !sqlite.prepare('SELECT id FROM distribution_tasks WHERE id = ?').get(id);
      },
      deleteMany(ids: number[]): number {
        const remove = sqlite.transaction((taskIds: number[]) => {
          for (const id of taskIds) {
            this.delete(id);
          }
        });
        remove(ids);
        return ids.length;
      },
    },
    hotTopicsHistory: {
      buildIdentityKey(item: any): string {
        const platform = String(item.platform ?? '').trim().toLowerCase();
        const title = String(item.title ?? '').trim().toLowerCase();
        const url = String(item.url ?? item.mobilUrl ?? '').trim().toLowerCase();
        return [platform, title, url].join('||');
      },
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
            const result = insert.run(
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
            sqlite.prepare(`
              INSERT INTO hot_topic_analysis (hotTopicId, status, extractedNamesJson, retryCount, nextRetryAt, lastError, processedAt, createdAt, updatedAt)
              VALUES (?, 'pending', '[]', 0, '', '', '', ?, ?)
              ON CONFLICT(hotTopicId) DO NOTHING
            `).run(result.lastInsertRowid, timestamp, timestamp);
          }
        })();
      },
      saveIncremental(items: any[]): number {
        const previousItems = this.getLatest(1000);
        const previousKeys = new Set(previousItems.map((item: any) => this.buildIdentityKey(item)));
        const uniqueNewItems = items.filter((item: any) => !previousKeys.has(this.buildIdentityKey(item)));

        if (uniqueNewItems.length === 0) {
          return 0;
        }

        this.saveMany(uniqueNewItems);
        return uniqueNewItems.length;
      },
      getLatest(limit?: number): any[] {
        // 获取最近一次抓取的全部条目
        const lastTimestampRow = sqlite.prepare('SELECT createdAt FROM hot_topics_history ORDER BY createdAt DESC LIMIT 1').get() as { createdAt: string } | undefined;
        if (!lastTimestampRow) return [];

        if (typeof limit === 'number') {
          return select('SELECT * FROM hot_topics_history WHERE createdAt = ? ORDER BY rank ASC LIMIT ?', [lastTimestampRow.createdAt, limit]);
        }

        return select('SELECT * FROM hot_topics_history WHERE createdAt = ? ORDER BY rank ASC', [lastTimestampRow.createdAt]);
      },
      getLastFetchTime(): string | null {
        const row = sqlite.prepare('SELECT createdAt FROM hot_topics_history ORDER BY createdAt DESC LIMIT 1').get() as { createdAt: string } | undefined;
        return row ? row.createdAt : null;
      },
      deleteAll(): number {
        const clear = sqlite.transaction(() => {
          sqlite.prepare('DELETE FROM hot_topic_analysis').run();
          return sqlite.prepare('DELETE FROM hot_topics_history').run();
        });
        const result = clear();
        return Number(result.changes ?? 0);
      }
    },
    hotTopicAnalysis: {
      listPending(limit = 100): any[] {
        return select(`
          SELECT h.*, a.status AS analysisStatus, a.extractedNamesJson, a.processedAt, a.retryCount, a.nextRetryAt, a.lastError
          FROM hot_topics_history h
          INNER JOIN hot_topic_analysis a ON a.hotTopicId = h.id
          WHERE a.status IN ('pending', 'extracted')
          ORDER BY h.id DESC
          LIMIT ?
        `, [limit]);
      },
      markExtracted(hotTopicId: number, names: string[]): void {
        const timestamp = now();
        sqlite.prepare(`
          UPDATE hot_topic_analysis
          SET status = 'extracted', extractedNamesJson = ?, lastError = '', updatedAt = ?
          WHERE hotTopicId = ?
        `).run(JSON.stringify(names), timestamp, hotTopicId);
      },
      markProcessed(hotTopicId: number, names: string[]): void {
        const timestamp = now();
        sqlite.prepare(`
          UPDATE hot_topic_analysis
          SET status = 'completed', extractedNamesJson = ?, processedAt = ?, lastError = '', updatedAt = ?
          WHERE hotTopicId = ?
        `).run(JSON.stringify(names), timestamp, timestamp, hotTopicId);
      },
      markFailed(hotTopicId: number, message: string): void {
        const timestamp = now();
        sqlite.prepare(`
          UPDATE hot_topic_analysis
          SET status = 'failed', retryCount = retryCount + 1, nextRetryAt = '', lastError = ?, updatedAt = ?
          WHERE hotTopicId = ?
        `).run(message, timestamp, hotTopicId);
      },
      getQueueSummary() {
        const todayStr = new Date().toISOString().split('T')[0];
        const whereToday = `WHERE createdAt LIKE '${todayStr}%'`;

        const totalRow = sqlite.prepare(`SELECT COUNT(*) AS count FROM hot_topic_analysis ${whereToday}`).get() as { count: number };
        const pendingRow = sqlite.prepare(`
          SELECT COUNT(*) AS count
          FROM hot_topic_analysis
          ${whereToday} AND status IN ('pending', 'extracted')
        `).get() as { count: number };
        const completedRow = sqlite.prepare(`
          SELECT COUNT(*) AS count
          FROM hot_topic_analysis
          ${whereToday} AND status = 'completed'
        `).get() as { count: number };
        const failedRow = sqlite.prepare(`
          SELECT COUNT(*) AS count
          FROM hot_topic_analysis
          ${whereToday} AND status = 'failed'
        `).get() as { count: number };
        
        return {
          totalTopics: Number(totalRow?.count ?? 0),
          pendingTopics: Number(pendingRow?.count ?? 0),
          completedTopics: Number(completedRow?.count ?? 0),
          failedTopics: Number(failedRow?.count ?? 0),
          coolingFailedTopics: 0,
          nextRetryAt: '',
        };
      },
      listFailed(limit = 200) {
        return select(`
          SELECT h.*, a.status AS analysisStatus, a.retryCount, a.nextRetryAt, a.lastError
          FROM hot_topics_history h
          INNER JOIN hot_topic_analysis a ON a.hotTopicId = h.id
          WHERE a.status = 'failed'
          ORDER BY a.nextRetryAt ASC, h.id ASC
          LIMIT ?
        `, [limit]);
      },
      resetAll(): number {
        const timestamp = now();
        const result = sqlite.prepare(`
          UPDATE hot_topic_analysis
          SET status = 'pending',
              extractedNamesJson = '[]',
              retryCount = 0,
              nextRetryAt = '',
              lastError = '',
              processedAt = '',
              updatedAt = ?
        `).run(timestamp);
        return Number(result.changes ?? 0);
      },
      resetToday(): number {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const timestamp = now();
        const result = sqlite.prepare(`
          UPDATE hot_topic_analysis
          SET status = 'pending',
              extractedNamesJson = '[]',
              retryCount = 0,
              nextRetryAt = '',
              lastError = '',
              processedAt = '',
              updatedAt = ?
          WHERE hotTopicId IN (
            SELECT id
            FROM hot_topics_history
            WHERE createdAt >= ? AND createdAt < ?
          )
        `).run(timestamp, todayStart.toISOString(), tomorrowStart.toISOString());
        return Number(result.changes ?? 0);
      },
    },
    hotPeople: {
      upsert(input: UpsertHotPersonInput): HotPerson {
        const timestamp = now();
        const cleanBirthday = String(input.birthday ?? '').trim();
        const cleanName = String(input.name ?? '').trim();
        if (!cleanName) {
          throw new Error('HOT_PERSON_NAME_REQUIRED');
        }

        const existingRow = cleanBirthday
          ? sqlite.prepare('SELECT * FROM hot_people WHERE name = ? AND birthday = ? LIMIT 1').get(cleanName, cleanBirthday)
          : sqlite.prepare("SELECT * FROM hot_people WHERE name = ? ORDER BY CASE WHEN birthday = '' THEN 0 ELSE 1 END, updateTime DESC LIMIT 1").get(cleanName);

        if (existingRow) {
          const existing = mapHotPerson(existingRow as Record<string, unknown>);
          sqlite.prepare(`
            UPDATE hot_people
            SET gender = ?, birthday = ?, verifyBirthday = ?, bio = ?, constellation = ?, sizhu = ?, dayunInfo = ?, photoUrl = ?, promptText = ?,
                sourceTopicTitle = ?, sourcePlatform = ?, analysisStatus = ?, updateTime = ?
            WHERE id = ?
          `).run(
            input.gender ?? existing.gender,
            cleanBirthday || existing.birthday,
            input.verifyBirthday ?? existing.verifyBirthday,
            input.bio ?? existing.bio,
            input.constellation ?? existing.constellation,
            input.sizhu ?? existing.sizhu,
            input.dayunInfo ?? existing.dayunInfo,
            input.photoUrl ?? existing.photoUrl,
            input.promptText ?? existing.promptText,
            input.sourceTopicTitle ?? existing.sourceTopicTitle,
            input.sourcePlatform ?? existing.sourcePlatform,
            input.analysisStatus ?? existing.analysisStatus,
            timestamp,
            existing.id,
          );
          return mapHotPerson(firstRow(sqlite.prepare('SELECT * FROM hot_people WHERE id = ?').get(existing.id)));
        }

        const result = sqlite.prepare(`
          INSERT INTO hot_people (
            name, gender, birthday, verifyBirthday, bio, constellation, sizhu, dayunInfo, photoUrl, promptText,
            sourceTopicTitle, sourcePlatform, analysisStatus, updateTime, createTime
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          cleanName,
          input.gender ?? '',
          cleanBirthday,
          input.verifyBirthday ?? '',
          input.bio ?? '',
          input.constellation ?? '',
          input.sizhu ?? '',
          input.dayunInfo ?? '',
          input.photoUrl ?? '',
          input.promptText ?? '',
          input.sourceTopicTitle ?? '',
          input.sourcePlatform ?? '',
          input.analysisStatus ?? 'pending',
          timestamp,
          timestamp,
        );
        return mapHotPerson(firstRow(sqlite.prepare('SELECT * FROM hot_people WHERE id = ?').get(result.lastInsertRowid)));
      },
      list(limit = 200): HotPerson[] {
        return select('SELECT * FROM hot_people ORDER BY updateTime DESC, id DESC LIMIT ?', [limit]).map(mapHotPerson);
      },
      findById(id: number): HotPerson | null {
        const row = sqlite.prepare('SELECT * FROM hot_people WHERE id = ?').get(id);
        return row ? mapHotPerson(row as Record<string, unknown>) : null;
      },
      findByName(name: string): HotPerson | null {
        const row = sqlite.prepare('SELECT * FROM hot_people WHERE name = ? ORDER BY updateTime DESC LIMIT 1').get(name);
        return row ? mapHotPerson(row as Record<string, unknown>) : null;
      },
      deleteAll(): number {
        const result = sqlite.prepare('DELETE FROM hot_people').run();
        return Number(result.changes ?? 0);
      },
      deleteToday(): number {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const result = sqlite.prepare(`
          DELETE FROM hot_people
          WHERE createTime >= ? AND createTime < ?
        `).run(todayStart.toISOString(), tomorrowStart.toISOString());
        return Number(result.changes ?? 0);
      },
    },
    hotBaziTasks: {
      create(input: CreateHotBaziTaskInput): HotBaziTask {
        const timestamp = now();
        firstRow(sqlite.prepare('SELECT id FROM content_items WHERE id = ?').get(input.contentId));
        firstRow(sqlite.prepare('SELECT id FROM accounts WHERE id = ?').get(input.accountId));
        if (input.hotPersonId) {
          firstRow(sqlite.prepare('SELECT id FROM hot_people WHERE id = ?').get(input.hotPersonId));
        }
        const result = sqlite.prepare(`
          INSERT INTO hot_bazi_tasks (
            contentId, accountId, platform, hotPersonId, sourceTopic, scheduledAt, status,
            automationEnabled, intervalMinutes, scheduleRuleJson, mediaPathsJson, platformPayload, lastError, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
        `).run(
          input.contentId,
          input.accountId,
          input.platform,
          input.hotPersonId ?? null,
          input.sourceTopic ?? '',
          input.scheduledAt,
          input.status,
          input.automationEnabled ? 1 : 0,
          input.intervalMinutes ?? 60,
          JSON.stringify(input.scheduleRuleJson ?? {}),
          JSON.stringify(input.mediaPathsJson ?? []),
          JSON.stringify(input.platformPayload ?? {}),
          timestamp,
          timestamp,
        );
        return mapHotBaziTask(firstRow(sqlite.prepare('SELECT * FROM hot_bazi_tasks WHERE id = ?').get(result.lastInsertRowid)));
      },
      list(): HotBaziTask[] {
        return select('SELECT * FROM hot_bazi_tasks ORDER BY scheduledAt DESC, id DESC').map(mapHotBaziTask);
      },
      listByAccount(accountId: number): HotBaziTask[] {
        return select('SELECT * FROM hot_bazi_tasks WHERE accountId = ? ORDER BY scheduledAt DESC, id DESC', [accountId]).map(mapHotBaziTask);
      },
      findById(id: number): HotBaziTask | null {
        const row = sqlite.prepare('SELECT * FROM hot_bazi_tasks WHERE id = ?').get(id);
        return row ? mapHotBaziTask(row as Record<string, unknown>) : null;
      },
      update(id: number, input: UpdateHotBaziTaskInput): HotBaziTask {
        const existing = this.findById(id);
        if (!existing) {
          throw new Error(`Hot bazi task ${id} was not found`);
        }
        const timestamp = now();
        sqlite.prepare(`
          UPDATE hot_bazi_tasks
          SET scheduledAt = ?, status = ?, automationEnabled = ?, intervalMinutes = ?,
              scheduleRuleJson = ?, mediaPathsJson = ?, platformPayload = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          input.scheduledAt ?? existing.scheduledAt,
          input.status ?? existing.status,
          (input.automationEnabled ?? existing.automationEnabled) ? 1 : 0,
          input.intervalMinutes ?? existing.intervalMinutes,
          JSON.stringify(input.scheduleRuleJson ?? existing.scheduleRuleJson),
          JSON.stringify(input.mediaPathsJson ?? existing.mediaPathsJson),
          JSON.stringify(input.platformPayload ?? existing.platformPayload),
          timestamp,
          id,
        );
        return mapHotBaziTask(firstRow(sqlite.prepare('SELECT * FROM hot_bazi_tasks WHERE id = ?').get(id)));
      },
      delete(id: number): boolean {
        sqlite.prepare('DELETE FROM hot_bazi_tasks WHERE id = ?').run(id);
        return !this.findById(id);
      },
      deleteMany(ids: number[]): number {
        const remove = sqlite.transaction((taskIds: number[]) => {
          for (const id of taskIds) {
            sqlite.prepare('DELETE FROM hot_bazi_tasks WHERE id = ?').run(id);
          }
        });
        remove(ids);
        return ids.length;
      },
      enqueueToDistribution(id: number): DistributionTask {
        const task = this.findById(id);
        if (!task) {
          throw new Error(`Hot bazi task ${id} was not found`);
        }
        const distributionTask = enqueueContentForDispatch(task.contentId, 'hot_bazi_manual');
        if (!distributionTask) {
          throw new Error(`Hot bazi task ${id} could not be enqueued`);
        }
        sqlite.prepare(`
          UPDATE hot_bazi_tasks
          SET status = 'queued', updatedAt = ?
          WHERE id = ?
        `).run(now(), id);
        return distributionTask;
      },
      enqueueManyToDistribution(ids: number[]): DistributionTask[] {
        return ids.map((id) => this.enqueueToDistribution(id));
      },
    },
    publicFigureEvidence: {
      upsert(input: {
        name: string;
        title: string;
        summary: string;
        imageUrl: string;
        birthDate: string;
        gender: '' | '男' | '女';
        source: string;
      }) {
        const timestamp = now();
        const existing = sqlite.prepare('SELECT * FROM public_figure_evidence_cache WHERE name = ?').get(input.name);
        if (existing) {
          sqlite.prepare(`
            UPDATE public_figure_evidence_cache
            SET title = ?, summary = ?, imageUrl = ?, birthDate = ?, gender = ?, source = ?, updateTime = ?
            WHERE name = ?
          `).run(
            input.title,
            input.summary,
            input.imageUrl,
            input.birthDate,
            input.gender,
            input.source,
            timestamp,
            input.name,
          );
          return mapPublicFigureEvidence(firstRow(sqlite.prepare('SELECT * FROM public_figure_evidence_cache WHERE name = ?').get(input.name)));
        }

        const result = sqlite.prepare(`
          INSERT INTO public_figure_evidence_cache (
            name, title, summary, imageUrl, birthDate, gender, source, updateTime, createTime
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.name,
          input.title,
          input.summary,
          input.imageUrl,
          input.birthDate,
          input.gender,
          input.source,
          timestamp,
          timestamp,
        );
        return mapPublicFigureEvidence(firstRow(sqlite.prepare('SELECT * FROM public_figure_evidence_cache WHERE id = ?').get(result.lastInsertRowid)));
      },
      findByName(name: string) {
        const row = sqlite.prepare('SELECT * FROM public_figure_evidence_cache WHERE name = ?').get(name);
        return row ? mapPublicFigureEvidence(row as Record<string, unknown>) : null;
      },
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
    },
    publishingStrategies: {
      upsert(input: CreatePublishingStrategyInput): PublishingStrategy {
        const timestamp = now();
        const id = input.id || crypto.randomUUID();
        sqlite.prepare(`
          INSERT INTO publishing_strategies (id, workflowCode, name, maxDailyPosts, minIntervalMins, activeTimeRangesJson, jitterMins, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(workflowCode) DO UPDATE SET
            name = excluded.name,
            maxDailyPosts = excluded.maxDailyPosts,
            minIntervalMins = excluded.minIntervalMins,
            activeTimeRangesJson = excluded.activeTimeRangesJson,
            jitterMins = excluded.jitterMins,
            isActive = excluded.isActive,
            updatedAt = excluded.updatedAt
        `).run(
          id,
          input.workflowCode,
          input.name,
          input.maxDailyPosts ?? 3,
          input.minIntervalMins ?? 120,
          JSON.stringify(input.activeTimeRangesJson ?? []),
          input.jitterMins ?? 15,
          input.isActive === false ? 0 : 1,
          timestamp,
          timestamp
        );
        return mapPublishingStrategy(firstRow(sqlite.prepare('SELECT * FROM publishing_strategies WHERE workflowCode = ?').get(input.workflowCode)));
      },
      findByWorkflow(workflowCode: string): PublishingStrategy | null {
        const row = sqlite.prepare('SELECT * FROM publishing_strategies WHERE workflowCode = ?').get(workflowCode);
        return row ? mapPublishingStrategy(row as Record<string, unknown>) : null;
      },
      list(): PublishingStrategy[] {
        return select('SELECT * FROM publishing_strategies ORDER BY name ASC').map(mapPublishingStrategy);
      },
      delete(workflowCode: string) {
        sqlite.prepare('DELETE FROM publishing_strategies WHERE workflowCode = ?').run(workflowCode);
      }
    }
  };

  return db;
}

export interface AppDatabase {
  migrations: {
    list(): string[];
  };
  settings: {
    get(key: string): string | null;
    set(key: string, value: string, description?: string): void;
    list(): AppSetting[];
  };
  platforms: {
    list(): Platform[];
  };
  accounts: {
    create(input: CreateAccountInput): Account;
    list(): Account[];
    listByPlugin(pluginCode: string): Account[];
    findById(id: number): Account | null;
    update(id: number, input: UpdateAccountInput): Account;
    updateHealth(id: number, input: { status: Account['status']; healthMessage: string; manualActionReason?: string }): Account;
    delete(id: number): boolean;
  };
  posts: {
    create(input: CreatePostInput): Post;
    list(): Post[];
    findById(id: number): Post | null;
    listDue(nowIso: string): Post[];
    updateStatus(id: number, status: Post['status'], lastError?: string, screenshotPath?: string): void;
    delete(id: number): boolean;
  };
  contentStyles: {
    listForAccount(accountId: number, pluginCode?: string): ContentStyle[];
    findById(id: string): ContentStyle | null;
    create(input: CreateContentStyleInput): ContentStyle;
    update(id: string, input: UpdateContentStyleInput): ContentStyle;
    copyToAccounts(sourceStyleId: string, targetAccountIds: number[], nameSuffix?: string): ContentStyle[];
    delete(id: string): boolean;
  };
  sourceColumns: {
    list(): SourceColumn[];
    findById(id: string): SourceColumn | null;
  };
  contentItems: {
    create(input: CreateContentItemInput): ContentItem;
    list(): ContentItem[];
    findById(id: number): ContentItem | null;
    listVersions(contentId: number): ContentVersion[];
    update(id: number, input: UpdateContentItemInput): ContentItem;
    delete(id: number): boolean;
  };
  reviewItems: {
    create(input: CreateReviewItemInput): ReviewItem;
    listPending(): ReviewItem[];
    approve(id: number, reviewerId: string, comment?: string): ReviewItem;
    reject(id: number, reviewerId: string, comment?: string): ReviewItem;
    requestRewrite(id: number, reviewerId: string, comment?: string): ReviewItem;
    applyRewrite(id: number, reviewerId: string, comment: string, rewrittenBody: string): ReviewItem;
    setRewriteError(id: number, message: string): ReviewItem;
  };
  distributionTasks: {
    enqueueContent(contentId: number, source?: string): DistributionTask | null;
    assignScheduleForContent(contentId: number, source?: string, options?: { nowIso?: string }): DistributionTask;
    assignSchedule(id: number, options?: { nowIso?: string }): DistributionTask;
    assignScheduleMany(ids: number[], options?: { nowIso?: string }): DistributionTask[];
    ensureLegacyPost(taskId: number): Post;
    create(input: CreateDistributionTaskInput): DistributionTask;
    listDue(nowIso: string): DistributionTask[];
    list(): DistributionTask[];
    updateStatus(id: number, status: DistributionTask['status'], lastError?: string): void;
    update(id: number, input: UpdateDistributionTaskInput): DistributionTask;
    retry(id: number): DistributionTask;
    retryMany(ids: number[]): DistributionTask[];
    cancel(id: number): DistributionTask;
    cancelMany(ids: number[]): DistributionTask[];
    returnToReview(id: number, comment?: string): DistributionTask;
    delete(id: number): boolean;
    deleteMany(ids: number[]): number;
  };
  hotTopicsHistory: {
    buildIdentityKey(item: any): string;
    saveMany(items: any[]): void;
    saveIncremental(items: any[]): number;
    getLatest(limit?: number): any[];
    getLastFetchTime(): string | null;
    deleteAll(): number;
  };
  hotTopicAnalysis: {
    listPending(limit?: number): any[];
    markExtracted(hotTopicId: number, names: string[]): void;
    markProcessed(hotTopicId: number, names: string[]): void;
    markFailed(hotTopicId: number, message: string): void;
    getQueueSummary(): any;
    listFailed(limit?: number): any[];
    resetAll(): number;
    resetToday(): number;
  };
  hotPeople: {
    upsert(input: UpsertHotPersonInput): HotPerson;
    list(limit?: number): HotPerson[];
    findById(id: number): HotPerson | null;
    findByName(name: string): HotPerson | null;
    deleteAll(): number;
    deleteToday(): number;
  };
  hotBaziTasks: {
    create(input: CreateHotBaziTaskInput): HotBaziTask;
    list(): HotBaziTask[];
    listByAccount(accountId: number): HotBaziTask[];
    findById(id: number): HotBaziTask | null;
    update(id: number, input: UpdateHotBaziTaskInput): HotBaziTask;
    delete(id: number): boolean;
    deleteMany(ids: number[]): number;
    enqueueToDistribution(id: number): DistributionTask;
    enqueueManyToDistribution(ids: number[]): DistributionTask[];
  };
  publicFigureEvidence: {
    upsert(input: any): any;
    findByName(name: string): any | null;
  };
  publishRuns: {
    create(input: CreatePublishRunInput): PublishRun;
    listByTask(taskId: number): PublishRun[];
    list(): PublishRun[];
  };
  aiPlugins: {
    upsert(input: any): AiPlugin;
    list(): AiPlugin[];
    findByCode(code: string): AiPlugin | null;
  };
  aiWorkflows: {
    upsert(input: any): AiWorkflow;
    list(): AiWorkflow[];
    listByPlugin(pluginCode: string): AiWorkflow[];
    findByCode(pluginCode: string, code: string): AiWorkflow | null;
  };
  aiWorkflowRuns: {
    create(input: any): AiWorkflowRun;
    updateStatus(runId: string, status: AiWorkflowRunStatus, contextSnapshot: Record<string, unknown>, logs: any[], finishedAt?: string): AiWorkflowRun;
    findByRunId(runId: string): AiWorkflowRun | null;
    listByWorkflow(pluginCode: string, workflowCode: string): AiWorkflowRun[];
  };
  publishingStrategies: {
    upsert(input: CreatePublishingStrategyInput): PublishingStrategy;
    findByWorkflow(workflowCode: string): PublishingStrategy | null;
    list(): PublishingStrategy[];
    delete(workflowCode: string): void;
  };
}
