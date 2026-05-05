import type { AppDatabase } from '../db/database.js';
import type { GenerateHotBaziBatchInput, GenerateHotBaziBatchResult, HotPerson } from '../../shared/types.js';
import { Solar } from 'lunar-typescript';
import { AiService } from './AiService.js';

function buildScheduleTime(intervalMinutes: number, index: number) {
  const next = new Date();
  next.setMinutes(next.getMinutes() + intervalMinutes * index);
  return next.toISOString();
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
    '行文风格：铁口直断，专业犀利，干脆利落，理出有据。',
    '字数限制：总字数严格控制在300字以内，拒绝废话。',
    '格式禁忌：除首行话题标签外，正文绝对禁止使用任何 Markdown 格式（如加粗、星号、列表符等），仅保留自然换行。',
    '内容导向：命理分析必须与该人物已知的真实经历、人生轨迹紧密咬合。',
    '流年要求：当前要分析的流年年份是{{currentYear}}年（{{currentYearGanzhi}}），下一年是{{nextYear}}年（{{nextYearGanzhi}}），不要擅自改写成年份或干支。',
    '',
    '【严格文章结构】',
    '第一行（独占一行）：#{{sourceTopic}}#',
    '',
    '第一段（约60字，格局定位）：首句必须直接写出“{{personName}}”的名字。随后简明扼要地给出其八字排盘、格局定性及五行喜忌分析。',
    '',
    '第二段（大运与真实经历对应，重点段落）：',
    '要求：短句为主，不要把分析和经历混在超长句中；真实经历的字数必须多于命理分析。',
    '阶段一：先写1句重点大运或年份的命理判断，紧接2到3句其在该阶段真实的经历变化。',
    '阶段二：必须换行另起，再写1句下一步大运的命理判断，紧接1到2句对应的真实经历。',
    '',
    '第三段（综合论断）：整体评析大运走势，直接点明这套八字组合及运势对该人物在事业、家庭、感情、健康上的实质性影响。',
    '',
    '第四段（流年推断）：补充断定{{currentYear}}年（{{currentYearGanzhi}}）和{{nextYear}}年（{{nextYearGanzhi}}）的流年八字与流年的组合特点，并直言预测这两年可能发生的具体事情或特点。',
  ].join('\n');
}

function renderPromptTemplate(template: string, person: HotPerson) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  // Use a mid-year date so the Ganzhi year has definitely crossed Li Chun.
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
  }

  async generateBatch(input: GenerateHotBaziBatchInput): Promise<GenerateHotBaziBatchResult> {
    if (!this.db) {
      throw new Error('HOT_BAZI_DB_NOT_READY');
    }

    const account = this.db.accounts.findById(input.accountId);
    if (!account) {
      throw new Error(`Account ${input.accountId} was not found`);
    }

    const people = this.db.hotPeople.list(input.limit ?? 20).filter((item) => item.analysisStatus === 'completed');
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

        const content = this.db.contentItems.create({
          title: `${person.name} 热点八字`,
          body,
          source: 'ai',
          status: input.requireReview ? 'reviewing' : 'approved',
          accountId: account.id,
          pluginCode: 'maoxiaoxian',
          styleId: 'mx_hot_bazi',
          topicsJson: [person.name, '热点八字'],
          mediaJson: input.mediaPaths.map((path) => ({ path })),
          sourceJson: {
            hotPersonId: person.id,
            sourceTopic: toSourceTopic(person),
            scheduleRule: input.scheduleRule,
            promptTemplate,
            model,
          },
          riskJson: {
            reviewRequired: input.requireReview,
            publicFigure: true,
          },
        });
        result.createdContents += 1;
        result.contentIds.push(content.id);

        if (input.requireReview) {
          this.db.reviewItems.create({
            contentId: content.id,
            reviewMode: 'manual',
            status: 'pending',
            comment: '热点八字批量生成待审核',
          });
          result.createdReviews += 1;
        }

        const task = this.db.hotBaziTasks.create({
          contentId: content.id,
          accountId: account.id,
          platform: account.platform,
          hotPersonId: person.id,
          sourceTopic: toSourceTopic(person),
          scheduledAt: buildScheduleTime(input.intervalMinutes, index + 1),
          status: input.requireReview ? 'reviewing' : 'queued',
          automationEnabled: input.automationEnabled,
          intervalMinutes: input.intervalMinutes,
          scheduleRuleJson: { rule: input.scheduleRule },
          mediaPathsJson: input.mediaPaths,
          platformPayload: {
            content: body,
            mediaPaths: input.mediaPaths,
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
}

export const hotBaziService = new HotBaziService();
