import type { AppDatabase } from '../../db/database.js';
import type { ITool, TopHubNode, WorkflowContext } from '../workflow/types.js';

type TopHubApiPayload = {
  status?: number;
  data?: {
    items?: Array<{
      title?: string;
      name?: string;
    }>;
  };
};

export class TopHubTool implements ITool<TopHubNode, string[]> {
  metadata = {
    id: 'tophub_search',
    version: '1.0.0',
    description: 'Fetch hot topics from the configured TopHub API.',
  };

  constructor(private readonly db?: AppDatabase) {}

  async execute(step: TopHubNode, context: WorkflowContext): Promise<string[]> {
    const nodeId = step.nodeId || 'KqndgxeLl9';
    context.logs.push({ level: 'info', message: `TopHubTool fetching hot list from node: ${nodeId}` });

    try {
      const apiKey = this.db?.settings.get('ai.tophubKey') || process.env.TOPHUB_API_KEY || '06d2a2c31c219c88ea3ee3fe1b7bb33c';
      const baseUrl = this.db?.settings.get('ai.tophubBaseUrl') || process.env.TOPHUB_BASE_URL || 'https://api.tophubdata.com/nodes';
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${nodeId}`, {
        method: 'GET',
        headers: { Authorization: apiKey },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch TopHub: ${response.statusText}`);
      }

      const payload = await response.json() as TopHubApiPayload;
      const results = (payload.data?.items ?? [])
        .map((item) => item.title ?? item.name ?? '')
        .filter(Boolean)
        .slice(0, 20);

      if (results.length === 0) {
        context.logs.push({ level: 'warning', message: 'TopHub returned 0 items. Using fallback topics.' });
        return ['赵丽颖新剧定档', '周杰伦演唱会官宣', '胡歌最新电影路透', '杨幂巴黎时装周造型'];
      }

      context.logs.push({ level: 'info', message: `TopHubTool extracted ${results.length} hot topics.` });
      return results;
    } catch (error) {
      context.logs.push({ level: 'error', message: `TopHubTool Error: ${String(error)}` });
      throw error;
    }
  }
}
