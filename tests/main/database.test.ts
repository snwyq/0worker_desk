import { describe, expect, test } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';

describe('database repositories', () => {
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
