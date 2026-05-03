import type { ITool, WorkflowContext, WorkflowNode } from '../workflow/types.js';

export class SearchTool implements ITool<any, any> {
  metadata = {
    id: 'search',
    version: '1.0.0',
    description: 'Web search node using duckduckgo or custom crawler.'
  };

  async execute(step: WorkflowNode & { type: 'search' }, context: WorkflowContext): Promise<string> {
    const query = this.interpolate(step.query, context.state);
    context.logs.push({ level: 'info', message: `SearchTool executing query: ${query}` });
    
    // Placeholder implementation. 
    // In reality, this would call a real search API or Puppeteer scraper.
    return JSON.stringify({
      query,
      results: [
        { title: 'Result 1 for ' + query, snippet: 'This is a mocked search result.' },
        { title: 'Result 2 for ' + query, snippet: 'Another mocked result.' }
      ]
    });
  }

  private interpolate(template: string, state: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(state)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    return result;
  }
}
