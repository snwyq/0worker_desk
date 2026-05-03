import { aiService } from '../../services/AiService.js';
import type { ITool, WorkflowContext, WorkflowNode } from '../workflow/types.js';

export class LlmTool implements ITool<any, any> {
  metadata = {
    id: 'llm',
    version: '1.0.0',
    description: 'Text generation node powered by DashScope / APIYi with fallback routing.'
  };

  async execute(step: WorkflowNode & { type: 'llm' }, context: WorkflowContext): Promise<string> {
    // 1. 获取动态配置的 Prompt (可覆盖)
    let rawPrompt = step.prompt;
    if (context.config && context.config.systemPromptOverride) {
      rawPrompt = context.config.systemPromptOverride + '\n\n' + rawPrompt;
    }

    // 2. 注入上下文变量
    const finalPrompt = this.interpolate(rawPrompt, context.state);

    // 3. 尝试首选模型
    let currentModel = context.config.defaultModel || 'qwen-turbo';
    
    try {
      context.logs.push({ level: 'info', message: `LLM Tool calling model: ${currentModel}` });
      const response = await aiService.generateText({
        prompt: finalPrompt,
        model: currentModel
      });
      return response.content;
    } catch (error) {
      // 4. 容灾降级逻辑 (Fallback)
      if (step.fallbackModel) {
        context.logs.push({ level: 'warning', message: `Model ${currentModel} failed, falling back to ${step.fallbackModel}` });
        const fallbackResponse = await aiService.generateText({
          prompt: finalPrompt,
          model: step.fallbackModel
        });
        return fallbackResponse.content;
      }
      throw error;
    }
  }

  private interpolate(template: string, state: Record<string, any>): string {
    let result = template;
    // 简单的替换 {{key}} 为 state[key]
    for (const [key, value] of Object.entries(state)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    return result;
  }
}
