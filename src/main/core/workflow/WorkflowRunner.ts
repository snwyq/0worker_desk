import { randomUUID } from 'node:crypto';
import type { AppDatabase } from '../../db/database.js';
import type { WorkflowContext, WorkflowDefinition, WorkflowNode } from './types.js';

export class WorkflowRunner {
  private db: AppDatabase;
  private tools: Map<string, any> = new Map();

  constructor(db: AppDatabase) {
    this.db = db;
  }

  /**
   * 注册能力节点 (Tool)
   */
  public registerTool(toolType: string, toolInstance: any) {
    this.tools.set(toolType, toolInstance);
  }

  /**
   * 初始化并启动工作流
   */
  public async start(
    workflowDef: WorkflowDefinition, 
    accountId: number | null, 
    initialParams: Record<string, any>,
    onLog?: (log: any) => void
  ): Promise<string> {
    const runId = randomUUID();
    
    const context: WorkflowContext = {
      runId,
      workflowId: workflowDef.workflowId,
      accountId,
      state: { ...initialParams },
      logs: [],
      config: {},
      onLog
    };

    if (accountId) {
      const account = this.db.accounts.findById(accountId);
      if (account) {
        context.config = account.aiConfigJson || {};
      }
    }

    // Persist Initial Run State
    this.db.aiWorkflowRuns.create({
      runId,
      pluginCode: workflowDef.pluginCode,
      workflowCode: workflowDef.workflowId,
      accountId,
      startedAt: new Date().toISOString()
    });
    this.db.aiWorkflowRuns.updateStatus(runId, 'running', context.state, context.logs);

    // Start Execution asynchronously
    this.runInternal(workflowDef.steps, context).catch((err) => {
      console.error(`[WorkflowRunner] Fatal error in run ${runId}:`, err);
      context.logs.push({ level: 'fatal', message: String(err), time: new Date().toISOString() });
      this.db.aiWorkflowRuns.updateStatus(runId, 'failed', context.state, context.logs, new Date().toISOString());
    });

    return runId;
  }

  private async runInternal(steps: WorkflowNode[], context: WorkflowContext): Promise<void> {
    await this.executePipeline(steps, context);
    this.db.aiWorkflowRuns.updateStatus(context.runId, 'completed', context.state, context.logs, new Date().toISOString());
  }

  /**
   * 执行流水线（支持递归调用）
   */
  public async executePipeline(steps: WorkflowNode[], context: WorkflowContext): Promise<void> {
    for (const step of steps) {
      await this.executeStep(step, context);
      // Save checkpoint after each step
      this.db.aiWorkflowRuns.updateStatus(context.runId, 'running', context.state, context.logs);
    }
  }

  /**
   * 路由并执行单个节点
   */
  private async executeStep(step: WorkflowNode, context: WorkflowContext): Promise<void> {
    const logEntry = { level: 'info' as const, message: `Executing step: ${step.id} (${step.type})`, time: new Date().toISOString() };
    context.logs.push(logEntry);
    if (context.onLog) context.onLog(logEntry);
    
    try {
      if (step.type === 'batch_loop') {
        const items = context.state[step.sourceKey];
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
             context.logs.push({ level: 'info', message: `[Batch] Processing item ${i+1}/${items.length}`, time: new Date().toISOString() });
             const subContext = { ...context, state: { ...context.state, item: items[i] } };
             await this.executePipeline(step.subPipeline, subContext);
             // 合并回主状态（可选）
          }
          return;
        }
      }

      const tool = this.tools.get(step.type);
      if (!tool) {
        throw new Error(`Tool not registered: ${step.type}`);
      }

      // 执行具体的 Tool 逻辑
      const result = await tool.execute(step, context);
      
      // 如果 Tool 需要直接写入 context state (比如 LLM 输出)
      if ('outputKey' in step && step.outputKey) {
        context.state[step.outputKey] = result;
      }
      
    } catch (error) {
      context.logs.push({ level: 'error', message: `Step ${step.id} failed: ${String(error)}`, time: new Date().toISOString() });
      
      if ('retryOnFailure' in step && step.retryOnFailure) {
        // 简易重试逻辑 (可升级)
        context.logs.push({ level: 'info', message: `Retrying step ${step.id}...`, time: new Date().toISOString() });
        // await sleep(1000); // Wait before retry
        // throw error for now to stop pipeline
      }
      
      throw error;
    }
  }

}
