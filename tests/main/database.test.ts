import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../../src/main/db/database.js';
import { PersistTool } from '../../src/main/core/tools/PersistTool.js';
import { decideReviewPolicy } from '../../src/main/core/review/ReviewPolicy.js';
import { PublishScheduler } from '../../src/main/publisher/Scheduler.js';
import type { WorkflowContext } from '../../src/main/core/workflow/types.js';

describe('database repositories', () => {
  test('persists data through native sqlite without exporting the whole database', async () => {
    const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), '0worker-db-')), 'app.sqlite');
    const first = await createDatabase(filename);

    first.settings.set('scheduler.intervalMs', '60000');
    first.hotTopicsHistory.saveMany([
      { platform: '微博', title: '持久化热点', rank: 1, hotValue: '10w' },
    ]);

    const second = await createDatabase(filename);

    expect(second.settings.get('scheduler.intervalMs')).toBe('60000');
    expect(second.hotTopicsHistory.getLatest()).toEqual([
      expect.objectContaining({ title: '持久化热点' }),
    ]);
  });

  test('seeds enterprise defaults for platforms and settings', async () => {
    const db = await createDatabase(':memory:');

    expect(db.migrations.list()).toContain('001_initial_enterprise_schema');
    expect(db.platforms.list().map((platform) => platform.code)).toEqual([
      'wechat_official',
      'wechat_channels',
      'xiaohongshu',
      'douyin',
      'weibo',
    ]);
    expect(db.settings.get('scheduler.intervalMs')).toBe('30000');

    db.settings.set('scheduler.intervalMs', '45000');

    expect(db.settings.get('scheduler.intervalMs')).toBe('45000');
  });

  test('creates reusable content and distribution tasks for any platform account', async () => {
    const db = await createDatabase(':memory:');

    const account = db.accounts.create({
      name: 'demo xiaohongshu',
      platform: 'xiaohongshu',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9223,
      status: 'active',
      notes: 'test account',
    });
    const content = db.contentItems.create({
      title: 'May campaign',
      body: 'multi-platform content body',
      source: 'manual',
      status: 'draft',
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'xiaohongshu',
      scheduledAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
      status: 'queued',
      platformPayload: { title: 'May campaign', topics: ['launch'] },
    });
    const run = db.publishRuns.create({
      taskId: task.id,
      accountId: account.id,
      platform: 'xiaohongshu',
      status: 'failed',
      message: 'selector changed',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:00:03.000Z',
      screenshotPath: 'screenshots/run-1.png',
    });

    expect(content.id).toBeGreaterThan(0);
    expect(task.contentId).toBe(content.id);
    expect(task.platformPayload).toEqual({ title: 'May campaign', topics: ['launch'] });
    expect(db.distributionTasks.listDue('2026-05-01T10:00:01.000Z')).toHaveLength(1);
    expect(db.publishRuns.listByTask(task.id)[0]).toMatchObject({
      id: run.id,
      status: 'failed',
      message: 'selector changed',
    });
    expect(db.publishRuns.list()).toContainEqual(expect.objectContaining({
      id: run.id,
      taskId: task.id,
      platform: 'xiaohongshu',
    }));
  });

  test('seeds content styles and creates traceable AI review items', async () => {
    const db = await createDatabase(':memory:');

    const account = db.accounts.create({
      name: 'maoxiaoxian weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });

    const styles = db.contentStyles.listForAccount(account.id, 'maoxiaoxian');

    expect(styles.map((style) => style.name)).toEqual([
      '热点人物命理解读',
      '治愈系情绪价值',
      '犀利热点点评',
      '国学/面相泛内容',
    ]);

    const content = db.contentItems.create({
      title: '热点人物样稿',
      body: '这是一条需要审核的热点人物命理解读微博。',
      source: 'ai',
      status: 'reviewing',
      tenantId: 'tenant_default',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: styles[0].id,
      runId: 'run_test_001',
      topicsJson: ['热点人物', '猫小仙'],
      sourceJson: {
        person: { name: '测试人物', birthdayConfidence: 0.62 },
      },
      riskJson: {
        score: 38,
        flags: ['public_figure'],
      },
    });

    const review = db.reviewItems.create({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: '',
    });

    for (const style of styles) {
      expect(db.aiWorkflows.findByCode(style.pluginCode, style.workflowCode)).toEqual(expect.objectContaining({
        pluginCode: style.pluginCode,
        code: style.workflowCode,
      }));
    }

    const pending = db.reviewItems.listPending();
    const approved = db.reviewItems.approve(review.id, 'operator_001', '资料已核验');

    expect(content).toMatchObject({
      tenantId: 'tenant_default',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: styles[0].id,
      runId: 'run_test_001',
      topicsJson: ['热点人物', '猫小仙'],
      sourceJson: {
        person: { name: '测试人物', birthdayConfidence: 0.62 },
      },
      riskJson: {
        score: 38,
        flags: ['public_figure'],
      },
    });
    expect(pending).toContainEqual(expect.objectContaining({
      id: review.id,
      contentId: content.id,
      status: 'pending',
    }));
    expect(approved).toMatchObject({
      id: review.id,
      status: 'approved',
      reviewerId: 'operator_001',
      comment: '资料已核验',
    });
    expect(db.contentItems.findById(content.id)).toMatchObject({
      id: content.id,
      status: 'approved',
    });
  });

  test('creates and updates account scoped content styles', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'style owner',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });

    const created = db.contentStyles.create({
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      workflowCode: 'maoxiaoxian.daily_topics',
      name: '温柔治愈型',
      description: '用生活化语言生成温柔、有情绪价值的微博。',
      reviewPolicyJson: { mode: 'sample', sampleRate: 0.5 },
      dispatchPolicyJson: { inheritAccountPolicy: true },
    });
    const updated = db.contentStyles.update(created.id, {
      name: '温柔治愈型 v2',
      reviewPolicyJson: { mode: 'auto', autoApproveBelowRiskScore: 20 },
    });
    const listed = db.contentStyles.listForAccount(account.id, 'maoxiaoxian');

    expect(created).toMatchObject({
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      name: '温柔治愈型',
    });
    expect(updated).toMatchObject({
      id: created.id,
      name: '温柔治愈型 v2',
      reviewPolicyJson: { mode: 'auto', autoApproveBelowRiskScore: 20 },
    });
    expect(listed).toContainEqual(expect.objectContaining({
      id: created.id,
      name: '温柔治愈型 v2',
    }));
  });

  test('copies one content style to multiple target accounts and skips source account', async () => {
    const db = await createDatabase(':memory:');
    const sourceAccount = db.accounts.create({
      name: 'source account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const targetA = db.accounts.create({
      name: 'target a',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9223,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const targetB = db.accounts.create({
      name: 'target b',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9224,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const sourceStyle = db.contentStyles.create({
      accountId: sourceAccount.id,
      pluginCode: 'maoxiaoxian',
      workflowCode: 'maoxiaoxian.daily_topics',
      name: '矩阵热点锐评',
      description: '适合矩阵账号复用的热点评论风格。',
      modelPolicyJson: { provider: 'dashscope', model: 'qwen-plus' },
      reviewPolicyJson: { mode: 'manual' },
      dispatchPolicyJson: { dailyLimit: 2 },
      dedupePolicyJson: { topicWindowHours: 48 },
    });

    const copied = db.contentStyles.copyToAccounts(sourceStyle.id, [sourceAccount.id, targetA.id, targetB.id], '批量复用');

    expect(copied).toHaveLength(2);
    expect(copied.map((style) => style.accountId).sort()).toEqual([targetA.id, targetB.id].sort());
    expect(copied).toEqual(expect.arrayContaining([
      expect.objectContaining({
        pluginCode: sourceStyle.pluginCode,
        workflowCode: sourceStyle.workflowCode,
        name: '矩阵热点锐评 批量复用',
        modelPolicyJson: sourceStyle.modelPolicyJson,
        reviewPolicyJson: sourceStyle.reviewPolicyJson,
        dispatchPolicyJson: sourceStyle.dispatchPolicyJson,
        dedupePolicyJson: sourceStyle.dedupePolicyJson,
      }),
    ]));
    expect(db.contentStyles.listForAccount(sourceAccount.id, 'maoxiaoxian').filter((style) => style.name === '矩阵热点锐评 批量复用')).toHaveLength(0);
  });

  test('persists workflow generated content with account, style, and run trace', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'maoxiaoxian persisted account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const style = db.contentStyles.listForAccount(account.id, 'maoxiaoxian')[0];
    const tool = new PersistTool(db);
    const context: WorkflowContext = {
      runId: 'run_persist_001',
      workflowId: 'maoxiaoxian.noop_test',
      accountId: account.id,
      state: {
        final_post: 'This generated post should keep trace fields.',
        topic: 'traceable topic',
        styleId: style.id,
        pluginCode: 'maoxiaoxian',
        reviewMode: 'manual',
        sourceJson: { workflowCode: 'maoxiaoxian.noop_test' },
        riskJson: { score: 42, flags: ['needs_review'] },
      },
      logs: [],
      config: {},
    };

    await tool.execute(
      { id: 'persist_final', type: 'persist', dataKey: 'final_post', table: 'content_items' },
      context,
    );

    const [content] = db.contentItems.list();
    const pendingReviews = db.reviewItems.listPending();

    expect(content).toMatchObject({
      body: 'This generated post should keep trace fields.',
      source: 'ai',
      status: 'reviewing',
      tenantId: style.tenantId,
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: style.id,
      runId: 'run_persist_001',
      topicsJson: ['traceable topic'],
      sourceJson: { workflowCode: 'maoxiaoxian.noop_test' },
      riskJson: { score: 42, flags: ['needs_review'] },
    });
    expect(pendingReviews).toContainEqual(expect.objectContaining({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: 'Created by workflow persist step',
    }));
    expect(context.state.persistedContentId).toBe(content.id);
  });

  test('auto review policy approves low risk content without review item', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'maoxiaoxian auto account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const style = db.contentStyles.findById('mx_healing_emotion');
    if (!style) {
      throw new Error('Expected mx_healing_emotion style');
    }
    const tool = new PersistTool(db);
    const context: WorkflowContext = {
      runId: 'run_auto_low_risk',
      workflowId: style.workflowCode,
      accountId: account.id,
      state: {
        final_post: 'Low risk healing content can be approved by policy.',
        topic: 'healing topic',
        styleId: style.id,
        pluginCode: style.pluginCode,
        reviewMode: 'auto',
        riskJson: { score: 10, flags: [] },
      },
      logs: [],
      config: {},
    };

    await tool.execute(
      { id: 'persist_final', type: 'persist', dataKey: 'final_post', table: 'content_items' },
      context,
    );

    const [content] = db.contentItems.list();

    expect(content).toMatchObject({
      status: 'approved',
      styleId: 'mx_healing_emotion',
      riskJson: { score: 10, flags: [] },
    });
    expect(db.reviewItems.listPending()).toHaveLength(0);
    expect(db.distributionTasks.list()).toContainEqual(expect.objectContaining({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'queued',
    }));
  });

  test('auto review policy escalates high risk content into review pool', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'maoxiaoxian risk account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const style = db.contentStyles.findById('mx_healing_emotion');
    if (!style) {
      throw new Error('Expected mx_healing_emotion style');
    }
    const tool = new PersistTool(db);
    const context: WorkflowContext = {
      runId: 'run_auto_high_risk',
      workflowId: style.workflowCode,
      accountId: account.id,
      state: {
        final_post: 'High risk content should not bypass review.',
        topic: 'risk topic',
        styleId: style.id,
        pluginCode: style.pluginCode,
        reviewMode: 'auto',
        riskJson: { score: 80, flags: ['sensitive_claim'] },
      },
      logs: [],
      config: {},
    };

    await tool.execute(
      { id: 'persist_final', type: 'persist', dataKey: 'final_post', table: 'content_items' },
      context,
    );

    const [content] = db.contentItems.list();

    expect(content.status).toBe('reviewing');
    expect(db.reviewItems.listPending()).toContainEqual(expect.objectContaining({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: expect.stringContaining('risk'),
    }));
    expect(db.distributionTasks.list()).toHaveLength(0);
  });

  test('approved review item creates one dispatch task for the linked content', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'review dispatch account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const content = db.contentItems.create({
      title: 'Reviewed AI content',
      body: 'Approved content should move into dispatch once.',
      source: 'ai',
      status: 'reviewing',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_hot_bazi',
      topicsJson: ['dispatch'],
      mediaJson: [{ path: 'D:/media/a.png' }],
    });
    const review = db.reviewItems.create({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: 'needs check',
    });

    db.reviewItems.approve(review.id, 'operator_001', 'ok');
    db.reviewItems.approve(review.id, 'operator_001', 'ok again');

    expect(db.distributionTasks.list()).toEqual([
      expect.objectContaining({
        contentId: content.id,
        accountId: account.id,
        platform: 'weibo',
        status: 'queued',
        platformPayload: expect.objectContaining({
          content: content.body,
          source: 'review_approved',
        }),
      }),
    ]);
  });

  test('sample review policy is deterministic from run seed', () => {
    expect(decideReviewPolicy({
      requestedMode: 'sample',
      stylePolicy: { mode: 'sample', sampleRate: 1 },
      riskScore: 0,
      seed: 'always-sample',
    })).toMatchObject({
      contentStatus: 'reviewing',
      createReview: true,
      reviewMode: 'sample',
    });

    expect(decideReviewPolicy({
      requestedMode: 'sample',
      stylePolicy: { mode: 'sample', sampleRate: 0 },
      riskScore: 0,
      seed: 'never-sample',
    })).toMatchObject({
      contentStatus: 'approved',
      createReview: false,
      reviewMode: 'sample',
    });
  });

  test('approved content created from the UI enters the dispatch pool automatically', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'auto dispatch account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });

    const content = db.contentItems.create({
      title: 'Auto approved content',
      body: 'Auto approved body',
      source: 'ai',
      status: 'approved',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_healing_emotion',
      runId: 'ui_run_1',
    });

    expect(db.distributionTasks.list()).toContainEqual(expect.objectContaining({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'queued',
    }));
  });

  test('updates, retries, and cancels distribution tasks', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'task account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Task title',
      body: 'Task body',
      source: 'manual',
      status: 'ready',
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Task body' },
    });

    const updated = db.distributionTasks.update(task.id, {
      scheduledAt: '2026-05-01T12:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Task body updated' },
    });
    const retried = db.distributionTasks.retry(task.id);
    const cancelled = db.distributionTasks.cancel(task.id);

    expect(updated).toMatchObject({
      id: task.id,
      scheduledAt: '2026-05-01T12:00:00.000Z',
      status: 'queued',
    });
    expect(retried.status).toBe('queued');
    expect(cancelled.status).toBe('failed');
    expect(cancelled.lastError).toBe('Cancelled by operator');
  });

  test('rejects conflicting queued distribution tasks for the same account and time', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'conflict account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const firstContent = db.contentItems.create({
      title: 'First conflict content',
      body: 'First body',
      source: 'manual',
      status: 'ready',
    });
    const secondContent = db.contentItems.create({
      title: 'Second conflict content',
      body: 'Second body',
      source: 'manual',
      status: 'ready',
    });

    db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'First body' },
    });

    expect(() => db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Second body' },
    })).toThrow('SCHEDULE_CONFLICT');
  });

  test('rejects updates that move queued distribution tasks onto a same-account conflict', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'update conflict account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const firstContent = db.contentItems.create({
      title: 'First update conflict',
      body: 'First body',
      source: 'manual',
      status: 'ready',
    });
    const secondContent = db.contentItems.create({
      title: 'Second update conflict',
      body: 'Second body',
      source: 'manual',
      status: 'ready',
    });
    db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'First body' },
    });
    const secondTask = db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Second body' },
    });

    expect(() => db.distributionTasks.update(secondTask.id, {
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Second body updated' },
    })).toThrow('SCHEDULE_CONFLICT');
  });

  test('rejects queued distribution tasks inside the same account minimum interval', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'interval account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      aiConfigJson: {
        dispatchPolicy: {
          minIntervalMinutes: 30,
        },
      },
    });
    const firstContent = db.contentItems.create({
      title: 'First interval content',
      body: 'First body',
      source: 'manual',
      status: 'ready',
    });
    const secondContent = db.contentItems.create({
      title: 'Second interval content',
      body: 'Second body',
      source: 'manual',
      status: 'ready',
    });
    db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'First body' },
    });

    expect(() => db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:20:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Second body' },
    })).toThrow('SCHEDULE_INTERVAL_CONFLICT');
  });

  test('rejects queued distribution tasks beyond the same account daily limit', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'daily limit account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      aiConfigJson: {
        dispatchPolicy: {
          dailyLimit: 1,
        },
      },
    });
    const firstContent = db.contentItems.create({
      title: 'First daily content',
      body: 'First body',
      source: 'manual',
      status: 'ready',
    });
    const secondContent = db.contentItems.create({
      title: 'Second daily content',
      body: 'Second body',
      source: 'manual',
      status: 'ready',
    });
    db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'First body' },
    });

    expect(() => db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T18:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Second body' },
    })).toThrow('SCHEDULE_DAILY_LIMIT');
  });

  test('rejects consecutive queued tasks for the same style when style policy limits repetition', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'style repetition account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const limitedStyle = db.contentStyles.create({
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      workflowCode: 'maoxiaoxian.daily_topics',
      name: '限连风格',
      description: '同账号不允许连续排两条。',
      dispatchPolicyJson: { maxConsecutivePerAccount: 1 },
    });
    const otherStyle = db.contentStyles.create({
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      workflowCode: 'maoxiaoxian.daily_topics',
      name: '穿插风格',
      description: '用于打断连续风格。',
    });
    const firstContent = db.contentItems.create({
      title: 'first limited',
      body: 'first limited body',
      source: 'ai',
      status: 'ready',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: limitedStyle.id,
    });
    const secondContent = db.contentItems.create({
      title: 'second limited',
      body: 'second limited body',
      source: 'ai',
      status: 'ready',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: limitedStyle.id,
    });
    const otherContent = db.contentItems.create({
      title: 'other style',
      body: 'other style body',
      source: 'ai',
      status: 'ready',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: otherStyle.id,
    });

    db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T09:00:00.000Z',
      status: 'queued',
      platformPayload: { content: firstContent.body },
    });

    expect(() => db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: secondContent.body },
    })).toThrow('SCHEDULE_STYLE_CONSECUTIVE_LIMIT');

    db.distributionTasks.create({
      contentId: otherContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: otherContent.body },
    });

    expect(db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'queued',
      platformPayload: { content: secondContent.body },
    })).toMatchObject({
      contentId: secondContent.id,
      accountId: account.id,
      status: 'queued',
    });
  });

  test('deletes distribution tasks together with linked publish runs and legacy posts', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'delete task account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Delete me',
      body: 'Delete task body',
      source: 'manual',
      status: 'ready',
      accountId: account.id,
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Delete task body' },
    });
    const post = db.distributionTasks.ensureLegacyPost(task.id);
    db.publishRuns.create({
      taskId: task.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'Queued for delete test',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:01:00.000Z',
      screenshotPath: '',
    });

    expect(db.posts.findById(post.id)).toBeTruthy();
    expect(db.publishRuns.listByTask(task.id)).toHaveLength(1);

    expect(db.distributionTasks.delete(task.id)).toBe(true);
    expect(db.distributionTasks.list()).toHaveLength(0);
    expect(db.posts.findById(post.id)).toBeNull();
    expect(db.publishRuns.listByTask(task.id)).toHaveLength(0);
  });

  test('scheduler processes due distribution tasks and records manual action failures', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'paused publish account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'paused',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Due AI task',
      body: 'This due task should be handled by the scheduler.',
      source: 'ai',
      status: 'approved',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_healing_emotion',
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-01-01T00:00:00.000Z',
      status: 'queued',
      platformPayload: { content: content.body, source: 'test' },
    });
    const scheduler = new PublishScheduler(db);

    const status = await scheduler.runOnce('2026-01-01T00:00:01.000Z');

    expect(status.lastMessage).toContain('Processed 1 due distribution task');
    expect(db.distributionTasks.list()).toContainEqual(expect.objectContaining({
      id: task.id,
      status: 'needs_manual_action',
      lastError: 'Account is not active',
    }));
    expect(db.publishRuns.listByTask(task.id)).toContainEqual(expect.objectContaining({
      taskId: task.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'needs_manual_action',
      message: 'Account is not active',
    }));
  });

  test('scheduler adapts AI distribution tasks into one legacy post before publishing', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'active manual account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'AI content ready for publish',
      body: 'AI generated body should become a publish draft.',
      source: 'ai',
      status: 'approved',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_healing_emotion',
      mediaJson: [{ path: 'D:/media/ai.png' }],
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-01-01T00:00:00.000Z',
      status: 'queued',
      platformPayload: { content: content.body, mediaPaths: ['D:/media/ai.png'], source: 'test' },
    });
    const scheduler = new PublishScheduler(db);

    await scheduler.runOnce('2026-01-01T00:00:01.000Z');

    const [updatedTask] = db.distributionTasks.list();
    const [post] = db.posts.list();

    expect(db.distributionTasks.list()).toHaveLength(1);
    expect(updatedTask).toMatchObject({
      id: task.id,
      legacyPostId: post.id,
      status: 'failed',
      lastError: 'Publish now currently supports AdsPower accounts only',
    });
    expect(post).toMatchObject({
      accountId: account.id,
      content: content.body,
      mediaPaths: ['D:/media/ai.png'],
      status: 'queued',
    });
    expect(db.publishRuns.listByTask(task.id)).toContainEqual(expect.objectContaining({
      taskId: task.id,
      status: 'failed',
      message: 'Publish now currently supports AdsPower accounts only',
    }));
  });

  test('updates task account and content while keeping legacy posts in sync', async () => {
    const db = await createDatabase(':memory:');
    const firstAccount = db.accounts.create({
      name: 'first weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const secondAccount = db.accounts.create({
      name: 'second weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9223,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Replacement title',
      body: 'Replacement body',
      source: 'manual',
      status: 'ready',
    });
    const post = db.posts.create({
      accountId: firstAccount.id,
      content: 'Original body',
      mediaPaths: ['D:/media/original.png'],
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
    });
    const task = db.distributionTasks.list().find((item) => item.legacyPostId === post.id);

    expect(task).toBeTruthy();

    const updated = db.distributionTasks.update(task!.id, {
      contentId: content.id,
      accountId: secondAccount.id,
      scheduledAt: '2026-05-01T12:00:00.000Z',
      status: 'queued',
      platformPayload: {
        content: content.body,
        mediaPaths: ['D:/media/replacement.png'],
      },
    });
    const syncedPost = db.posts.findById(post.id);

    expect(updated).toMatchObject({
      id: task!.id,
      contentId: content.id,
      accountId: secondAccount.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T12:00:00.000Z',
      status: 'queued',
    });
    expect(syncedPost).toMatchObject({
      id: post.id,
      accountId: secondAccount.id,
      content: 'Replacement body',
      mediaPaths: ['D:/media/replacement.png'],
      scheduledAt: '2026-05-01T12:00:00.000Z',
      status: 'queued',
      lastError: '',
    });
  });

  test('retries and cancels tasks in bulk', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'bulk account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Bulk title',
      body: 'Bulk body',
      source: 'manual',
      status: 'ready',
    });
    const first = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Bulk body' },
    });
    const second = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'needs_manual_action',
      platformPayload: { content: 'Bulk body 2' },
    });

    const retried = db.distributionTasks.retryMany([first.id, second.id]);
    const cancelled = db.distributionTasks.cancelMany([first.id, second.id]);

    expect(retried.map((task) => task.status)).toEqual(['queued', 'queued']);
    expect(cancelled.map((task) => task.lastError)).toEqual(['Cancelled by operator', 'Cancelled by operator']);
  });

  test('deletes tasks in bulk together with linked legacy posts and publish runs', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'bulk delete account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const firstContent = db.contentItems.create({
      title: 'Bulk delete 1',
      body: 'Bulk delete body 1',
      source: 'manual',
      status: 'ready',
      accountId: account.id,
    });
    const secondContent = db.contentItems.create({
      title: 'Bulk delete 2',
      body: 'Bulk delete body 2',
      source: 'manual',
      status: 'ready',
      accountId: account.id,
    });
    const first = db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Bulk delete body 1' },
    });
    const second = db.distributionTasks.create({
      contentId: secondContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Bulk delete body 2' },
    });
    const firstPost = db.distributionTasks.ensureLegacyPost(first.id);
    const secondPost = db.distributionTasks.ensureLegacyPost(second.id);
    db.publishRuns.create({
      taskId: first.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'Bulk delete first',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:01:00.000Z',
      screenshotPath: '',
    });
    db.publishRuns.create({
      taskId: second.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'Bulk delete second',
      startedAt: '2026-05-01T11:00:00.000Z',
      finishedAt: '2026-05-01T11:01:00.000Z',
      screenshotPath: '',
    });

    expect(db.distributionTasks.deleteMany([first.id, second.id])).toBe(2);
    expect(db.distributionTasks.list()).toHaveLength(0);
    expect(db.posts.findById(firstPost.id)).toBeNull();
    expect(db.posts.findById(secondPost.id)).toBeNull();
    expect(db.publishRuns.listByTask(first.id)).toHaveLength(0);
    expect(db.publishRuns.listByTask(second.id)).toHaveLength(0);
  });

  test('updates and deletes content items', async () => {
    const db = await createDatabase(':memory:');
    const content = db.contentItems.create({
      title: 'Draft title',
      body: 'Draft body',
      source: 'manual',
      status: 'draft',
    });

    const updated = db.contentItems.update(content.id, {
      title: 'Ready title',
      body: 'Ready body',
      status: 'ready',
    });

    expect(updated).toMatchObject({
      id: content.id,
      title: 'Ready title',
      body: 'Ready body',
      status: 'ready',
    });
    expect(db.contentItems.delete(content.id)).toBe(true);
    expect(db.contentItems.findById(content.id)).toBeNull();
  });

  test('deletes content items after they have queued tasks and run history', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'content delete account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Queued title',
      body: 'Queued body',
      source: 'manual',
      status: 'ready',
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Queued body' },
    });
    db.publishRuns.create({
      taskId: task.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'queued content failed once',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:00:01.000Z',
      screenshotPath: '',
    });

    expect(db.contentItems.delete(content.id)).toBe(true);
    expect(db.contentItems.findById(content.id)).toBeNull();
    expect(db.distributionTasks.list()).not.toContainEqual(expect.objectContaining({ id: task.id }));
    expect(db.publishRuns.list()).not.toContainEqual(expect.objectContaining({ taskId: task.id }));
  });

  test('keeps version history for content revisions', async () => {
    const db = await createDatabase(':memory:');
    const content = db.contentItems.create({
      title: 'Versioned draft',
      body: 'Initial body',
      source: 'manual',
      status: 'draft',
    });

    db.contentItems.update(content.id, {
      title: 'Versioned ready',
      body: 'Edited body',
      status: 'ready',
    });

    expect(db.contentItems.listVersions(content.id)).toEqual([
      expect.objectContaining({
        contentId: content.id,
        title: 'Versioned ready',
        body: 'Edited body',
        source: 'manual',
      }),
      expect.objectContaining({
        contentId: content.id,
        title: 'Versioned draft',
        body: 'Initial body',
        source: 'manual',
      }),
    ]);
  });

  test('creates an account and a queued post', async () => {
    const db = await createDatabase(':memory:');

    const account = db.accounts.create({
      name: 'demo weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
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
    expect(db.contentItems.list()).toContainEqual(expect.objectContaining({
      body: 'hello from mvp',
      source: 'manual',
    }));
    expect(db.distributionTasks.list()).toContainEqual(expect.objectContaining({
      accountId: account.id,
      platform: 'weibo',
      status: 'queued',
    }));
  });

  test('updates account status and connection details', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'team account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: 'initial',
    });

    const updated = db.accounts.update(account.id, {
      name: 'team account A',
      browserMode: 'manual_ws',
      providerProfileId: 'profile-1',
      wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/demo',
      debuggingPort: null,
      status: 'needs_manual_action',
      notes: 'captcha required',
    });

    expect(updated).toMatchObject({
      id: account.id,
      name: 'team account A',
      browserMode: 'manual_ws',
      providerProfileId: 'profile-1',
      wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/demo',
      debuggingPort: null,
      status: 'needs_manual_action',
      notes: 'captcha required',
    });
  });

  test('updates account health state for manual follow-up', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'health account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });

    const updated = db.accounts.updateHealth(account.id, {
      status: 'needs_manual_action',
      healthMessage: 'Captcha was detected during publish',
      manualActionReason: 'Manual captcha resolution required',
    });

    expect(updated).toMatchObject({
      id: account.id,
      status: 'needs_manual_action',
      healthMessage: 'Captcha was detected during publish',
      manualActionReason: 'Manual captcha resolution required',
    });
    expect(updated.lastCheckedAt).not.toBe('');
  });

  test('deletes accounts with post-linked tasks and run history', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'delete account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const otherAccount = db.accounts.create({
      name: 'other account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9223,
      status: 'active',
      notes: '',
    });
    const post = db.posts.create({
      accountId: account.id,
      content: 'delete account post',
      mediaPaths: [],
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
    });
    const content = db.contentItems.create({
      title: 'cross linked title',
      body: 'cross linked body',
      source: 'manual',
      status: 'ready',
    });
    const task = db.distributionTasks.list().find((item) => item.legacyPostId === post.id);
    if (!task) {
      throw new Error('Expected task linked to the post');
    }
    const crossLinkedTask = db.distributionTasks.create({
      contentId: content.id,
      accountId: otherAccount.id,
      platform: 'weibo',
      legacyPostId: post.id,
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'cross linked body' },
    });
    db.publishRuns.create({
      taskId: task.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'delete account run',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:00:01.000Z',
      screenshotPath: '',
    });
    db.publishRuns.create({
      taskId: crossLinkedTask.id,
      accountId: otherAccount.id,
      platform: 'weibo',
      status: 'failed',
      message: 'cross linked run',
      startedAt: '2026-05-01T11:00:00.000Z',
      finishedAt: '2026-05-01T11:00:01.000Z',
      screenshotPath: '',
    });

    expect(db.accounts.delete(account.id)).toBe(true);
    expect(db.accounts.findById(account.id)).toBeNull();
    expect(db.accounts.findById(otherAccount.id)).not.toBeNull();
    expect(db.posts.findById(post.id)).toBeNull();
    expect(db.distributionTasks.list()).not.toContainEqual(expect.objectContaining({ id: task.id }));
    expect(db.distributionTasks.list()).not.toContainEqual(expect.objectContaining({ id: crossLinkedTask.id }));
    expect(db.publishRuns.list()).not.toContainEqual(expect.objectContaining({ taskId: task.id }));
    expect(db.publishRuns.list()).not.toContainEqual(expect.objectContaining({ taskId: crossLinkedTask.id }));
  });

  test('deletes a post', async () => {
    const db = await createDatabase(':memory:');

    const account = db.accounts.create({
      name: 'demo weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: 'test account',
    });
    const post = db.posts.create({
      accountId: account.id,
      content: 'delete me',
      mediaPaths: [],
      scheduledAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
      status: 'queued',
    });

    expect(db.posts.delete(post.id)).toBe(true);
    expect(db.posts.findById(post.id)).toBeNull();
    expect(db.posts.list()).toHaveLength(0);
  });

  test('stores and refreshes hot people records in the local database', async () => {
    const db = await createDatabase(':memory:');

    const created = db.hotPeople.upsert({
      name: '何炅',
      gender: '男',
      birthday: '1974年4月28日',
      bio: '何炅，中国顶级电视综艺主持人。1998年起主持湖南卫视《快乐大本营》长达二十余年，奠定其国民MC地位。',
      constellation: '金牛座',
      sizhu: '甲寅 戊辰 丙子',
      dayunInfo: '8岁起运，顺行大运。',
      photoUrl: 'https://example.com/hejiong.jpg',
      promptText: '中国知名综艺主持人，代表作《快乐大本营》，主持风格亲和稳定。',
      sourceTopicTitle: '何炅回应近期综艺话题',
      sourcePlatform: '微博',
      analysisStatus: 'completed',
    });

    const refreshed = db.hotPeople.upsert({
      name: '何炅',
      gender: '男',
      birthday: '1974年4月28日',
      bio: '何炅，中国电视综艺主持人、教师、演员。长期主持国民综艺节目，兼具稳定控场和大众影响力。',
      constellation: '金牛座',
      sizhu: '甲寅 戊辰 丙子',
      dayunInfo: '8岁起运，顺行大运。',
      photoUrl: 'https://example.com/hejiong-v2.jpg',
      promptText: '何炅，主持人、教师、演员，国民级综艺MC。',
      sourceTopicTitle: '何炅综艺发言再上热搜',
      sourcePlatform: '微博',
      analysisStatus: 'completed',
    });

    const listed = db.hotPeople.list();
    const found = db.hotPeople.findByName('何炅');

    expect(created.name).toBe('何炅');
    expect(refreshed.id).toBe(created.id);
    expect(listed).toHaveLength(1);
    expect(found).toMatchObject({
      id: created.id,
      name: '何炅',
      bio: '何炅，中国电视综艺主持人、教师、演员。长期主持国民综艺节目，兼具稳定控场和大众影响力。',
      photoUrl: 'https://example.com/hejiong-v2.jpg',
      sourceTopicTitle: '何炅综艺发言再上热搜',
      analysisStatus: 'completed',
    });
  });

  test('does not duplicate completed hot people when the same person appears in later topics', async () => {
    const db = await createDatabase(':memory:');

    db.hotPeople.upsert({
      name: '何炅',
      gender: '男',
      birthday: '1974年4月28日',
      bio: '何炅，中国电视综艺主持人、教师、演员。长期主持国民综艺节目，兼具稳定控场和大众影响力。',
      constellation: '金牛座',
      sizhu: '甲寅 戊辰 丙子',
      dayunInfo: '甲子(1982-1991,8-17岁)',
      photoUrl: 'https://example.com/hejiong.jpg',
      promptText: '何炅，主持人、教师、演员，国民级综艺MC。',
      sourceTopicTitle: '何炅回应近期综艺话题',
      sourcePlatform: '微博',
      analysisStatus: 'completed',
    });

    const reused = db.hotPeople.findByName('何炅');

    expect(reused).toMatchObject({
      name: '何炅',
      birthday: '1974年4月28日',
      analysisStatus: 'completed',
    });
    expect(db.hotPeople.list().filter((item) => item.name === '何炅')).toHaveLength(1);
  });

  test('tracks hot topic analysis state so processed topic rows can be skipped later', async () => {
    const db = await createDatabase(':memory:');
    db.hotTopicsHistory.saveMany([
      { platform: '微博', title: '何炅回应近期综艺争议', rank: 1, hotValue: '100w' },
      { platform: '微博', title: '谢娜节目表现引发讨论', rank: 2, hotValue: '90w' },
    ]);

    const latest = db.hotTopicsHistory.getLatest(10);
    expect(latest).toHaveLength(2);

    const pendingBefore = db.hotTopicAnalysis.listPending(10);
    expect(pendingBefore).toHaveLength(2);

    db.hotTopicAnalysis.markProcessed(latest[0].id, ['何炅']);

    const pendingAfter = db.hotTopicAnalysis.listPending(10);
    expect(pendingAfter).toHaveLength(1);
    expect(pendingAfter[0].title).toBe('谢娜节目表现引发讨论');
  });

  test('returns newest pending hot topics first so fresh batches are analyzed before stale queue heads', async () => {
    const db = await createDatabase(':memory:');
    db.hotTopicsHistory.saveMany([
      { platform: 'weibo', title: 'older topic', rank: 1, hotValue: '100w' },
      { platform: 'weibo', title: 'newer topic', rank: 2, hotValue: '90w' },
      { platform: 'weibo', title: 'newest topic', rank: 3, hotValue: '80w' },
    ]);

    const pending = db.hotTopicAnalysis.listPending(3);

    expect(pending.map((item) => item.title)).toEqual(['newest topic', 'newer topic', 'older topic']);
  });

  test('stores only newly appeared hot topics when incremental sync compares against the latest snapshot', async () => {
    const db = await createDatabase(':memory:');
    db.hotTopicsHistory.saveMany([
      { platform: 'weibo', title: 'kept topic', url: 'https://example.com/kept', rank: 1, hotValue: '100w' },
      { platform: 'tencent', title: 'old topic', url: 'https://example.com/old', rank: 2, hotValue: '90w' },
    ]);

    const inserted = db.hotTopicsHistory.saveIncremental([
      { platform: 'weibo', title: 'kept topic', url: 'https://example.com/kept', rank: 1, hotValue: '120w' },
      { platform: 'tencent', title: 'brand new topic', url: 'https://example.com/new', rank: 2, hotValue: '88w' },
    ]);

    const latest = db.hotTopicsHistory.getLatest(10);

    expect(inserted).toBe(1);
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({
      platform: 'tencent',
      title: 'brand new topic',
      url: 'https://example.com/new',
    });
  });

  test('failed hot topic analysis stays retryable instead of being completed', async () => {
    const db = await createDatabase(':memory:');
    db.hotTopicsHistory.saveMany([
      { platform: '微博', title: '未知人物资料不足', rank: 1, hotValue: '100w' },
    ]);

    const [pending] = db.hotTopicAnalysis.listPending(10);
    db.hotTopicAnalysis.markExtracted(pending.id, ['未知人物']);
    db.hotTopicAnalysis.markFailed(pending.id, 'BIRTHDAY_YMD_REQUIRED');

    const [retryable] = db.hotTopicAnalysis.listPending(10);
    expect(retryable).toBeUndefined();
  });

  test('stores and updates public figure evidence cache by person name', async () => {
    const db = await createDatabase(':memory:');

    const first = db.publicFigureEvidence.upsert({
      name: '何炅',
      title: '何炅',
      summary: '何炅，中国电视综艺主持人、教师、演员。',
      imageUrl: 'https://example.com/hejiong.jpg',
      birthDate: '1974年4月28日',
      gender: '男',
      source: 'wikipedia',
    });

    const second = db.publicFigureEvidence.upsert({
      name: '何炅',
      title: '何炅',
      summary: '何炅，中国知名主持人、演员，长期主持国民综艺。',
      imageUrl: 'https://example.com/hejiong-v2.jpg',
      birthDate: '1974年4月28日',
      gender: '男',
      source: 'wikidata',
    });

    const found = db.publicFigureEvidence.findByName('何炅');

    expect(second.id).toBe(first.id);
    expect(found).toMatchObject({
      id: first.id,
      name: '何炅',
      summary: '何炅，中国知名主持人、演员，长期主持国民综艺。',
      imageUrl: 'https://example.com/hejiong-v2.jpg',
      source: 'wikidata',
    });
  });

  test('deletes all hot people records for full regeneration', async () => {
    const db = await createDatabase(':memory:');

    db.hotPeople.upsert({
      name: '何炅',
      gender: '男',
      birthday: '1974年4月28日',
      bio: '何炅，中国知名主持人。',
      constellation: '金牛座',
      sizhu: '甲寅 戊辰 丙子',
      dayunInfo: '1978-1987年（8-17岁）：癸巳',
      photoUrl: '',
      promptText: '何炅，主持人。',
      sourceTopicTitle: '何炅热搜',
      sourcePlatform: '微博',
      analysisStatus: 'completed',
    });

    expect(db.hotPeople.list()).toHaveLength(1);
    expect(db.hotPeople.deleteAll()).toBe(1);
    expect(db.hotPeople.list()).toHaveLength(0);
  });

  test('stores hot bazi tasks with media paths and automation config', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'hot bazi account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const person = db.hotPeople.upsert({
      name: '测试人物',
      birthday: '1990年1月1日',
      sourceTopicTitle: '测试热点',
      sourcePlatform: 'weibo',
      analysisStatus: 'completed',
    });
    const content = db.contentItems.create({
      title: '热点八字内容',
      body: '一条热点八字微博草稿',
      source: 'ai',
      status: 'reviewing',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_hot_bazi',
      mediaJson: [{ path: 'C:/tmp/a.png' }],
      sourceJson: { sourceTopic: '测试热点' },
    });

    const task = db.hotBaziTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      hotPersonId: person.id,
      sourceTopic: '测试热点',
      scheduledAt: '2026-05-05T10:00:00.000Z',
      status: 'reviewing',
      automationEnabled: true,
      intervalMinutes: 5,
      scheduleRuleJson: { mode: 'evening_peak' },
      mediaPathsJson: ['C:/tmp/a.png', 'C:/tmp/b.mp4'],
      platformPayload: { content: '一条热点八字微博草稿' },
    });

    expect(task).toMatchObject({
      contentId: content.id,
      accountId: account.id,
      hotPersonId: person.id,
      sourceTopic: '测试热点',
      status: 'reviewing',
      automationEnabled: true,
      intervalMinutes: 5,
      mediaPathsJson: ['C:/tmp/a.png', 'C:/tmp/b.mp4'],
      scheduleRuleJson: { mode: 'evening_peak' },
    });
    expect(db.hotBaziTasks.list()).toContainEqual(expect.objectContaining({
      id: task.id,
      accountId: account.id,
      mediaPathsJson: ['C:/tmp/a.png', 'C:/tmp/b.mp4'],
    }));
  });

  test('uses the dispatch scheduler time when enqueueing hot bazi content', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'hot bazi enqueue account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Hot bazi enqueue content',
      body: 'Hot bazi enqueue body',
      source: 'ai',
      status: 'ready',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_hot_bazi',
    });
    const task = db.hotBaziTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      sourceTopic: 'hot bazi source topic',
      scheduledAt: '2026-05-05T12:34:00.000Z',
      status: 'draft',
      automationEnabled: false,
      intervalMinutes: 5,
      scheduleRuleJson: { rule: 'evening_peak' },
      platformPayload: { content: 'Hot bazi enqueue body' },
    });

    const distributionTask = db.hotBaziTasks.enqueueToDistribution(task.id);

    expect(distributionTask.scheduledAt).not.toBe('2026-05-05T12:34:00.000Z');
    expect(db.distributionTasks.list()).toContainEqual(expect.objectContaining({
      contentId: content.id,
      scheduledAt: distributionTask.scheduledAt,
      status: 'queued',
    }));
    expect(db.hotBaziTasks.findById(task.id)?.status).toBe('queued');
  });
});
