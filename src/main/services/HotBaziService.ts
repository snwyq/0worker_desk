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

function getDefaultPromptTemplate() {
  return [
    '请扮演一位铁口直断的高级八字命理专家，根据以下资料撰写一篇人物八字短评。',
    '',
    '【输入资料】',
    '人物：{{personName}}',
    '生日：{{birthday}}',
    '八字：{{sizhu}}',
    '大运：{{dayunInfo}}',
    '热点：{{sourceTopic}}',
    '',
    '【全局要求】',
    '行文风格：铁口直断，专业犀利，干脆利落，理据有据。',
    '字数限制：总字数严格控制在300字以内，拒绝废话。',
    '格式禁忌：除首行话题标签外，正文绝对禁止使用任何 Markdown 格式，仅保留自然换行。',
    '内容导向：命理分析必须与该人物已知的真实经历、人生轨迹紧密咬合。',
    '流年要求：当前要分析的流年年份是{{currentYear}}年（{{currentYearGanzhi}}），下一年是{{nextYear}}年（{{nextYearGanzhi}}），不要擅自改写成其他年份或干支。',
    '',
    '【严格文章结构】',
    '第一行（独占一行）：#{{sourceTopic}}#',
    '',
    '第一段（约40字，格局定位）：首句必须直接写出“{{personName}}”的名字。随后简明扼要地给出其八字排盘、格局定性及五行喜忌分析。',
    '',
    '第二段（大运与真实经历对应，重点段落）：',
    '要求：短句为主，不要把分析和经历混在超长句中；真实经历的字数必须多于命理分析。',
    '阶段一：先写1句重点大运或年份的命理判断，紧接2到3句其在该阶段真实的经历变化。',
    '阶段二：必须换行另起，再写1句下一个大运的命理判断，紧接2到3句对应的真实经历。',
    '',
    '第三段（综合论断）：整体评析大运走势，直接点明这套八字组合及运势对该人物在事业、家庭、感情、健康上的实质性影响。',
    '',
    '第四段（流年推断）：补充断定{{currentYear}}年（{{currentYearGanzhi}}）和{{nextYear}}年（{{nextYearGanzhi}}）的流年八字与流年的组合特点，并直言预测这两年可能发生的具体事情或特点。',
  ].join('\n');
}

function renderPromptTemplate(template: string, person: HotPerson) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const currentYearGanzhi = Solar.fromYmdHms(currentYear, 7, 1, 12, 0, 0).getLunar().getYearInGanZhi();
  const nextYearGanzhi = Solar.fromYmdHms(nextYear, 7, 1, 12, 0, 0).getLunar().getYearInGanZhi();
  return template
    .replaceAll('{{personName}}', person.name || '')
    .replaceAll('{{birthday}}', person.verifyBirthday || person.birthday || '未知')
    .replaceAll('{{sizhu}}', person.sizhu || '未知')
    .replaceAll('{{dayunInfo}}', person.dayunInfo || '未知')
    .replaceAll('{{sourceTopic}}', toSourceTopic(person) || '今日人物')
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

    // 2. 去重：按 (personId + topicTitle) 排除已生成的
    const existingTasks = this.db.hotBaziTasks.list();
    const existingKeys = new Set(
      existingTasks.map((t: any) => `${t.hotPersonId}::${t.sourceTopic}`)
    );

    let pendingPairs = allPairs.filter((pair: TopicPersonPair) => {
      const key = `${pair.personId}::${pair.topicTitle}`;
      return !existingKeys.has(key);
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

    // 6. SchedulingEngine 在循环外创建一次
    const schedulingEngine = new SchedulingEngine(this.db);

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

        // 核心修复：先安全剥离首部的 #话题名# 标签，防止由于大段落没换行导致被整体过滤
        const cleanBody = body.replace(/^#.*?#\s*/, '').replace(/^[#*]+\s*/gm, ''); 
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

        const scheduledAt = schedulingEngine.allocateScheduledTime('maoxiaoxian.daily_hot_person');

        const task = this.db.hotBaziTasks.create({
          contentId: content.id,
          accountId: account.id,
          platform: account.platform,
          hotPersonId: person.id,
          sourceTopic: pair.topicTitle,
          scheduledAt,
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
      const cleanBody = rawBody.replace(/^#.*?#\s*/, '').replace(/^[#*]+\s*/gm, '');
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
