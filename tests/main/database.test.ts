import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDatabase } from '../../src/main/db/database.js';

describe('database repositories', () => {
  test('persists data through native sqlite without exporting the whole database', async () => {
    const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), '0worker-db-')), 'app.sqlite');
    const first = await createDatabase(filename);

    first.settings.set('scheduler.intervalMs', '60000');

    const second = await createDatabase(filename);

    expect(second.settings.get('scheduler.intervalMs')).toBe('60000');
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
});
