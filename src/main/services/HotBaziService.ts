import type { AppDatabase } from '../db/database.js';
import type { GenerateHotBaziBatchInput, GenerateHotBaziBatchResult, HotPerson, TopicPersonPair, HotBaziProgressEvent } from '../../shared/types.js';
import { Solar } from 'lunar-typescript';
import { AiService } from './AiService.js';
import { SchedulingEngine } from '../core/workflow/SchedulingEngine.js';
import { imageScraperService } from './ImageScraperService.js';
import { localChartRenderer } from './LocalChartRenderer.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/** 为异步操作添加超时保护 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function toSourceTopic(person: HotPerson) {
  return String(person.sourceTopicTitle || person.name || '').trim();
}

export function getDefaultPromptTemplate() {
  return [
    '你是一位在微博拥有百万粉丝的铁口直断命理博主，风格犀利毒辣又不失专业。请根据以下资料，撰写一条微博热点八字短评。',
    '',
    '【输入资料】',
    '人物：{{personName}}',
    '生日：{{birthday}}',
    '八字：{{sizhu}}',
    '大运：{{dayunInfo}}',
    '热点：{{sourceTopic}}',
    '',
    '【铁律（违反任何一条即为废稿）】',
    '1. 绝对隐私保护：文案中【绝对不能】出现真实姓名！一律用"某位顶流"、"某位大佬"、"该命主"等代称。也尽量不要提及太过容易暴露身份的具体专用名词。',
    '2. 去AI化：你是真人博主在发微博，不是AI在写报告。禁止出现"综上所述""总的来说""值得关注"等一切AI套话。除首行话题标签外禁止任何Markdown语法，全文纯文本。',
    '3. 微博语感：句子要短，节奏要快，像跟粉丝聊天一样自然。可以用反问、感叹、断言，带点命理博主的毒舌范儿，让人忍不住想转发。',
    '4. 强制分行：每个要求换行的地方必须输出真正的换行符，不许连成一坨。微博是手机阅读，一段超过三行就没人看了。',
    '5. 真实经历优先：命理判断必须和这个人公开已知的真实经历严丝合缝地对上，经历描述的篇幅要多于命理术语。不确定的事情用模糊的运势描述替代，严禁编造。',
    '6. 字数：全文控制在350字以内。',
    '',
    '【文章结构（严格按顺序输出）】',
    '',
    '第一行（独占一行）：#{{topicHashtag}}#',
    '',
    '第1行（黄金金句）：必须是一个极度吸引眼球、引人入胜的【疑问句】！绝对不能用第二人称"你"，绝对不能包含真名。这句将作为视频封面大字，必须一击毙命。请务必优先使用以下爆款词汇组合："底层逻辑"、"为什么"、"到底走错了哪一步"、"惊天暗局"、"谁能想到"、"逆风翻盘"、"跌落神坛"（例如："从万人追捧到跌落神坛，到底走错了哪一步运？"）。写完疑问句后，用两三句话快速勾勒此人的背景和争议点。',
    '',
    '第2行：换行另起，固定句式起头："公开资料显示其生日是{{birthday}}，八字为{{sizhu}}。"紧接着用一两句话点出格局本质，带出命理定性。',
    '',
    '第二段（大运复盘，每步大运独占一行）：',
    '每一行的写法：先写大运干支和括号里的年份范围，紧跟命理四字短评，然后直接衔接这步大运里真实发生的代表性事件。各部分用逗号或句号自然连接，禁止用冒号和任何引导前缀词。',
    '',
    '第三段（流年推断，今年明年各占一行）：',
    '第1行必须以"{{currentYear}}{{currentYearGanzhi}}年"起头，第2行必须以"{{nextYear}}{{nextYearGanzhi}}年"起头。先断命理气运，再推具体走向，语气要果断，像博主在铁口直断。',
  ].join('\n');
}

function renderPromptTemplate(template: string, person: HotPerson) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const currentYearGanzhi = Solar.fromYmdHms(currentYear, 7, 1, 12, 0, 0).getLunar().getYearInGanZhi();
  const nextYearGanzhi = Solar.fromYmdHms(nextYear, 7, 1, 12, 0, 0).getLunar().getYearInGanZhi();

  const sourceTopic = toSourceTopic(person) || '今日人物';
  const topicHashtag = sourceTopic.length > 15 ? (person.name || sourceTopic) : sourceTopic;

  return template
    .replaceAll('{{personName}}', person.name || '')
    .replaceAll('{{birthday}}', person.verifyBirthday || person.birthday || '未知')
    .replaceAll('{{sizhu}}', person.sizhu || '未知')
    .replaceAll('{{dayunInfo}}', person.dayunInfo || '未知')
    .replaceAll('{{sourceTopic}}', sourceTopic)
    .replaceAll('{{topicHashtag}}', topicHashtag)
    .replaceAll('{{currentYear}}', String(currentYear))
    .replaceAll('{{currentYearGanzhi}}', currentYearGanzhi)
    .replaceAll('{{nextYear}}', String(nextYear))
    .replaceAll('{{nextYearGanzhi}}', nextYearGanzhi);
}

export class HotBaziService {
  private db: AppDatabase | null = null;
  private ai = new AiService();

  init(db: AppDatabase) {
    this.db = db;
    this.ai.init(db);
    // 启动时清理 7 天前的媒体资产
    this.cleanupOldMediaAssets().catch(console.error);
  }

  static getMediaDir(customPath?: string) {
    if (customPath) {
      return customPath;
    }
    // 优先从环境变量获取，方便参数化
    if (process.env.HOT_BAZI_MEDIA_DIR) {
      return process.env.HOT_BAZI_MEDIA_DIR;
    }
    // 默认指向项目执行目录下的 media_assets/hot_bazi
    return path.join(process.cwd(), 'media_assets', 'hot_bazi');
  }

  private async cleanupOldMediaAssets() {
    try {
      const targetDir = HotBaziService.getMediaDir();
      if (!fs.existsSync(targetDir)) return;
      const files = fs.readdirSync(targetDir);
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      let deleted = 0;
      for (const file of files) {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      }
      if (deleted > 0) {
        console.log(`Cleaned up ${deleted} expired media assets from hot_bazi.`);
      }
    } catch (e) {
      console.error('Failed to cleanup old media assets:', e);
    }
  }

  async generateBatch(
    input: GenerateHotBaziBatchInput,
    onProgress?: (data: HotBaziProgressEvent) => void,
  ): Promise<GenerateHotBaziBatchResult> {
    if (!this.db) {
      throw new Error('HOT_BAZI_DB_NOT_READY');
    }

    const account = this.db.accounts.findById(input.accountId);
    if (!account) {
      throw new Error(`Account ${input.accountId} was not found`);
    }

    // 1. 从今日热点×人物配对获取数据（已按热度排序）
    const allPairs = this.db.hotTopicAnalysis.listTodayCompletedWithPeople();
    if (allPairs.length === 0) {
      return {
        createdContents: 0,
        createdReviews: 0,
        createdTasks: 0,
        skippedPeople: 0,
        failedPeople: 0,
        taskIds: [],
        contentIds: [],
        errors: ['今日没有已匹配人物的热点数据'],
      };
    }

    // 2. 深度去重优化：防止同一个人因为不同热点被重复生成，导致霸屏
    const existingTasks = this.db.hotBaziTasks.list();
    // 2.1 精确的话题去重（相同话题绝不重复）
    const existingTopicKeys = new Set(
      existingTasks.map((t: any) => `${t.hotPersonId}::${t.sourceTopic}`)
    );
    // 2.2 全局人物去重（如果生成过这个人，就不再自动生成，除非手动勾选）
    const existingPersonIds = new Set(
      existingTasks.map((t: any) => t.hotPersonId)
    );

    let pendingPairs = allPairs.filter((pair: TopicPersonPair) => {
      // 检查是否被用户在 UI 上手动强行勾选
      const isExplicitlySelected = input.selectedPairs?.some(
        p => p.personId === pair.personId && p.topicTitle === pair.topicTitle
      );

      const topicKey = `${pair.personId}::${pair.topicTitle}`;

      // 规则 A：完全相同的话题（不论是否手动勾选），绝对不重复生成
      if (existingTopicKeys.has(topicKey)) {
        return false;
      }

      // 规则 B：如果没有在前端强制勾选，且这个人物曾经已经生成过八字任务了，则直接跳过
      if (!isExplicitlySelected && existingPersonIds.has(pair.personId)) {
        return false;
      }

      return true;
    });

    // 3. 同一人物限制最多 1 条（取热度最高的，已按热度排序所以直接计数）
    const MAX_PER_PERSON = 1;
    const personCountMap = new Map<string, number>();
    pendingPairs = pendingPairs.filter((pair: TopicPersonPair) => {
      const count = personCountMap.get(pair.personName) ?? 0;
      if (count >= MAX_PER_PERSON) return false;
      personCountMap.set(pair.personName, count + 1);
      return true;
    });

    // 4. 如果前端指定了要生成哪些配对
    if (input.selectedPairs?.length) {
      const selectedSet = new Set(
        input.selectedPairs.map(p => `${p.personId}::${p.topicTitle}`)
      );
      pendingPairs = pendingPairs.filter((pair: TopicPersonPair) =>
        selectedSet.has(`${pair.personId}::${pair.topicTitle}`)
      );
    }

    // 5. 按 limit 截断
    if (input.limit && input.limit < pendingPairs.length) {
      pendingPairs = pendingPairs.slice(0, input.limit);
    }

    const promptTemplate = String(input.promptTemplate || '').trim() || getDefaultPromptTemplate();
    const model = input.model || 'deepseek-v3.2';
    const mediaDir = input.mediaDir;
    const result: GenerateHotBaziBatchResult = {
      createdContents: 0,
      createdReviews: 0,
      createdTasks: 0,
      skippedPeople: 0,
      failedPeople: 0,
      taskIds: [],
      contentIds: [],
      errors: [],
    };

    // Scheduling Engine is no longer used here during draft generation

    for (let index = 0; index < pendingPairs.length; index += 1) {
      const pair = pendingPairs[index];
      try {
        // 取人物完整数据
        const person = this.db.hotPeople.findById(pair.personId);
        if (!person) {
          result.failedPeople += 1;
          result.errors.push(`${pair.personName}: person_not_found_id_${pair.personId}`);
          onProgress?.({ index: index + 1, total: pendingPairs.length, personName: pair.personName, topicTitle: pair.topicTitle, ok: false, error: 'person_not_found' });
          continue;
        }

        // 强制用今日热点标题覆盖 sourceTopicTitle
        const personForPrompt: HotPerson = {
          ...person,
          sourceTopicTitle: pair.topicTitle,
        };
        const prompt = renderPromptTemplate(promptTemplate, personForPrompt);

        // 通知前端开始调用大模型
        onProgress?.({ index: index + 1, total: pendingPairs.length, personName: pair.personName, topicTitle: pair.topicTitle, ok: true, status: '正在撰写命理分析(调用大模型)...' });

        // AI 文案生成（45s 超时）
        const aiResponse = await withTimeout(
          this.ai.generateText({
            prompt,
            provider: 'dashscope',
            model,
            maxTokens: 900,
          }),
          45_000,
        );

        const body = String(aiResponse.content || '').trim();
        if (!body) {
          result.failedPeople += 1;
          result.errors.push(`${pair.personName}: empty_model_output`);
          onProgress?.({ index: index + 1, total: pendingPairs.length, personName: pair.personName, topicTitle: pair.topicTitle, ok: false, error: 'empty_output' });
          continue;
        }

        // 核心修复：先安全剥离首部的 #话题名# 标签
        const cleanBody = body.replace(/^#.*?#\s*/, '');
        const paragraphs = cleanBody.split(/\r?\n|\\n/).map(p => p.trim()).filter(p => p.length > 0);
        const chartAnalysis = paragraphs[0] || '命理格局提取失败';
        const luckAnalysis = paragraphs[paragraphs.length - 1] || '流年断语提取失败';

        // 通知前端开始渲染
        onProgress?.({ index: index + 1, total: pendingPairs.length, personName: pair.personName, topicTitle: pair.topicTitle, ok: true, status: '正在渲染排盘与配图...' });

        // 图片抓取 + 排盘渲染并行化（适当放宽超时时间，避免后台爬取成功但返回前已超时）
        const [photosResult, chartsResult] = await Promise.allSettled([
          withTimeout(imageScraperService.scrapeImages(`${person.name} ${pair.topicTitle}`, 2, mediaDir), 45_000),
          withTimeout(localChartRenderer.renderBaziCharts(person, { chartAnalysis, luckAnalysis, paragraphs }, mediaDir), 45_000),
        ]);
        const scrapedPhotos = photosResult.status === 'fulfilled' ? photosResult.value : [];
        const generatedCharts = chartsResult.status === 'fulfilled' ? chartsResult.value : [];
        const itemMediaPaths = [...scrapedPhotos, ...generatedCharts];

        // 逐条落盘——立即写入 DB
        const content = this.db.contentItems.create({
          title: `${person.name} · ${pair.topicTitle}`,
          body,
          source: 'ai',
          status: 'ready',
          accountId: account.id,
          pluginCode: 'maoxiaoxian',
          styleId: 'mx_hot_bazi',
          topicsJson: [person.name, '热点八字'],
          mediaJson: itemMediaPaths.map((p) => ({ path: p })),
          sourceJson: {
            hotPersonId: person.id,
            sourceTopic: pair.topicTitle,
            promptTemplate,
            model,
          },
          riskJson: {
            reviewRequired: false,
            publicFigure: true,
          },
        });
        result.createdContents += 1;
        result.contentIds.push(content.id);

        const task = this.db.hotBaziTasks.create({
          contentId: content.id,
          accountId: account.id,
          platform: account.platform,
          hotPersonId: person.id,
          sourceTopic: pair.topicTitle,
          scheduledAt: '',
          status: 'draft',
          automationEnabled: false,
          intervalMinutes: 0,
          scheduleRuleJson: {},
          mediaPathsJson: itemMediaPaths,
          platformPayload: {
            content: body,
            mediaPaths: itemMediaPaths,
            promptTemplate,
            model,
          },
        });
        result.createdTasks += 1;
        result.taskIds.push(task.id);

        onProgress?.({ index: index + 1, total: pendingPairs.length, personName: pair.personName, topicTitle: pair.topicTitle, ok: true, status: '完成' });
      } catch (error) {
        result.failedPeople += 1;
        const errMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${pair.personName}: ${errMsg}`);
        onProgress?.({ index: index + 1, total: pendingPairs.length, personName: pair.personName, topicTitle: pair.topicTitle, ok: false, error: errMsg });
      }
    }

    return result;
  }
  async regenerateMediaForTasks(taskIds: number[], mediaDir?: string) {
    if (!this.db) {
      throw new Error('HOT_BAZI_DB_NOT_READY');
    }

    const tasks = this.db.hotBaziTasks.list().filter((t: any) => taskIds.includes(t.id));
    let successCount = 0;

    for (const task of tasks) {
      if (!task.hotPersonId) continue;
      const person = this.db.hotPeople.findById(task.hotPersonId);
      if (!person) continue;

      const itemMediaPaths: string[] = [];
      try {
        const scrapedPhotos = await imageScraperService.scrapeImages(`${person.name} ${task.sourceTopic || ''}`.trim(), 2, mediaDir);
        itemMediaPaths.push(...scrapedPhotos);
      } catch (e) {
        console.error(`Failed to scrape images for ${person.name}:`, e);
      }

      const contentItem = this.db.contentItems.findById(task.contentId);
      const rawBody = contentItem?.body || '';
      // 核心修复：保持与主流程一致的健壮清洗逻辑，防止老数据切分出空数组
      const cleanBody = rawBody.replace(/^#.*?#\s*/, '');
      const paragraphs = cleanBody.split(/\r?\n|\\n/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
      const generatedContentObj = {
        chartAnalysis: paragraphs[0] || '命理格局解析',
        luckAnalysis: paragraphs[paragraphs.length - 1] || '流年断语参考',
        paragraphs
      };

      try {
        const generatedCharts = await localChartRenderer.renderBaziCharts(person, generatedContentObj, mediaDir);
        itemMediaPaths.push(...generatedCharts);
      } catch (e) {
        console.error(`Failed to render charts for ${person.name}:`, e);
      }

      if (itemMediaPaths.length > 0) {
        this.db.hotBaziTasks.update(task.id, {
          ...task,
          mediaPathsJson: itemMediaPaths,
          status: 'draft' // Reset to draft if it was in error, etc.
        });
        successCount++;
      }
    }

    return {
      successCount,
      totalRequested: taskIds.length
    };
  }
}

export const hotBaziService = new HotBaziService();
