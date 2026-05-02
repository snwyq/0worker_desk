import type { AppDatabase } from '../db/database.js';
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

  private async tick() {
    if (this.working) {
      return;
    }

    this.working = true;
    this.status.lastRunAt = new Date().toISOString();

    try {
      const duePosts = this.repositories.posts.listDue(this.status.lastRunAt);
      if (!duePosts.length) {
        this.status.lastMessage = 'No due posts';
        return;
      }

      let published = 0;
      for (const post of duePosts) {
        const result = await publishPostNow(this.repositories, post.id, { ignoreSchedule: false });
        if (result.ok) {
          published += 1;
        }
      }

      this.status.lastMessage = `Processed ${duePosts.length} due post(s), published ${published}`;
    } catch (error) {
      this.status.lastMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.working = false;
    }
  }
}
