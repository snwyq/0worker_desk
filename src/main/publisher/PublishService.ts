import type { PublishNowResult } from '../../shared/types.js';
import { startAdsPowerBrowser } from '../browser/AdsPowerApi.js';
import type { AppDatabase } from '../db/database.js';
import { fillWeiboDraft, publishWeiboDraft } from './RawWeiboPublisher.js';
import { shouldPublishPost } from './PublishWorker.js';

interface PublishOptions {
  ignoreSchedule?: boolean;
  logPath?: string;
}

export async function publishPostNow(repositories: AppDatabase, postId: number, options: PublishOptions = {}): Promise<PublishNowResult> {
  const startedAt = new Date().toISOString();
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
    recordRun(repositories, post.id, 'publishing', 'Starting automated publish...', startedAt);
    const browserInfo = await startAdsPowerBrowser(account, repositories);
    const draft = await fillWeiboDraft(browserInfo, post, { logPath: options.logPath });
    if (!draft.ok) {
      repositories.posts.updateStatus(post.id, 'failed', draft.message);
      recordRun(repositories, post.id, 'failed', draft.message, startedAt);
      return { ok: false, message: draft.message, status: 'failed' };
    }

    const result = await publishWeiboDraft(browserInfo, {
      hasMedia: post.mediaPaths.length > 0,
      mediaCount: post.mediaPaths.length,
      logPath: options.logPath,
    });
    if (!result.ok) {
      repositories.posts.updateStatus(post.id, 'failed', result.message);
      recordRun(repositories, post.id, 'failed', result.message, startedAt);
      return { ok: false, message: result.message, status: 'failed' };
    }

    repositories.posts.updateStatus(post.id, 'published', result.message);
    recordRun(repositories, post.id, 'published', result.message, startedAt);
    return { ok: true, message: result.message, status: 'published' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    repositories.posts.updateStatus(post.id, 'failed', message);
    recordRun(repositories, post.id, 'failed', message, startedAt);
    return { ok: false, message, status: 'failed' };
  }
}

function recordRun(repositories: AppDatabase, postId: number, status: NonNullable<PublishNowResult['status']>, message: string, startedAt: string) {
  const task = repositories.distributionTasks.list().find((item) => item.legacyPostId === postId);
  if (!task) {
    return;
  }

  repositories.distributionTasks.updateStatus(task.id, status, status === 'failed' ? message : '');
  repositories.publishRuns.create({
    taskId: task.id,
    accountId: task.accountId,
    platform: task.platform,
    status,
    message,
    startedAt,
    finishedAt: new Date().toISOString(),
    screenshotPath: '',
  });
}
