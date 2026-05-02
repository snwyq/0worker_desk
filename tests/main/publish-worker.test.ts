import { describe, expect, test } from 'vitest';
import { shouldPublishPost } from '../../src/main/publisher/PublishWorker.js';
import type { Account, Post } from '../../src/shared/types.js';

const account: Account = {
  id: 1,
  name: 'demo',
  platform: 'weibo',
  browserMode: 'manual_port',
  providerProfileId: '',
  wsEndpoint: '',
  debuggingPort: 9222,
  status: 'active',
  healthMessage: '',
  lastCheckedAt: '',
  manualActionReason: '',
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
