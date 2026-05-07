import type { AppDatabase } from '../db/database.js';
import type { GenerateHotBaziBatchInput, GenerateHotBaziBatchResult, HotPerson } from '../../shared/types.js';
import { Solar } from 'lunar-typescript';
import { AiService } from './AiService.js';
import { SchedulingEngine } from '../core/workflow/SchedulingEngine.js';
import { imageScraperService } from './ImageScraperService.js';
import { localChartRenderer } from './LocalChartRenderer.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

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

  async generateBatch(input: GenerateHotBaziBatchInput): Promise<GenerateHotBaziBatchResult> {
    if (!this.db) {
      throw new Error('HOT_BAZI_DB_NOT_READY');
    }

    const account = this.db.accounts.findById(input.accountId);
    if (!account) {
      throw new Error(`Account ${input.accountId} was not found`);
    }

    const people = this.db.hotPeople.list(input.limit ?? 20).filter((item: any) => item.analysisStatus === 'completed');
    if (people.length === 0) {
      return {
        createdContents: 0,
        createdReviews: 0,
        createdTasks: 0,
        skippedPeople: 0,
        failedPeople: 0,
        taskIds: [],
        contentIds: [],
        errors: ['今日热点人物表里没有可用人物数据'],
      };
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

    for (let index = 0; index < people.length; index += 1) {
      const person = people[index];
      try {
        const prompt = renderPromptTemplate(promptTemplate, person);
        const aiResponse = await this.ai.generateText({
          prompt,
          provider: 'dashscope',
          model,
          maxTokens: 900,
        });

        const body = String(aiResponse.content || '').trim();
        if (!body) {
          result.failedPeople += 1;
          result.errors.push(`${person.name}: empty_model_output`);
          continue;
        }

        const itemMediaPaths: string[] = [];
        const generatedAt = new Date().toISOString();

        try {
          const scrapedPhotos = await imageScraperService.scrapeImages(person.name, 2, mediaDir);
          itemMediaPaths.push(...scrapedPhotos);
        } catch (e) {
          console.error(`Failed to scrape images for ${person.name}:`, e);
        }

        const paragraphs = body.split('\\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('#'));
        const chartAnalysis = paragraphs[0] || '命理格局提取失败';
        const luckAnalysis = paragraphs[paragraphs.length - 1] || '流年断语提取失败';

        try {
          const generatedCharts = await localChartRenderer.renderBaziCharts(person, {
            chartAnalysis,
            luckAnalysis
          }, mediaDir);
          itemMediaPaths.push(...generatedCharts);
        } catch (e) {
          console.error(`Failed to render charts for ${person.name}:`, e);
        }

        const content = this.db.contentItems.create({
          title: `${person.name} 热点八字`,
          body,
          source: 'ai',
          status: 'ready',
          accountId: account.id,
          pluginCode: 'maoxiaoxian',
          styleId: 'mx_hot_bazi',
          topicsJson: [person.name, '热点八字'],
          mediaJson: itemMediaPaths.map((path) => ({ path })),
          sourceJson: {
            hotPersonId: person.id,
            sourceTopic: toSourceTopic(person),
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

        const schedulingEngine = new SchedulingEngine(this.db);
        const scheduledAt = schedulingEngine.allocateScheduledTime('maoxiaoxian.daily_hot_person');

        const task = this.db.hotBaziTasks.create({
          contentId: content.id,
          accountId: account.id,
          platform: account.platform,
          hotPersonId: person.id,
          sourceTopic: toSourceTopic(person),
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
      } catch (error) {
        result.failedPeople += 1;
        result.errors.push(`${person.name}: ${error instanceof Error ? error.message : String(error)}`);
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
        const scrapedPhotos = await imageScraperService.scrapeImages(person.name, 2, mediaDir);
        itemMediaPaths.push(...scrapedPhotos);
      } catch (e) {
        console.error(`Failed to scrape images for ${person.name}:`, e);
      }

      const contentItem = this.db.contentItems.findById(task.contentId);
      const body = contentItem?.body || '';
      const paragraphs = body.split('\\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0 && !p.startsWith('#'));
      const generatedContentObj = {
        chartAnalysis: paragraphs[0] || '命理格局解析',
        luckAnalysis: paragraphs[paragraphs.length - 1] || '流年断语参考'
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
