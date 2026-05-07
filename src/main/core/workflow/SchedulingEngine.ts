import type { AppDatabase } from '../../db/database.js';
import type { PublishingStrategy } from '../../../shared/types.js';

export class SchedulingEngine {
  constructor(private db: AppDatabase) {}

  // 内存锚点缓存，防止高并发下 DB 还没写入导致的“时间撞车”
  private static lastAllocatedMap: Map<string, string> = new Map();

  /**
   * 为某一条新生成的内容分配 ScheduledAt 绝对时间戳
   * 采用“水库截流模型”处理冷热启动自适应
   */
  public allocateScheduledTime(workflowCode: string): string {
    const strategy = this.db.publishingStrategies.findByWorkflow(workflowCode);
    const now = new Date();
    
    console.log(`[SchedulingEngine] Allocating for ${workflowCode}. Strategy:`, strategy ? {
      maxDaily: strategy.maxDailyPosts,
      interval: strategy.minIntervalMins,
      windows: strategy.activeTimeRangesJson
    } : 'NONE');

    // 如果没有配置策略或者策略未激活，默认分配当前时间（即刻执行）
    if (!strategy || !strategy.isActive) {
      return now.toISOString();
    }

    // 1. 获取该栏目最后一条排期记录的预定时间作为锚点
    // 同时考虑 DB 记录和内存中的最新分配记录，取较晚的一个
    const dbLastTime = this.getLastScheduledTimeFromDb(workflowCode);
    const memLastTime = SchedulingEngine.lastAllocatedMap.get(workflowCode) || null;
    
    let lastScheduledTimeStr = dbLastTime;
    if (memLastTime && (!dbLastTime || memLastTime > dbLastTime)) {
      lastScheduledTimeStr = memLastTime;
    }

    let anchorTime = lastScheduledTimeStr ? new Date(lastScheduledTimeStr) : now;
    
    console.log(`[SchedulingEngine] Last scheduled (DB: ${dbLastTime || 'NONE'}, MEM: ${memLastTime || 'NONE'}). Anchor: ${anchorTime.toISOString()}`);

    // 2. 冷热启动判断
    const minIntervalMs = strategy.minIntervalMins * 60 * 1000;
    const timeSinceLast = now.getTime() - anchorTime.getTime();

    let baseTime: Date;
    if (timeSinceLast >= minIntervalMs) {
      // 冷启动：从“现在 + 间隔”开始
      baseTime = new Date(now.getTime() + minIntervalMs);
      console.log(`[SchedulingEngine] Cold start. BaseTime = Now + ${strategy.minIntervalMins}m`);
    } else {
      // 热运行：紧跟队尾。但也必须确保不早于“现在 + 间隔”，防止堆积的任务时间戳过旧
      const nextPossibleTime = anchorTime.getTime() + minIntervalMs;
      const minLeadTime = now.getTime() + minIntervalMs;
      baseTime = new Date(Math.max(nextPossibleTime, minLeadTime));
      console.log(`[SchedulingEngine] Hot running. BaseTime = max(Anchor+Interval, Now+Interval) -> ${baseTime.toISOString()}`);
    }

    // 3. 时间窗与每日配额检查
    const beforeCheck = baseTime.toISOString();
    baseTime = this.applyTimeWindowsAndQuota(baseTime, strategy, workflowCode);
    if (baseTime.toISOString() !== beforeCheck) {
      console.log(`[SchedulingEngine] Time adjusted by Windows/Quota: ${beforeCheck} -> ${baseTime.toISOString()}`);
    }

    // 4. 加拟人化波动 Jitter
    let finalTime = this.applyJitter(baseTime, strategy.jitterMins);

    // 5. 终极兜底：确保最终时间至少在“现在”之后 2 分钟，防止因为 Jitter 减得太多导致超时
    const absoluteMin = new Date(now.getTime() + 120000); 
    if (finalTime < absoluteMin) {
      console.log(`[SchedulingEngine] Final time ${finalTime.toISOString()} was too close to past. Clamping to ${absoluteMin.toISOString()}`);
      finalTime = absoluteMin;
    }

    const finalIso = finalTime.toISOString();
    // 更新内存锚点
    SchedulingEngine.lastAllocatedMap.set(workflowCode, finalIso);
    
    return finalIso;
  }

  private getLastScheduledTimeFromDb(workflowCode: string): string | null {
    const sqlite = (this.db as any).sqlite;
    if (!sqlite) return null;

    const row = sqlite.prepare(`
      SELECT scheduledAt FROM (
        SELECT dt.scheduledAt 
        FROM distribution_tasks dt
        JOIN content_items ci ON dt.contentId = ci.id
        JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
        WHERE cs.workflowCode = ? AND dt.status NOT IN ('cancelled', 'failed')
        UNION ALL
        SELECT ht.scheduledAt 
        FROM hot_bazi_tasks ht
        JOIN content_items ci ON ht.contentId = ci.id
        JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
        WHERE cs.workflowCode = ? AND ht.status NOT IN ('cancelled', 'failed')
      )
      WHERE scheduledAt IS NOT NULL AND scheduledAt != ''
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
        const oldTime = currentTime.toISOString();
        if (nextWindowIsTomorrow) {
          currentTime.setDate(currentTime.getDate() + 1);
        }
        currentTime.setHours(hh, mm, 0, 0);
        console.log(`[SchedulingEngine] Out of window. Jumping from ${oldTime} to ${currentTime.toISOString()}`);
        continue;
      }

      // 2. 每日配额校验 (Daily Quota Check)
      if (sqlite && strategy.maxDailyPosts > 0) {
        const startOfDayDate = new Date(currentTime);
        startOfDayDate.setHours(0, 0, 0, 0);
        const endOfDayDate = new Date(startOfDayDate);
        endOfDayDate.setDate(endOfDayDate.getDate() + 1);

        const startOfDay = startOfDayDate.toISOString();
        const endOfDay = endOfDayDate.toISOString();

        const countRow = sqlite.prepare(`
          SELECT COUNT(*) as count FROM (
            SELECT dt.scheduledAt 
            FROM distribution_tasks dt
            JOIN content_items ci ON dt.contentId = ci.id
            JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
            WHERE cs.workflowCode = ? 
              AND dt.scheduledAt >= ? AND dt.scheduledAt <= ?
              AND dt.status NOT IN ('cancelled', 'failed')
            UNION ALL
            SELECT ht.scheduledAt 
            FROM hot_bazi_tasks ht
            JOIN content_items ci ON ht.contentId = ci.id
            JOIN content_styles cs ON ci.styleId = cs.id AND ci.pluginCode = cs.pluginCode
            WHERE cs.workflowCode = ? 
              AND ht.scheduledAt >= ? AND ht.scheduledAt <= ?
              AND ht.status NOT IN ('cancelled', 'failed')
          )
        `).get(workflowCode, startOfDay, endOfDay, workflowCode, startOfDay, endOfDay) as { count: number } | undefined;
        
        const currentDayCount = countRow?.count || 0;
        console.log(`[SchedulingEngine] Quota check for ${startOfDay.split('T')[0]}: ${currentDayCount}/${strategy.maxDailyPosts}`);
        
        if (currentDayCount >= strategy.maxDailyPosts) {
          const oldTime = currentTime.toISOString();
          currentTime.setDate(currentTime.getDate() + 1);
          if (strategy.activeTimeRangesJson && strategy.activeTimeRangesJson.length > 0) {
            const sortedRanges = [...strategy.activeTimeRangesJson].sort((a, b) => a[0].localeCompare(b[0]));
            const [hh, mm] = sortedRanges[0][0].split(':').map(Number);
            currentTime.setHours(hh, mm, 0, 0);
          } else {
            currentTime.setHours(0, 0, 0, 0);
          }
          console.log(`[SchedulingEngine] Quota full. Jumping from ${oldTime} to ${currentTime.toISOString()}`);
          continue; 
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
