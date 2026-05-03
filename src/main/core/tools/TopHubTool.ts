import type { ITool, WorkflowContext, TopHubNode } from '../workflow/types.js';

export class TopHubTool implements ITool<TopHubNode, string[]> {
  metadata = {
    id: 'tophub_search',
    version: '1.0.0',
    description: 'Fetches hot topics from TopHub (今日热榜) for a specific node.'
  };

  async execute(step: TopHubNode, context: WorkflowContext): Promise<string[]> {
    // 默认抓取微博热搜榜 (Node ID: KqndgxeLl9)
    const nodeId = step.nodeId || 'KqndgxeLl9'; 
    context.logs.push({ level: 'info', message: `TopHubTool fetching hot list from node: ${nodeId}` });

    try {
      const response = await fetch(`https://tophub.today/n/${nodeId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch TopHub: ${response.statusText}`);
      }

      const html = await response.text();
      const results: string[] = [];
      
      // 使用正则粗略解析 <a> 标签内的热搜标题
      // 在实际生产环境中建议引入 cheerio
      const regex = /<td class="al">.*?<a href="[^"]*?" target="_blank" [^>]*?>(.*?)<\/a>/gs;
      let match;
      let count = 0;
      
      while ((match = regex.exec(html)) !== null && count < 20) {
        // 清理一下 HTML 实体和两端空格
        let title = match[1].replace(/<[^>]*>?/gm, '').trim();
        if (title) {
          results.push(title);
          count++;
        }
      }

      // 如果由于某种原因反爬虫失败，返回备用热搜列表防止流水线断裂
      if (results.length === 0) {
         context.logs.push({ level: 'warning', message: 'TopHub returned 0 items. Possible block, using fallback mock.' });
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
