import type { AppDatabase } from '../../db/database.js';
import type { PublishingStrategy } from '../../../shared/types.js';

export class SchedulingEngine {
  constructor(private db: AppDatabase) {}

  /**
   * 为某一条新生成的内容分配 ScheduledAt 绝对时间戳
   * 采用“水库截流模型”处理冷热启动自适应
   */
  public allocateScheduledTime(workflowCode: string): string {
    const strategy = this.db.publishingStrategies.findByWorkflow(workflowCode);
    const now = new Date();

    // 如果没有配置策略或者策略未激活，默认分配当前时间（即刻执行）
    if (!strategy || !strategy.isActive) {
      return now.toISOString();
    }

    // 1. 获取该栏目最后一条排期记录的预定时间作为锚点
    // 我们需要从几个可能的队列表里找最晚的，这里以 hot_bazi_tasks 或 distribution_tasks 为例
    // 假设系统有个统一的查询逻辑，或者我们直接通过 db raw 查
    // 这里演示查询 distribution_tasks
    let lastScheduledTimeStr = this.getLastScheduledTimeFromDb(workflowCode);
    let anchorTime = lastScheduledTimeStr ? new Date(lastScheduledTimeStr) : now;

    // 2. 冷热启动判断
    const minIntervalMs = strategy.minIntervalMins * 60 * 1000;
    const timeSinceLast = now.getTime() - anchorTime.getTime();

    let baseTime: Date;
    if (timeSinceLast >= minIntervalMs) {
      // 冷启动：很久没发了，不用排队，直接在当前时间安排
      baseTime = now;
    } else {
      // 热运行：还在拥堵，强制排队在队尾之后
      baseTime = new Date(anchorTime.getTime() + minIntervalMs);
    }

    // 3. 时间窗与每日配额检查（简化版：假设总是顺延寻找下一个合法时间点）
    baseTime = this.applyTimeWindowsAndQuota(baseTime, strategy, workflowCode);

    // 4. 加拟人化波动 Jitter
    const finalTime = this.applyJitter(baseTime, strategy.jitterMins);

    return finalTime.toISOString();
  }

  private getLastScheduledTimeFromDb(workflowCode: string): string | null {
    // 联合查询 distribution_tasks 和 hot_bazi_tasks
    // 并通过 content_items 连接到 content_styles，精准匹配 workflowCode
    const sqlite = (this.db as any).sqlite;
    if (!sqlite) return null;

    const row = sqlite.prepare(`
      SELECT scheduledAt FROM (
        SELECT dt.scheduledAt 
        FROM distribution_tasks dt
        JOIN content_items ci ON dt.contentId = ci.id
        JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
        WHERE cs.workflowCode = ?
        UNION ALL
        SELECT ht.scheduledAt 
        FROM hot_bazi_tasks ht
        JOIN content_items ci ON ht.contentId = ci.id
        JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
        WHERE cs.workflowCode = ?
      )
      ORDER BY scheduledAt DESC LIMIT 1
    `)?.get(workflowCode, workflowCode) as { scheduledAt: string } | undefined;

    return row?.scheduledAt || null;
  }

  private applyTimeWindowsAndQuota(time: Date, strategy: PublishingStrategy, workflowCode: string): Date {
    let currentTime = new Date(time.getTime());
    let iterations = 0;
    const sqlite = (this.db as any).sqlite;
    
    // 安全熔断，防止无限循环
    while (iterations < 60) {
      iterations++;
      
      // 1. 时间窗校验 (Time Windows Check)
      const timeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      let inWindow = false;
      let nextWindowStart: string | null = null;
      let nextWindowIsTomorrow = false;

      if (!strategy.activeTimeRangesJson || strategy.activeTimeRangesJson.length === 0) {
        inWindow = true; // 未设置时间窗则全天不限
      } else {
        const sortedRanges = [...strategy.activeTimeRangesJson].sort((a, b) => a[0].localeCompare(b[0]));
        for (const [start, end] of sortedRanges) {
          if (timeStr >= start && timeStr <= end) {
            inWindow = true;
            break;
          }
        }
        
        if (!inWindow) {
          // 寻找今天内最近的下一个合法时间窗
          for (const [start] of sortedRanges) {
            if (start > timeStr) {
              nextWindowStart = start;
              break;
            }
          }
          // 如果今天没有合法时间窗了，顺延到明天的第一个合法时间窗
          if (!nextWindowStart) {
            nextWindowStart = sortedRanges[0][0];
            nextWindowIsTomorrow = true;
          }
        }
      }

      if (!inWindow && nextWindowStart) {
        const [hh, mm] = nextWindowStart.split(':').map(Number);
        if (nextWindowIsTomorrow) {
          currentTime.setDate(currentTime.getDate() + 1);
        }
        currentTime.setHours(hh, mm, 0, 0);
        continue; // 调整了时间后，重新进入大循环验证（因为跨天后需要重新查配额）
      }

      // 2. 每日配额校验 (Daily Quota Check)
      if (sqlite && strategy.maxDailyPosts > 0) {
        const dateStr = currentTime.toISOString().split('T')[0]; // YYYY-MM-DD
        const startOfDay = `${dateStr}T00:00:00.000Z`;
        const endOfDay = `${dateStr}T23:59:59.999Z`;

        const countRow = sqlite.prepare(`
          SELECT COUNT(*) as count FROM (
            SELECT dt.scheduledAt 
            FROM distribution_tasks dt
            JOIN content_items ci ON dt.contentId = ci.id
            JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
            WHERE cs.workflowCode = ? AND dt.scheduledAt >= ? AND dt.scheduledAt <= ?
            UNION ALL
            SELECT ht.scheduledAt 
            FROM hot_bazi_tasks ht
            JOIN content_items ci ON ht.contentId = ci.id
            JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
            WHERE cs.workflowCode = ? AND ht.scheduledAt >= ? AND ht.scheduledAt <= ?
          )
        `).get(workflowCode, startOfDay, endOfDay, workflowCode, startOfDay, endOfDay) as { count: number } | undefined;
        
        const currentDayCount = countRow?.count || 0;
        
        if (currentDayCount >= strategy.maxDailyPosts) {
          // 今日排期已满额，将时间强制跨度到第二天的最早可用时间
          currentTime.setDate(currentTime.getDate() + 1);
          if (strategy.activeTimeRangesJson && strategy.activeTimeRangesJson.length > 0) {
            const sortedRanges = [...strategy.activeTimeRangesJson].sort((a, b) => a[0].localeCompare(b[0]));
            const [hh, mm] = sortedRanges[0][0].split(':').map(Number);
            currentTime.setHours(hh, mm, 0, 0);
          } else {
            currentTime.setHours(0, 0, 0, 0);
          }
          continue; // 跨天后重进大循环
        }
      }

      // 如果既符合时间窗，又没超配额，则寻路成功
      break;
    }

    return currentTime;
  }

  private applyJitter(time: Date, jitterMins: number): Date {
    if (jitterMins <= 0) return time;
    const jitterMs = jitterMins * 60 * 1000;
    const randomOffset = (Math.random() * 2 - 1) * jitterMs; // -jitter 到 +jitter
    return new Date(time.getTime() + randomOffset);
  }
}
