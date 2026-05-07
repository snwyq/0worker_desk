import { afterEach, describe, expect, test, vi } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';
import { HotBaziService } from '../../src/main/services/HotBaziService.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('HotBaziService', () => {
  test('generates hot bazi content without creating a separate publishing schedule', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T00:00:00.000Z'));

    const db = await createDatabase(':memory:');
    const account = db.accounts.create({
      name: 'hot bazi account',
      platform: 'weibo',
      browserMode: 'manual_port',
      providerProfileId: '',
      wsEndpoint: '',
      debuggingPort: 9222,
      status: 'active',
      notes: '',
    });

    db.hotPeople.upsert({
      name: '人物甲',
      birthday: '1990年1月1日',
      sourceTopicTitle: '甲热点',
      sourcePlatform: 'weibo',
      analysisStatus: 'completed',
    });
    db.hotPeople.upsert({
      name: '人物乙',
      birthday: '1991年1月1日',
      sourceTopicTitle: '乙热点',
      sourcePlatform: 'weibo',
      analysisStatus: 'completed',
    });

    const service = new HotBaziService();
    service.init(db);
    vi.spyOn((service as any).ai, 'generateText').mockResolvedValue({ content: '生成内容' });

    const result = await service.generateBatch({
      accountId: account.id,
      limit: 2,
      promptTemplate: '人物：{{personName}} 热点：{{sourceTopic}}',
      model: 'deepseek-v3.2',
    });

    expect(result.createdContents).toBe(2);
    expect(result.createdTasks).toBe(2);

    const tasks = db.hotBaziTasks.list().sort((a: any, b: any) => a.id - b.id);
    const contents = db.contentItems.list().sort((a: any, b: any) => a.id - b.id);

    expect(tasks[0]?.scheduleRuleJson).toEqual({});
    expect(tasks[0]?.mediaPathsJson).toEqual([]);
    expect(tasks[1]?.mediaPathsJson).toEqual([]);
    expect(tasks[0]?.platformPayload.mediaPaths).toEqual([]);
    expect(contents[0]?.mediaJson).toEqual([]);
    expect(contents[1]?.mediaJson).toEqual([]);
    expect(contents[0]?.status).toBe('ready');
    expect(contents[1]?.status).toBe('ready');
    expect(db.reviewItems.listPending()).toHaveLength(0);
    expect(db.distributionTasks.list()).toHaveLength(0);
    expect(tasks[0]?.status).toBe('draft');
    expect(tasks[1]?.status).toBe('draft');
  });
});
