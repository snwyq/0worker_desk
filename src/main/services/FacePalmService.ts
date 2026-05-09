import type { AppDatabase } from '../db/database.js';
import type { GenerateFacePalmBatchInput, GenerateFacePalmBatchResult, FacePalmCategory } from '../../shared/types.js';
import { AiService } from './AiService.js';
import { SchedulingEngine } from '../core/workflow/SchedulingEngine.js';

export function getFacePalmDefaultPrompt(category: FacePalmCategory, usedTopics: string[] = []) {
  const typeName = category === 'face' ? '面相' : '手相';
  const excludeStr = usedTopics.length > 0 ? `【强制回避】：你绝对不能写关于以下知识点的内容：[${usedTopics.join(', ')}]。` : '';
  
  return [
    `你是一位在微博深耕多年的资深${typeName}与玄学博主。你的文风极度拟人化，完全去掉AI的机械感和八股文套路感。`,
    `请随机发散 {{batchSize}} 个不同的${typeName}主题或知识点，写 {{batchSize}} 条独立的微博内容。`,
    excludeStr,
    '',
    '【内容与风格要求】',
    `1. 风格极其多变：绝对不要拘泥于同一种机械模板！要求长短不一，切入角度不一，语气也不一。你可以混合使用以下风格：`,
    `   - 短小直接的干货定义（如：解释什么是捧场纹/矫情纹以及代表的性格）。`,
    `   - 对比分析或回答粉丝提问（如：“之前有同学问阴骘纹和鱼尾纹的区别...一种是先天带的，一种是后天修的”）。`,
    `   - 带有步骤或序号的干货盘点（如：“怎么通过面相看一个男人智商高不高？第一... 第二... 通常来讲满足前两条就很聪明”）。`,
    `   - 结合生活哲理的深刻感悟（如：“从玄学层面讲，人如果长期心口不一，显化在外就是面部不对称...想改善得先保持言行一致”）。`,
    `2. 拟人化去AI味：像真实的人类博主在随笔分享。不需要老套的开头或总结。话题标签（如 #${typeName}科普# 或 #玄学#）可以放在开头，也可以放在结尾，随性自然。`,
    '3. 微博排版（极其重要）：微博属于碎片化阅读，绝对不允许连成一长坨！文案必须有舒适的“微博式分段”。在返回的 JSON 字符串中，必须使用真实的 `\\n\\n` 来隔开不同的自然段！',
    '',
    '【强制输出格式】',
    '你必须严格只输出合法的 JSON 数组，不包含任何 Markdown 格式前缀后缀（比如不要带 ```json）。格式如下：',
    '[',
    '  { "topic": "捧场纹", "content": "#面相科普# 捧场纹。位于脸颊的两侧，从下巴的两端向上延伸的纹路。\\n\\n拥有捧场纹的人通常人缘非常好，看起来非常亲近。\\n\\n演员有捧场纹观众缘好，有人捧场，票房大卖。" },',
    '  { "topic": "相由心生", "content": "从玄学层面讲，人如果长期心口不一，心里想的和嘴巴说的不一样... 人就很容易变得拧巴。\\n\\n显化在外就是面部不对称，比如大小眼，大小脸...\\n\\n想改善这类缺点，得先保持言行一致。#面相玄学" }',
    ']'
  ].join('\n');
}

export class FacePalmService {
  private db: AppDatabase | null = null;
  private ai = new AiService();

  init(db: AppDatabase) {
    this.db = db;
    this.ai.init(db);
  }

  async generateBatch(input: GenerateFacePalmBatchInput): Promise<GenerateFacePalmBatchResult> {
    if (!this.db) {
      throw new Error('FACE_PALM_DB_NOT_READY');
    }

    const account = this.db.accounts.findById(input.accountId);
    if (!account) {
      throw new Error(`Account ${input.accountId} was not found`);
    }

    const result: GenerateFacePalmBatchResult = {
      createdContents: 0,
      createdTasks: 0,
      taskIds: [],
      contentIds: [],
      errors: [],
    };

    // 读取该领域的记忆库防重
    const memoryKey = `face_palm_used_topics_${input.category}`;
    const usedTopicsStr = this.db.settings.get(memoryKey) || '[]';
    let usedTopics: string[] = [];
    try {
      usedTopics = JSON.parse(usedTopicsStr);
    } catch {
      // ignore parse error
    }

    const defaultPrompt = getFacePalmDefaultPrompt(input.category, usedTopics);
    let promptTemplate = String(input.promptTemplate || '').trim() || defaultPrompt;
    
    // 如果用户在前端修改了自定义的提示词，确保依然强制拼上防重复语句
    if (input.promptTemplate && usedTopics.length > 0) {
      const excludeStr = `\n【强制回避】：你绝对不能写关于以下知识点的内容：[${usedTopics.join(', ')}]。`;
      if (!promptTemplate.includes('强制回避')) {
        promptTemplate += excludeStr;
      }
    }

    promptTemplate = promptTemplate.replace(/\{\{batchSize\}\}/g, String(input.batchSize));

    try {
      // 1次 LLM 调用
      const aiResult = await this.ai.generateText({
        prompt: promptTemplate,
        model: input.model || 'deepseek-v3.2',
        provider: 'dashscope' // default
      });

      let responseText = aiResult.content.trim();
      // 容错处理：剔除 markdown json 块标签
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
      }

      let parsedItems: Array<{ topic: string; content: string }> = [];
      try {
        parsedItems = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`AI返回格式无法解析为JSON，请重试。返回内容摘要: ${responseText.substring(0, 100)}`);
      }

      if (!Array.isArray(parsedItems)) {
         throw new Error(`AI返回的格式非数组类型`);
      }

      const newTopics: string[] = [];

      // 遍历拆分，分别入库并绑定栏目库ID以便于排期
      for (const item of parsedItems) {
        if (!item.topic || !item.content) continue;

        const title = `${input.category === 'face' ? '面相' : '手相'}科普 - ${item.topic}`;
        const contentItem = this.db.contentItems.create({
          title,
          body: item.content,
          source: 'ai',
          status: 'ready',
          accountId: account.id,
          pluginCode: 'maoxiaoxian',
          styleId: '',
          topicsJson: [item.topic],
          sourceJson: {
            workflowCode: input.workflowCode || ''
          },
        });

        const task = this.db.facePalmTasks.create({
          contentId: contentItem.id,
          accountId: account.id,
          platform: account.platform,
          category: input.category,
          scheduledAt: '',

          status: 'draft',
          mediaPathsJson: [], // 预留坑位，未来可增加配图
          platformPayload: { 
             content: item.content,
             // 将 workflowCode 带入 payload 以备后续分析或重新排期需要
             trace: { workflowCode: input.workflowCode }
          }
        });

        result.createdContents += 1;
        result.createdTasks += 1;
        result.contentIds.push(contentItem.id);
        result.taskIds.push(task.id);
        newTopics.push(item.topic);
      }

      // 更新记忆库 (LRU 思想，保留最近的100个)
      if (newTopics.length > 0) {
        const updatedTopics = [...newTopics, ...usedTopics].slice(0, 100);
        this.db.settings.set(memoryKey, JSON.stringify(updatedTopics), '面相手相防重复记忆库');
      }

    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      result.errors.push(msg);
    }

    return result;
  }
}

export const facePalmService = new FacePalmService();
