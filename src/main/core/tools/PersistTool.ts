import { extractGeneratedContent } from '../../../shared/aiOutput.js';
import type { AppDatabase } from '../../db/database.js';
import { decideReviewPolicy } from '../review/ReviewPolicy.js';
import type { ITool, WorkflowContext, WorkflowNode } from '../workflow/types.js';

export class PersistTool implements ITool<any, any> {
  metadata = {
    id: 'persist',
    version: '1.0.0',
    description: 'Persist data to the global cache / database pool.'
  };

  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  async execute(step: WorkflowNode & { type: 'persist' }, context: WorkflowContext): Promise<boolean> {
    const normalized = extractGeneratedContent(context.state);
    const dataToSave = context.state[step.dataKey] ?? normalized?.content;
    if (!dataToSave) {
      context.logs.push({ level: 'warning', message: `PersistTool: No data found at context.state['${step.dataKey}']` });
      return false;
    }

    context.logs.push({ level: 'info', message: `PersistTool saving data to table ${step.table}` });

    // Mocking the persist logic since we don't have a generic key-value store yet
    // In reality, this would insert into `content_items` or a dedicated `ai_data_pool` table.
    
    // Example: if table == 'content_items', we can create a draft.
    if (step.table === 'content_items') {
      let title = `Auto-generated from ${context.workflowId}`;
      if (typeof dataToSave === 'object' && dataToSave.title) {
        title = String(dataToSave.title);
      }
      const styleId = typeof context.state.styleId === 'string' ? context.state.styleId : '';
      const style = styleId ? this.db.contentStyles.findById(styleId) : null;
      const riskJson = typeof context.state.riskJson === 'object' && context.state.riskJson !== null
        ? context.state.riskJson as Record<string, unknown>
        : {};
      const riskScore = typeof riskJson.score === 'number' && Number.isFinite(riskJson.score) ? riskJson.score : 0;
      const reviewDecision = decideReviewPolicy({
        requestedMode: context.state.reviewMode,
        stylePolicy: style?.reviewPolicyJson,
        riskScore,
        seed: `${context.runId}:${styleId}:${typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave)}`,
      });
      const topic = typeof context.state.topic === 'string' && context.state.topic.trim()
        ? context.state.topic.trim()
        : '';
      
      const content = this.db.contentItems.create({
        title,
        body: typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave),
        source: 'ai',
        status: reviewDecision.contentStatus,
        tenantId: style?.tenantId ?? '',
        accountId: context.accountId,
        pluginCode: typeof context.state.pluginCode === 'string' ? context.state.pluginCode : '',
        styleId,
        runId: context.runId,
        topicsJson: topic ? [topic] : [],
        sourceJson: typeof context.state.sourceJson === 'object' && context.state.sourceJson !== null
          ? context.state.sourceJson
          : { workflowCode: context.workflowId },
        riskJson,
      });

      if (reviewDecision.createReview) {
        this.db.reviewItems.create({
          contentId: content.id,
          reviewMode: reviewDecision.reviewMode,
          status: 'pending',
          comment: reviewDecision.comment,
        });
      } else if (reviewDecision.contentStatus === 'approved') {
        this.db.distributionTasks.enqueueContent(content.id, 'auto_approved');
      }

      context.state.persistedContentId = content.id;
    }

    return true;
  }
}
