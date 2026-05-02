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
