import { aiService } from '../../services/AiService.js';
import type { ITool, WorkflowContext, WorkflowNode } from '../workflow/types.js';

export class LlmTool implements ITool<any, any> {
  metadata = {
    id: 'llm',
    version: '1.0.0',
    description: 'Text generation node powered by DashScope / APIYi with fallback routing.',
  };

  async execute(step: WorkflowNode & { type: 'llm' }, context: WorkflowContext): Promise<string> {
    let rawPrompt = step.prompt;
    if (context.config?.systemPromptOverride) {
      rawPrompt = `${context.config.systemPromptOverride}\n\n${rawPrompt}`;
    }

    const finalPrompt = this.interpolate(rawPrompt, context.state);
    const currentModel = context.config.defaultModel || 'qwen-turbo';

    try {
      context.logs.push({ level: 'info', message: `LLM Tool calling model: ${currentModel}` });
      const response = await aiService.generateText({
        prompt: finalPrompt,
        model: currentModel,
      });
      return response.content;
    } catch (error) {
      if (step.fallbackModel) {
        context.logs.push({ level: 'warning', message: `Model ${currentModel} failed, falling back to ${step.fallbackModel}` });
        const fallbackResponse = await aiService.generateText({
          prompt: finalPrompt,
          model: step.fallbackModel,
        });
        return fallbackResponse.content;
      }
      throw error;
    }
  }

  private interpolate(template: string, state: Record<string, any>): string {
    return template.replace(/\{\{\s*(state\.)?([\w.]+)\s*\}\}/g, (_match, _statePrefix, path) => {
      const value = path.split('.').reduce((current: any, key: string) => current?.[key], state);
      if (value === undefined || value === null) {
        return '';
      }
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  }
}
