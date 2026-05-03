import type { BaseWorkflowNode, WorkflowContext } from '../workflow/types.js';

export interface ITool<T extends BaseWorkflowNode = BaseWorkflowNode> {
  execute(node: T, context: WorkflowContext): Promise<void>;
}
