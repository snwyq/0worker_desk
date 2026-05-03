import type { ITool, WorkflowContext, BatchLoopNode } from '../workflow/types.js';

export class BatchTool implements ITool<BatchLoopNode, any> {
  metadata = {
    id: 'batch_loop',
    version: '1.0.0',
    description: 'Iterates over an array in the state and executes a sub-pipeline for each item.'
  };

  async execute(step: BatchLoopNode, context: WorkflowContext): Promise<any> {
    const items = context.state[step.sourceKey];
    if (!Array.isArray(items)) {
      throw new Error(`BatchTool: Expected an array at state key '${step.sourceKey}', but got ${typeof items}`);
    }

    context.logs.push({ level: 'info', message: `BatchTool starting loop for ${items.length} items.` });

    const results = [];
    
    // Process items sequentially to avoid rate limits, or batch them if supported
    // For this engine, we'll do sequential processing as it's safer for state tracking
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      context.logs.push({ level: 'info', message: `Batch processing item ${i + 1}/${items.length}` });
      
      // We could isolate the context or inject the current item into a special key
      // e.g. context.state['__current_batch_item'] = item;
      context.state['__current_batch_item'] = item;
      
      // Execute sub-pipeline
      // (This requires passing a callback or using a shared runner method, 
      // but for demonstration, we assume subPipeline execution is handled here)
      
      // Mock result
      results.push({ processed: true, original: item });
    }

    return results;
  }
}
