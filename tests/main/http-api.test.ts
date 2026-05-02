import { afterEach, describe, expect, test } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';
import { startHttpApi } from '../../src/main/ipc/handlers.js';
import { PublishScheduler } from '../../src/main/publisher/Scheduler.js';

const servers: Array<{ close: () => void }> = [];

afterEach(() => {
  while (servers.length) {
    servers.pop()?.close();
  }
});

describe('http api', () => {
  test('allows CORS preflight for deleting posts', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51830;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/posts/1`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'DELETE',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('DELETE');
    expect(response.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
  });

  test('reflects localhost origin for delete preflight', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51831;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/posts/1`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'DELETE',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  test('allows CORS preflight for editing accounts', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51845;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/accounts/1`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH');
    expect(response.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
  });

  test('allows account saves from file based renderer pages', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51849;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/accounts`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'null',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-origin')).toBe('null');
  });

  test('uses configured origins and exposes settings from the database', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('http.allowedOrigins', 'http://127.0.0.1:6200');
    const scheduler = new PublishScheduler(db);
    const port = 51832;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const preflight = await fetch(`http://127.0.0.1:${port}/posts/1`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:6200',
        'Access-Control-Request-Method': 'DELETE',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    const settings = await fetch(`http://127.0.0.1:${port}/settings`);
    const settingsBody = await settings.json() as Array<{ key: string; value: string }>;

    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:6200');
    expect(settingsBody).toContainEqual(expect.objectContaining({
      key: 'http.allowedOrigins',
      value: 'http://127.0.0.1:6200',
    }));
  });

  test('creates, updates, and deletes content through the local api', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51833;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const createdResponse = await fetch(`http://127.0.0.1:${port}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Launch note',
        body: 'A reusable content asset',
        source: 'manual',
        status: 'draft',
      }),
    });
    const created = await createdResponse.json() as { id: number; title: string };

    const updatedResponse = await fetch(`http://127.0.0.1:${port}/contents/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Launch note updated',
        body: 'Ready for distribution',
        status: 'ready',
      }),
    });
    const updated = await updatedResponse.json() as { id: number; title: string; status: string };
    const listResponse = await fetch(`http://127.0.0.1:${port}/contents`);
    const list = await listResponse.json() as Array<{ id: number }>;
    const deleteResponse = await fetch(`http://127.0.0.1:${port}/contents/${created.id}`, {
      method: 'DELETE',
    });
    const deleted = await deleteResponse.json() as { ok: boolean };

    expect(createdResponse.status).toBe(200);
    expect(created.title).toBe('Launch note');
    expect(updated).toMatchObject({ id: created.id, title: 'Launch note updated', status: 'ready' });
    expect(list).toContainEqual(expect.objectContaining({ id: created.id }));
    expect(deleted.ok).toBe(true);
  });

  test('supports the main content-to-queue smoke workflow through the local api', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51844;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const contentResponse = await fetch(`${baseUrl}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '冒烟测试内容',
        body: '保存内容后进入发布队列',
        source: 'manual',
        status: 'ready',
      }),
    });
    const content = await contentResponse.json() as { id: number; body: string };

    const accountResponse = await fetch(`${baseUrl}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '冒烟微博账号',
        platform: 'weibo',
        browserMode: 'manual_port',
        providerProfileId: '',
        wsEndpoint: '',
        debuggingPort: 9222,
        status: 'active',
        notes: '',
      }),
    });
    const account = await accountResponse.json() as { id: number };

    const postResponse = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        content: content.body,
        mediaPaths: [],
        scheduledAt: '2026-05-01T10:00:00.000Z',
        status: 'queued',
      }),
    });
    const post = await postResponse.json() as { id: number };

    const [contentsResponse, tasksResponse, platformsResponse, settingsResponse, runsResponse] = await Promise.all([
      fetch(`${baseUrl}/contents`),
      fetch(`${baseUrl}/distribution-tasks`),
      fetch(`${baseUrl}/platforms`),
      fetch(`${baseUrl}/settings`),
      fetch(`${baseUrl}/publish-runs`),
    ]);
    const contents = await contentsResponse.json() as Array<{ id: number }>;
    const tasks = await tasksResponse.json() as Array<{ legacyPostId: number; accountId: number; platform: string; status: string }>;
    const platforms = await platformsResponse.json() as Array<{ code: string }>;
    const settings = await settingsResponse.json() as Array<{ key: string }>;
    const runs = await runsResponse.json() as unknown[];

    expect(contentResponse.status).toBe(200);
    expect(accountResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(contents).toContainEqual(expect.objectContaining({ id: content.id }));
    expect(tasks).toContainEqual(expect.objectContaining({
      legacyPostId: post.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'queued',
    }));
    expect(platforms).toContainEqual(expect.objectContaining({ code: 'weibo' }));
    expect(settings.length).toBeGreaterThan(0);
    expect(runs).toEqual([]);
  });

  test('serves content version history through the local api', async () => {
    const db = await createDatabase(':memory:');
    const content = db.contentItems.create({
      title: 'History draft',
      body: 'Initial history body',
      source: 'manual',
      status: 'draft',
    });
    db.contentItems.update(content.id, {
      title: 'History ready',
      body: 'Updated history body',
      status: 'ready',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51843;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/contents/${content.id}/versions`);
    const versions = await response.json() as Array<{ contentId: number; title: string; body: string }>;

    expect(response.status).toBe(200);
    expect(versions).toEqual([
      expect.objectContaining({ contentId: content.id, title: 'History ready', body: 'Updated history body' }),
      expect.objectContaining({ contentId: content.id, title: 'History draft', body: 'Initial history body' }),
    ]);
  });

  test('updates accounts through the local api', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51838;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const createdResponse = await fetch(`http://127.0.0.1:${port}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ops account',
        platform: 'weibo',
        browserMode: 'manual_port',
        providerProfileId: '',
        wsEndpoint: '',
        debuggingPort: 9222,
        status: 'active',
        notes: '',
      }),
    });
    const created = await createdResponse.json() as { id: number };

    const updatedResponse = await fetch(`http://127.0.0.1:${port}/accounts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ops account B',
        browserMode: 'manual_ws',
        providerProfileId: 'profile-2',
        wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/demo',
        debuggingPort: null,
        status: 'paused',
        notes: 'maintenance',
      }),
    });
    const updated = await updatedResponse.json() as { name: string; status: string; browserMode: string };

    expect(updatedResponse.status).toBe(200);
    expect(updated).toMatchObject({
      name: 'Ops account B',
      status: 'paused',
      browserMode: 'manual_ws',
    });
  });

  test('deletes accounts and their related queue records through the local api', async () => {
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
    const post = db.posts.create({
      accountId: account.id,
      content: 'delete account post',
      mediaPaths: [],
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
    });
    const task = db.distributionTasks.list().find((item) => item.legacyPostId === post.id);
    if (!task) {
      throw new Error('Expected task for account deletion test');
    }
    db.publishRuns.create({
      taskId: task.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'delete me',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:00:02.000Z',
      screenshotPath: '',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51846;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/accounts/${account.id}`, {
      method: 'DELETE',
    });
    const deleted = await response.json() as { ok: boolean; message: string };
    const accountsResponse = await fetch(`http://127.0.0.1:${port}/accounts`);
    const accounts = await accountsResponse.json() as Array<{ id: number }>;
    const postsResponse = await fetch(`http://127.0.0.1:${port}/posts`);
    const posts = await postsResponse.json() as Array<{ id: number }>;
    const tasksResponse = await fetch(`http://127.0.0.1:${port}/distribution-tasks`);
    const tasks = await tasksResponse.json() as Array<{ accountId: number }>;
    const runsResponse = await fetch(`http://127.0.0.1:${port}/publish-runs`);
    const runs = await runsResponse.json() as Array<{ accountId: number }>;

    expect(response.status).toBe(200);
    expect(deleted).toMatchObject({ ok: true });
    expect(accounts).not.toContainEqual(expect.objectContaining({ id: account.id }));
    expect(posts).not.toContainEqual(expect.objectContaining({ id: post.id }));
    expect(tasks).not.toContainEqual(expect.objectContaining({ accountId: account.id }));
    expect(runs).not.toContainEqual(expect.objectContaining({ accountId: account.id }));
  });

  test('stores successful account connection checks in health fields', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'Healthy account',
      platform: 'weibo',
      browserMode: 'manual_ws',
      providerProfileId: '',
      wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/demo',
      debuggingPort: null,
      status: 'active',
      notes: '',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51839;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/accounts/${account.id}/test-connection`, {
      method: 'POST',
    });
    const result = await response.json() as { ok: boolean };
    const refreshed = db.accounts.findById(account.id);

    expect(response.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(refreshed).toMatchObject({
      status: 'active',
      healthMessage: expect.stringContaining('Connected to Healthy account'),
    });
  });

  test('explains manual debugging port connection failures', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'Closed port account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9,
      status: 'active',
      notes: '',
    });
    db.settings.set('browser.connectionTimeoutMs', '1000');
    const scheduler = new PublishScheduler(db);
    const port = 51847;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/accounts/${account.id}/test-connection`, {
      method: 'POST',
    });
    const result = await response.json() as { ok: boolean; message: string };
    const refreshed = db.accounts.findById(account.id);

    expect(response.status).toBe(200);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Unable to connect to Chrome debugging port 9');
    expect(result.message).not.toBe('fetch failed');
    expect(refreshed).toMatchObject({
      status: 'needs_manual_action',
      manualActionReason: 'Connection test failed',
      healthMessage: expect.stringContaining('Chrome debugging port 9'),
    });
  });

  test('explains AdsPower local api connection failures', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('adspower.apiKey', 'test-key');
    db.settings.set('browser.connectionTimeoutMs', '1000');
    const account = db.accounts.create({
      name: 'AdsPower offline account',
      platform: 'weibo',
      browserMode: 'adspower',
      providerProfileId: 'profile-1',
      wsEndpoint: '',
      debuggingPort: null,
      status: 'active',
      notes: '',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51848;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/accounts/${account.id}/test-connection`, {
      method: 'POST',
    });
    const result = await response.json() as { ok: boolean; message: string };

    expect(response.status).toBe(200);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Unable to connect to AdsPower Local API');
    expect(result.message).not.toBe('fetch failed');
  });

  test('lists distribution tasks created from post submissions', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'demo weibo',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51834;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    await fetch(`http://127.0.0.1:${port}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        content: 'content for distribution model',
        mediaPaths: [],
        scheduledAt: '2026-05-01T10:00:00.000Z',
        status: 'queued',
      }),
    });
    const response = await fetch(`http://127.0.0.1:${port}/distribution-tasks`);
    const tasks = await response.json() as Array<{ accountId: number; platform: string; status: string }>;

    expect(response.status).toBe(200);
    expect(tasks).toContainEqual(expect.objectContaining({
      accountId: account.id,
      platform: 'weibo',
      status: 'queued',
    }));
  });

  test('updates and retries distribution tasks through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'queue account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Queue task',
      body: 'Queue body',
      source: 'manual',
      status: 'ready',
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Queue body' },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51840;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const updatedResponse = await fetch(`http://127.0.0.1:${port}/distribution-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledAt: '2026-05-01T11:00:00.000Z',
        status: 'queued',
        platformPayload: { content: 'Queue body updated' },
      }),
    });
    const retriedResponse = await fetch(`http://127.0.0.1:${port}/distribution-tasks/${task.id}/retry`, {
      method: 'POST',
    });
    const cancelledResponse = await fetch(`http://127.0.0.1:${port}/distribution-tasks/${task.id}/cancel`, {
      method: 'POST',
    });
    const updated = await updatedResponse.json() as { scheduledAt: string; status: string };
    const retried = await retriedResponse.json() as { status: string };
    const cancelled = await cancelledResponse.json() as { status: string; lastError: string };

    expect(updatedResponse.status).toBe(200);
    expect(updated).toMatchObject({ scheduledAt: '2026-05-01T11:00:00.000Z', status: 'queued' });
    expect(retried.status).toBe('queued');
    expect(cancelled).toMatchObject({ status: 'failed', lastError: 'Cancelled by operator' });
  });

  test('retries and cancels distribution tasks in bulk through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'bulk queue account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Bulk queue task',
      body: 'Bulk queue body',
      source: 'manual',
      status: 'ready',
    });
    const first = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Bulk queue body' },
    });
    const second = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'needs_manual_action',
      platformPayload: { content: 'Bulk queue body 2' },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51841;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const retriedResponse = await fetch(`http://127.0.0.1:${port}/distribution-tasks/retry-many`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [first.id, second.id] }),
    });
    const cancelledResponse = await fetch(`http://127.0.0.1:${port}/distribution-tasks/cancel-many`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [first.id, second.id] }),
    });
    const retried = await retriedResponse.json() as Array<{ status: string }>;
    const cancelled = await cancelledResponse.json() as Array<{ lastError: string }>;

    expect(retriedResponse.status).toBe(200);
    expect(retried.map((task) => task.status)).toEqual(['queued', 'queued']);
    expect(cancelled.map((task) => task.lastError)).toEqual(['Cancelled by operator', 'Cancelled by operator']);
  });

  test('exposes platform capabilities through the local api', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51835;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/platform-capabilities`);
    const capabilities = await response.json() as Array<{ platform: string; implemented: boolean }>;

    expect(response.status).toBe(200);
    expect(capabilities).toContainEqual(expect.objectContaining({
      platform: 'weibo',
      implemented: true,
    }));
    expect(capabilities).toContainEqual(expect.objectContaining({
      platform: 'douyin',
      implemented: false,
    }));
  });

  test('exposes publish runs through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'demo account',
      platform: 'xiaohongshu',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Run content',
      body: 'Run body',
      source: 'manual',
      status: 'ready',
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'xiaohongshu',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'Run body' },
    });
    db.publishRuns.create({
      taskId: task.id,
      accountId: account.id,
      platform: 'xiaohongshu',
      status: 'failed',
      message: 'manual handoff required',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:00:05.000Z',
      screenshotPath: 'screenshots/task.png',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51836;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/publish-runs`);
    const runs = await response.json() as Array<{ taskId: number; message: string; platform: string }>;

    expect(response.status).toBe(200);
    expect(runs).toContainEqual(expect.objectContaining({
      taskId: task.id,
      platform: 'xiaohongshu',
      message: 'manual handoff required',
    }));
  });

  test('filters publish runs by task id through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'run filter account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Run filter content',
      body: 'Run filter body',
      source: 'manual',
      status: 'ready',
    });
    const firstTask = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Run filter body' },
    });
    const secondTask = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T11:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Other body' },
    });
    db.publishRuns.create({
      taskId: firstTask.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'first task failed',
      startedAt: '2026-05-01T10:00:00.000Z',
      finishedAt: '2026-05-01T10:00:02.000Z',
      screenshotPath: 'screenshots/first.png',
    });
    db.publishRuns.create({
      taskId: secondTask.id,
      accountId: account.id,
      platform: 'weibo',
      status: 'failed',
      message: 'second task failed',
      startedAt: '2026-05-01T11:00:00.000Z',
      finishedAt: '2026-05-01T11:00:02.000Z',
      screenshotPath: 'screenshots/second.png',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51842;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/publish-runs?taskId=${firstTask.id}`);
    const runs = await response.json() as Array<{ taskId: number; message: string }>;

    expect(response.status).toBe(200);
    expect(runs).toEqual([
      expect.objectContaining({
        taskId: firstTask.id,
        message: 'first task failed',
      }),
    ]);
  });

  test('serves help center documents from docs files', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const port = 51837;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/help-docs`);
    const docs = await response.json() as { userGuide: string; updateGuide: string; releaseNotes: string };

    expect(response.status).toBe(200);
    expect(docs.userGuide).toContain('0Worker Desk User Guide');
    expect(docs.updateGuide).toContain('GitHub Releases');
    expect(docs.releaseNotes).toContain('0Worker Desk 0.1.0');
  });
});
