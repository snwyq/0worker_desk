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

  test('lists account styles and approves review items through the local api', async () => {
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
    const content = db.contentItems.create({
      title: 'Hot person draft',
      body: 'A reviewable AI generated Weibo draft.',
      source: 'ai',
      status: 'reviewing',
      tenantId: 'tenant_default',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: styles[0].id,
      runId: 'run_api_001',
      topicsJson: ['hot person', 'maoxiaoxian'],
      sourceJson: { person: { name: 'demo' } },
      riskJson: { score: 35, flags: ['public_figure'] },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51850;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const createReviewResponse = await fetch(`${baseUrl}/review-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: content.id,
        reviewMode: 'manual',
        status: 'pending',
        comment: '',
      }),
    });
    const review = await createReviewResponse.json() as { id: number; contentId: number; status: string };
    const stylesResponse = await fetch(`${baseUrl}/ai/styles?accountId=${account.id}&pluginCode=maoxiaoxian`);
    const listedStyles = await stylesResponse.json() as Array<{ id: string; name: string; pluginCode: string }>;
    const reviewResponse = await fetch(`${baseUrl}/review-items`);
    const pendingReviews = await reviewResponse.json() as Array<{ id: number; contentId: number; status: string }>;
    const approveResponse = await fetch(`${baseUrl}/review-items/${review.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId: 'operator_api', comment: 'facts checked' }),
    });
    const approved = await approveResponse.json() as { id: number; status: string; reviewerId: string; comment: string };
    const taskResponse = await fetch(`${baseUrl}/distribution-tasks`);
    const tasks = await taskResponse.json() as Array<{ id: number; contentId: number; accountId: number; status: string }>;

    expect(createReviewResponse.status).toBe(200);
    expect(review).toMatchObject({
      contentId: content.id,
      status: 'pending',
    });
    expect(stylesResponse.status).toBe(200);
    expect(listedStyles.map((style) => style.name)).toEqual([
      '热点人物命理解读',
      '治愈系情绪价值',
      '犀利热点点评',
      '国学/面相泛内容',
    ]);
    expect(listedStyles.every((style) => style.pluginCode === 'maoxiaoxian')).toBe(true);
    expect(reviewResponse.status).toBe(200);
    expect(pendingReviews).toContainEqual(expect.objectContaining({
      id: review.id,
      contentId: content.id,
      status: 'pending',
    }));
    expect(approveResponse.status).toBe(200);
    expect(approved).toMatchObject({
      id: review.id,
      status: 'approved',
      reviewerId: 'operator_api',
      comment: 'facts checked',
    });
    expect(db.contentItems.findById(content.id)).toMatchObject({
      id: content.id,
      status: 'approved',
    });
    expect(taskResponse.status).toBe(200);
    expect(tasks).toContainEqual(expect.objectContaining({
      contentId: content.id,
      accountId: account.id,
      status: 'queued',
    }));
  });

  test('creates and updates content styles through the local api', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const account = db.accounts.create({
      name: 'api style account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const port = 51877;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const createResponse = await fetch(`${baseUrl}/ai/styles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        pluginCode: 'maoxiaoxian',
        workflowCode: 'maoxiaoxian.daily_topics',
        name: '热点陪伴型',
        description: '把热搜转成轻量陪伴感微博。',
        reviewPolicyJson: { mode: 'manual' },
      }),
    });
    const created = await createResponse.json() as { id: string; name: string };
    const updateResponse = await fetch(`${baseUrl}/ai/styles/${encodeURIComponent(created.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '热点陪伴型 v2',
        reviewPolicyJson: { mode: 'sample', sampleRate: 0.25 },
      }),
    });
    const updated = await updateResponse.json() as { id: string; name: string; reviewPolicyJson: Record<string, unknown> };
    const listResponse = await fetch(`${baseUrl}/ai/styles?accountId=${account.id}&pluginCode=maoxiaoxian`);
    const styles = await listResponse.json() as Array<{ id: string; name: string }>;

    expect(createResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(updated).toMatchObject({
      id: created.id,
      name: '热点陪伴型 v2',
      reviewPolicyJson: { mode: 'sample', sampleRate: 0.25 },
    });
    expect(styles).toContainEqual(expect.objectContaining({
      id: created.id,
      name: '热点陪伴型 v2',
    }));
  });

  test('copies content styles to matrix accounts through the local api', async () => {
    const db = await createDatabase(':memory:');
    const scheduler = new PublishScheduler(db);
    const sourceAccount = db.accounts.create({
      name: 'source matrix',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9230,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const targetAccount = db.accounts.create({
      name: 'target matrix',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9231,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    const sourceStyle = db.contentStyles.create({
      accountId: sourceAccount.id,
      pluginCode: 'maoxiaoxian',
      workflowCode: 'maoxiaoxian.daily_topics',
      name: '矩阵热点锐评',
      description: '适合矩阵账号复制的热点锐评风格。',
      reviewPolicyJson: { mode: 'manual' },
      dispatchPolicyJson: { dailyLimit: 2 },
    });
    const port = 51878;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const copyResponse = await fetch(`${baseUrl}/ai/styles/${encodeURIComponent(sourceStyle.id)}/copy-to-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetAccountIds: [sourceAccount.id, targetAccount.id],
        nameSuffix: '矩阵复用',
      }),
    });
    const copied = await copyResponse.json() as Array<{ id: string; accountId: number; name: string; dispatchPolicyJson: Record<string, unknown> }>;
    const targetStylesResponse = await fetch(`${baseUrl}/ai/styles?accountId=${targetAccount.id}&pluginCode=maoxiaoxian`);
    const targetStyles = await targetStylesResponse.json() as Array<{ id: string; accountId: number; name: string }>;

    expect(copyResponse.status).toBe(200);
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({
      accountId: targetAccount.id,
      name: '矩阵热点锐评 矩阵复用',
      dispatchPolicyJson: { dailyLimit: 2 },
    });
    expect(targetStyles).toContainEqual(expect.objectContaining({
      id: copied[0].id,
      accountId: targetAccount.id,
      name: '矩阵热点锐评 矩阵复用',
    }));
  });

  test('rejects review items through the local api without creating dispatch tasks', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'review reject account',
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
      title: 'Rejectable AI content',
      body: 'This content should be rejected.',
      source: 'ai',
      status: 'reviewing',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_hot_bazi',
    });
    const review = db.reviewItems.create({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: 'needs review',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51853;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const rejectResponse = await fetch(`${baseUrl}/review-items/${review.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerId: 'operator',
        comment: 'Tone is too risky.',
      }),
    });
    const rejected = await rejectResponse.json() as { status: string; comment: string };

    expect(rejectResponse.status).toBe(200);
    expect(rejected).toMatchObject({
      status: 'rejected',
      comment: 'Tone is too risky.',
    });
    expect(db.contentItems.findById(content.id)).toMatchObject({ status: 'rejected' });
    expect(db.distributionTasks.list()).toHaveLength(0);
  });

  test('marks review items for rewrite through the local api', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('ai.dashscopeKey', '');
    const account = db.accounts.create({
      name: 'review rewrite account',
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
      title: 'Rewrite AI content',
      body: 'This content needs a softer tone.',
      source: 'ai',
      status: 'reviewing',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_healing_emotion',
    });
    const review = db.reviewItems.create({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: 'needs review',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51854;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const rewriteResponse = await fetch(`${baseUrl}/review-items/${review.id}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerId: 'operator',
        comment: 'Please rewrite with warmer wording.',
      }),
    });
    const rewriting = await rewriteResponse.json() as { status: string; reviewerId: string; comment: string };

    expect(rewriteResponse.status).toBe(200);
    expect(rewriting).toMatchObject({
      status: 'rewriting',
      reviewerId: 'operator',
      comment: 'Please rewrite with warmer wording.',
    });
    expect(db.contentItems.findById(content.id)).toMatchObject({ status: 'reviewing' });
    expect(db.distributionTasks.list()).toHaveLength(0);
  });

  test('rewrites reviewed content through the local api and keeps the original version', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'review rewrite apply account',
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
      title: 'Rewrite applied content',
      body: 'Original draft with a stiff tone.',
      source: 'ai',
      status: 'reviewing',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_healing_emotion',
    });
    const review = db.reviewItems.create({
      contentId: content.id,
      reviewMode: 'manual',
      status: 'pending',
      comment: 'needs rewrite',
    });
    const scheduler = new PublishScheduler(db);
    const port = 51859;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/review-items/${review.id}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerId: 'operator',
        comment: 'Make it warmer and more conversational.',
        rewrittenBody: 'A warmer rewritten draft ready for another human check.',
      }),
    });
    const rewritten = await response.json() as { status: string; comment: string };

    expect(response.status).toBe(200);
    expect(rewritten).toMatchObject({
      status: 'pending',
      comment: 'AI rewrite generated from: Make it warmer and more conversational.',
    });
    expect(db.contentItems.findById(content.id)).toMatchObject({
      title: 'Rewrite applied content',
      body: 'A warmer rewritten draft ready for another human check.',
      status: 'reviewing',
    });
    expect(db.contentItems.listVersions(content.id).map((version) => version.body)).toEqual([
      'A warmer rewritten draft ready for another human check.',
      'Original draft with a stiff tone.',
    ]);
    expect(db.distributionTasks.list()).toHaveLength(0);
  });

  test('starts and reads traceable workflow runs through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'workflow account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
      activePluginCode: 'maoxiaoxian',
    });
    db.aiWorkflows.upsert({
      pluginCode: 'maoxiaoxian',
      code: 'maoxiaoxian.noop_test',
      name: 'No-op trace workflow',
      definitionJson: {
        workflowId: 'maoxiaoxian.noop_test',
        trigger: 'manual',
        frequency: 'manual',
        steps: [],
      },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51851;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const startedResponse = await fetch(`${baseUrl}/ai/workflow-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        pluginCode: 'maoxiaoxian',
        workflowCode: 'maoxiaoxian.noop_test',
        inputParams: {
          topic: 'workflow trace topic',
          styleId: 'mx_hot_bazi',
        },
      }),
    });
    const started = await startedResponse.json() as { runId: string; status: string };
    await new Promise((resolve) => setTimeout(resolve, 20));
    const runResponse = await fetch(`${baseUrl}/ai/workflow-runs/${started.runId}`);
    const run = await runResponse.json() as {
      runId: string;
      accountId: number;
      pluginCode: string;
      workflowCode: string;
      status: string;
      contextSnapshot: Record<string, unknown>;
      logs: Array<{ message: string }>;
    };

    expect(startedResponse.status).toBe(200);
    expect(started.runId).toEqual(expect.any(String));
    expect(['running', 'completed']).toContain(started.status);
    expect(runResponse.status).toBe(200);
    expect(run).toMatchObject({
      runId: started.runId,
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      workflowCode: 'maoxiaoxian.noop_test',
      status: 'completed',
      contextSnapshot: {
        topic: 'workflow trace topic',
        styleId: 'mx_hot_bazi',
      },
    });
    expect(run.logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('completed') }),
    ]));
  });

  test('workflow persist step stores generated content and review item through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'workflow persist account',
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
    db.aiWorkflows.upsert({
      pluginCode: 'maoxiaoxian',
      code: 'maoxiaoxian.persist_test',
      name: 'Persist trace workflow',
      definitionJson: {
        workflowId: 'maoxiaoxian.persist_test',
        trigger: 'manual',
        frequency: 'manual',
        steps: [
          { id: 'persist_final', type: 'persist', dataKey: 'final_post', table: 'content_items' },
        ],
      },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51852;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);
    const baseUrl = `http://127.0.0.1:${port}`;

    const startedResponse = await fetch(`${baseUrl}/ai/workflow-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        pluginCode: 'maoxiaoxian',
        workflowCode: 'maoxiaoxian.persist_test',
        inputParams: {
          final_post: 'Persisted from workflow run.',
          topic: 'persist topic',
          styleId: style.id,
          pluginCode: 'maoxiaoxian',
          reviewMode: 'manual',
          riskJson: { score: 33 },
        },
      }),
    });
    const started = await startedResponse.json() as { runId: string };
    await new Promise((resolve) => setTimeout(resolve, 20));
    const runResponse = await fetch(`${baseUrl}/ai/workflow-runs/${started.runId}`);
    const run = await runResponse.json() as { contextSnapshot: { persistedContentId?: number } };
    const reviewsResponse = await fetch(`${baseUrl}/review-items`);
    const reviews = await reviewsResponse.json() as Array<{ contentId: number; status: string }>;

    expect(startedResponse.status).toBe(200);
    expect(runResponse.status).toBe(200);
    expect(run.contextSnapshot.persistedContentId).toEqual(expect.any(Number));
    expect(reviewsResponse.status).toBe(200);
    expect(reviews).toContainEqual(expect.objectContaining({
      contentId: run.contextSnapshot.persistedContentId,
      status: 'pending',
    }));
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
        activePluginCode: 'maoxiaoxian',
        aiConfigJson: {
          persona: '温柔但有观点的微博运营人格',
          forbiddenWords: ['绝对', '必然'],
          defaultReviewMode: 'sample',
          dispatchPolicy: {
            dailyLimit: 3,
            minIntervalMinutes: 45,
            autoPublish: false,
          },
        },
      }),
    });
    const updated = await updatedResponse.json() as {
      name: string;
      status: string;
      browserMode: string;
      activePluginCode: string;
      aiConfigJson: Record<string, any>;
    };

    expect(updatedResponse.status).toBe(200);
    expect(updated).toMatchObject({
      name: 'Ops account B',
      status: 'paused',
      browserMode: 'manual_ws',
      activePluginCode: 'maoxiaoxian',
      aiConfigJson: {
        persona: '温柔但有观点的微博运营人格',
        forbiddenWords: ['绝对', '必然'],
        defaultReviewMode: 'sample',
        dispatchPolicy: {
          dailyLimit: 3,
          minIntervalMinutes: 45,
          autoPublish: false,
        },
      },
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

  test('serves cached hot topics when force refresh is requested through the local api', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('ai.tophubKey', '');
    db.settings.set('ai.tophubBaseUrl', 'http://127.0.0.1:9/nodes');
    db.hotTopicsHistory.saveMany([
      {
        platform: '微博',
        title: 'cached hot topic',
        rank: 1,
        hotValue: '100w',
      },
    ]);
    const scheduler = new PublishScheduler(db);
    const port = 51858;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/ai/hot-topics?force=true`);
    const result = await response.json() as { items: Array<{ title: string }>; lastFetchTime: string | null };

    expect(response.status).toBe(200);
    expect(result.items).toEqual([
      expect.objectContaining({ title: 'cached hot topic' }),
    ]);
    expect(result.lastFetchTime).toBeTruthy();
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

  test('rejects conflicting distribution task schedules through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'conflict api account',
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
      body: 'First conflict body',
      source: 'manual',
      status: 'ready',
    });
    const secondContent = db.contentItems.create({
      title: 'Second conflict content',
      body: 'Second conflict body',
      source: 'manual',
      status: 'ready',
    });
    db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: { content: 'First conflict body' },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51845;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/distribution-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId: secondContent.id,
        accountId: account.id,
        platform: 'weibo',
        scheduledAt: '2026-05-01T10:00:00.000Z',
        status: 'queued',
        platformPayload: { content: 'Second conflict body' },
      }),
    });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toContain('SCHEDULE_CONFLICT');
  });

  test('publishes an AI distribution task immediately through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'manual publish account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });
    const content = db.contentItems.create({
      title: 'Immediate AI content',
      body: 'Immediate AI body should be adapted into a publish draft.',
      source: 'ai',
      status: 'approved',
      accountId: account.id,
      pluginCode: 'maoxiaoxian',
      styleId: 'mx_healing_emotion',
      mediaJson: [{ path: 'D:/media/immediate.png' }],
    });
    const task = db.distributionTasks.create({
      contentId: content.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-12-01T10:00:00.000Z',
      status: 'queued',
      platformPayload: {
        content: content.body,
        mediaPaths: ['D:/media/immediate.png'],
      },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51859;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/distribution-tasks/${task.id}/publish-now`, {
      method: 'POST',
    });
    const result = await response.json() as { ok: boolean; status: string; message: string };
    const [updatedTask] = db.distributionTasks.list();
    const [post] = db.posts.list();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      ok: false,
      status: 'failed',
      message: 'Publish now currently supports AdsPower accounts only',
    });
    expect(updatedTask).toMatchObject({
      id: task.id,
      legacyPostId: post.id,
      status: 'failed',
      lastError: 'Publish now currently supports AdsPower accounts only',
    });
    expect(post).toMatchObject({
      accountId: account.id,
      content: content.body,
      mediaPaths: ['D:/media/immediate.png'],
    });
    expect(db.publishRuns.listByTask(task.id)).toContainEqual(expect.objectContaining({
      taskId: task.id,
      status: 'failed',
      message: 'Publish now currently supports AdsPower accounts only',
    }));
  });

  test('returns a distribution task back to review through the local api', async () => {
    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'return review account',
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
      title: 'Scheduled content',
      body: 'This scheduled content needs another review.',
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
      scheduledAt: '2026-05-01T12:00:00.000Z',
      status: 'queued',
      platformPayload: { content: content.body },
    });
    const scheduler = new PublishScheduler(db);
    const port = 51855;
    const server = startHttpApi(db, scheduler, port);
    servers.push(server);

    const response = await fetch(`http://127.0.0.1:${port}/distribution-tasks/${task.id}/return-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Need another human check.' }),
    });
    const returned = await response.json() as { status: string; lastError: string };

    expect(response.status).toBe(200);
    expect(returned).toMatchObject({
      status: 'failed',
      lastError: 'Returned to review: Need another human check.',
    });
    expect(db.contentItems.findById(content.id)).toMatchObject({ status: 'reviewing' });
    expect(db.reviewItems.listPending()).toContainEqual(expect.objectContaining({
      contentId: content.id,
      status: 'pending',
      comment: 'Need another human check.',
    }));
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
    const firstContent = db.contentItems.create({
      title: 'Run filter content',
      body: 'Run filter body',
      source: 'manual',
      status: 'ready',
    });
    const secondContent = db.contentItems.create({
      title: 'Other run filter content',
      body: 'Other body',
      source: 'manual',
      status: 'ready',
    });
    const firstTask = db.distributionTasks.create({
      contentId: firstContent.id,
      accountId: account.id,
      platform: 'weibo',
      scheduledAt: '2026-05-01T10:00:00.000Z',
      status: 'failed',
      platformPayload: { content: 'Run filter body' },
    });
    const secondTask = db.distributionTasks.create({
      contentId: secondContent.id,
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
