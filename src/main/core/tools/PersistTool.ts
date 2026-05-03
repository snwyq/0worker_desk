import type { AppDatabase } from '../../db/database.js';
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
    const dataToSave = context.state[step.dataKey];
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
        title = dataToSave.title;
      }
      
      this.db.contentItems.create({
        title,
        body: typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave),
        source: 'ai',
        status: 'draft'
      });
    }

    return true;
  }
}
