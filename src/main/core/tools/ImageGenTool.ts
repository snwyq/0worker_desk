import { AiService } from '../../services/AiService.js';
import type { ITool } from './ITool.js';
import type { BaseWorkflowNode, WorkflowContext } from '../workflow/types.js';

export interface ImageGenNode extends BaseWorkflowNode {
  type: 'image_gen';
  prompt: string;
  model?: string;
  outputKey: string;
}

export class ImageGenTool implements ITool<ImageGenNode> {
  async execute(node: ImageGenNode, context: WorkflowContext): Promise<void> {
    const aiService = new AiService();
    
    // 解析 prompt 中的模板变量
    let finalPrompt = node.prompt;
    if (finalPrompt.includes('{{')) {
      finalPrompt = finalPrompt.replace(/\{\{state\.(.*?)\}\}/g, (_, path) => {
        const keys = path.split('.');
        let val: any = context.state;
        for (const key of keys) {
          val = val?.[key];
        }
        return String(val || '');
      });
    }

    const result = await aiService.generateImage({
      prompt: finalPrompt,
      size: '1024x1024'
    });

    const imageUrl = typeof result === 'string' ? result : (result as any).url;

    context.state[node.outputKey] = imageUrl;
    context.onLog?.({
      level: 'success',
      message: `Image generated successfully: ${imageUrl}`,
      time: new Date().toISOString()
    });
  }
}
