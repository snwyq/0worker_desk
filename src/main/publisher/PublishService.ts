import type { PublishNowResult } from '../../shared/types.js';
import { startAdsPowerBrowser } from '../browser/AdsPowerApi.js';
import type { AppDatabase } from '../db/database.js';
import { fillWeiboDraft, publishWeiboDraft } from './RawWeiboPublisher.js';
import { shouldPublishPost } from './PublishWorker.js';

interface PublishOptions {
  ignoreSchedule?: boolean;
}

export async function publishPostNow(repositories: AppDatabase, postId: number, options: PublishOptions = {}): Promise<PublishNowResult> {
  const post = repositories.posts.findById(postId);
  if (!post) {
    return { ok: false, message: `Post ${postId} was not found` };
  }

  const account = repositories.accounts.findById(post.accountId);
  if (!account) {
    return { ok: false, message: `Account ${post.accountId} was not found` };
  }

  if (post.status === 'published') {
    return { ok: false, message: 'Post is already published', status: 'published' };
  }

  const postForManualAttempt = options.ignoreSchedule
    ? { ...post, status: 'queued' as const, scheduledAt: new Date(0).toISOString() }
    : post;
  const decision = shouldPublishPost(postForManualAttempt, account, new Date().toISOString());
  if (!decision.ok) {
    return { ok: false, message: decision.reason ?? 'Post cannot be published now' };
  }

  if (account.browserMode !== 'adspower') {
    return { ok: false, message: 'Publish now currently supports AdsPower accounts only' };
  }

  try {
    repositories.posts.updateStatus(post.id, 'publishing');
    const browserInfo = await startAdsPowerBrowser(account);
    const draft = await fillWeiboDraft(browserInfo, post);
    if (!draft.ok) {
      repositories.posts.updateStatus(post.id, 'failed', draft.message);
      return { ok: false, message: draft.message, status: 'failed' };
    }

    const result = await publishWeiboDraft(browserInfo);
    if (!result.ok) {
      repositories.posts.updateStatus(post.id, 'failed', result.message);
      return { ok: false, message: result.message, status: 'failed' };
    }

    repositories.posts.updateStatus(post.id, 'published', result.message);
    return { ok: true, message: result.message, status: 'published' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    repositories.posts.updateStatus(post.id, 'failed', message);
    return { ok: false, message, status: 'failed' };
  }
}
