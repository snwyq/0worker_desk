import type { AppDatabase } from '../db/database.js';
import type { PlatformCode, PostStatus } from '../../shared/types.js';
import { publishPostNow } from './PublishService.js';

export interface SchedulerStatus {
  running: boolean;
  intervalMs: number;
  lastRunAt: string;
  lastMessage: string;
}

export class PublishScheduler {
  private timer: NodeJS.Timeout | null = null;
  private working = false;
  private status: SchedulerStatus = {
    running: false,
    intervalMs: 30_000,
    lastRunAt: '',
    lastMessage: 'Scheduler is stopped',
  };

  constructor(private readonly repositories: AppDatabase) {}

  start(intervalMs = Number(this.repositories.settings.get('scheduler.intervalMs') ?? 30_000)) {
    if (this.timer) {
      return this.getStatus();
    }

    this.status = {
      ...this.status,
      running: true,
      intervalMs,
      lastMessage: 'Scheduler started',
    };
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    void this.tick();
    return this.getStatus();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.status = {
      ...this.status,
      running: false,
      lastMessage: 'Scheduler stopped',
    };
    return this.getStatus();
  }

  getStatus() {
    return { ...this.status };
  }

  async runOnce(nowIso = new Date().toISOString()) {
    this.status.lastRunAt = nowIso;
    await this.processDueDistributionTasks(nowIso);
    return this.getStatus();
  }

  async publishTaskNow(taskId: number) {
    const task = this.repositories.distributionTasks.list().find((item: any) => item.id === taskId);
    if (!task) {
      return { ok: false, message: `Distribution task ${taskId} was not found`, status: 'failed' as const };
    }

    const account = this.repositories.accounts.findById(task.accountId);
    if (!account) {
      this.recordTaskRun(task.id, task.accountId, task.platform, 'failed', `Account ${task.accountId} was not found`);
      return { ok: false, message: `Account ${task.accountId} was not found`, status: 'failed' as const };
    }

    if (account.status !== 'active') {
      this.recordTaskRun(task.id, task.accountId, task.platform, 'needs_manual_action', 'Account is not active');
      return { ok: false, message: 'Account is not active', status: 'needs_manual_action' as const };
    }

    const post = task.legacyPostId
      ? this.repositories.posts.findById(task.legacyPostId)
      : this.repositories.distributionTasks.ensureLegacyPost(task.id);
    if (!post) {
      this.recordTaskRun(task.id, task.accountId, task.platform, 'failed', `Post ${task.legacyPostId} was not found`);
      return { ok: false, message: `Post ${task.legacyPostId} was not found`, status: 'failed' as const };
    }

    const result = await publishPostNow(this.repositories, post.id, { ignoreSchedule: true });
    if (!result.status) {
      this.recordTaskRun(task.id, task.accountId, task.platform, 'failed', result.message);
      return { ...result, status: 'failed' as const };
    }
    return result;
  }

  private async tick() {
    if (this.working) {
      return;
    }

    this.working = true;

    try {
      await this.runOnce();
    } catch (error) {
      this.status.lastMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.working = false;
    }
  }

  private async processDueDistributionTasks(nowIso: string) {
    const dueTasks = this.repositories.distributionTasks.listDue(nowIso);
    if (!dueTasks.length) {
      this.status.lastMessage = 'No due distribution tasks';
      return;
    }

    let published = 0;
    for (const task of dueTasks) {
      const account = this.repositories.accounts.findById(task.accountId);
      if (!account) {
        this.recordTaskRun(task.id, task.accountId, task.platform, 'failed', `Account ${task.accountId} was not found`);
        continue;
      }

      if (account.status !== 'active') {
        this.recordTaskRun(task.id, task.accountId, task.platform, 'needs_manual_action', 'Account is not active');
        continue;
      }

      if (task.legacyPostId) {
        const result = await publishPostNow(this.repositories, task.legacyPostId, { ignoreSchedule: false });
        if (result.ok) {
          published += 1;
        } else if (!result.status) {
          this.recordTaskRun(task.id, task.accountId, task.platform, 'failed', result.message);
        }
        continue;
      }

      const post = this.repositories.distributionTasks.ensureLegacyPost(task.id);
      const result = await publishPostNow(this.repositories, post.id, { ignoreSchedule: false });
      if (result.ok) {
        published += 1;
      } else if (!result.status) {
        this.recordTaskRun(task.id, task.accountId, task.platform, 'failed', result.message);
      }
    }

    this.status.lastMessage = `Processed ${dueTasks.length} due distribution task(s), published ${published}`;
  }

  private recordTaskRun(
    taskId: number,
    accountId: number,
    platform: PlatformCode,
    status: PostStatus,
    message: string,
  ) {
    const startedAt = new Date().toISOString();
    this.repositories.distributionTasks.updateStatus(taskId, status, status === 'failed' || status === 'needs_manual_action' ? message : '');
    this.repositories.publishRuns.create({
      taskId,
      accountId,
      platform,
      status,
      message,
      startedAt,
      finishedAt: new Date().toISOString(),
      screenshotPath: '',
    });
  }
}
