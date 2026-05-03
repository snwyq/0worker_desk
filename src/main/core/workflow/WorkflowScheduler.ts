import type { AppDatabase } from '../../db/database.js';
import type { WorkflowRunner } from './WorkflowRunner.js';
import type { AiWorkflowRun } from '../../../shared/types.js';

export class WorkflowScheduler {
  private db: AppDatabase;
  private runner: WorkflowRunner;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private activeRuns = new Set<string>(); // "pluginCode:workflowCode"

  constructor(db: AppDatabase, runner: WorkflowRunner) {
    this.db = db;
    this.runner = runner;
  }

  /**
   * 启动调度器轮询
   */
  public start(intervalMs = 60000) { // 默认每分钟检查一次
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[WorkflowScheduler] Started.');
    this.timer = setInterval(() => this.checkAndRun(), intervalMs);
    // 启动时立即检查一次
    this.checkAndRun();
  }

  /**
   * 停止调度器
   */
  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[WorkflowScheduler] Stopped.');
  }

  /**
   * 检查哪些工作流需要执行
   */
  private async checkAndRun() {
    try {
      // 1. 获取所有配置了自动触发的工作流
      // 这里的逻辑假设我们在数据库中存储了工作流定义及其频率
      const workflows = this.db.aiWorkflows.list();
      
      for (const wfRecord of workflows) {
        const def = {
          ...(wfRecord.definitionJson as any),
          pluginCode: wfRecord.pluginCode,
          workflowId: wfRecord.code,
        };
        if (def.trigger !== 'auto' && def.trigger !== 'cron') continue;

        const lockKey = `${wfRecord.pluginCode}:${wfRecord.code}`;
        if (this.activeRuns.has(lockKey)) {
          console.log(`[WorkflowScheduler] Workflow ${lockKey} is already running, skipping...`);
          continue;
        }

        // 2. 检查频率限制 (例如: 1/day)
        const shouldRun = await this.evaluateFrequency(wfRecord.pluginCode, wfRecord.code, def.frequency);
        
        if (shouldRun) {
          console.log(`[WorkflowScheduler] Triggering workflow: ${wfRecord.code}`);
          this.activeRuns.add(lockKey);
          
          try {
            // 3. 获取该插件关联的账号 (如果有)
            const accounts = this.db.accounts.listByPlugin(wfRecord.pluginCode);
            
            if (accounts.length === 0) {
              await this.runner.start(def, null, { userBirth: '1995-06-15 12:00:00' });
            } else {
              for (const account of accounts) {
                const runParams = {
                  userBirth: '1995-06-15 12:00:00',
                  ...(account.aiConfigJson || {})
                };
                await this.runner.start(def, account.id, runParams);
              }
            }
          } finally {
            this.activeRuns.delete(lockKey);
          }
        }
      }
    } catch (error) {
      console.error('[WorkflowScheduler] Error in checkAndRun:', error);
    }
  }

  /**
   * 频率计算逻辑
   */
  private async evaluateFrequency(pluginCode: string, workflowCode: string, frequency: string): Promise<boolean> {
    if (!frequency) return false;

    // 获取最近一次成功的运行记录
    const lastRuns = this.db.aiWorkflowRuns.listByWorkflow(pluginCode, workflowCode);
    const lastSuccess = lastRuns.find((r: AiWorkflowRun) => r.status === 'completed');

    if (!lastSuccess) return true; // 从未运行成功过，立即运行

    const lastTime = new Date(lastSuccess.startedAt).getTime();
    const now = Date.now();

    if (frequency === '1/day') {
      const oneDayMs = 24 * 60 * 60 * 1000;
      return (now - lastTime) >= oneDayMs;
    }

    if (frequency === '1/hour') {
      const oneHourMs = 60 * 60 * 1000;
      return (now - lastTime) >= oneHourMs;
    }

    // 更多复杂的 cron 逻辑可以在此扩展
    return false;
  }
}
