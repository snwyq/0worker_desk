import { describe, expect, test } from 'vitest';
import { HotPeopleService } from '../../src/main/services/HotPeopleService.js';

describe('hot people batch enrichment', () => {
  test('deduplicates concurrent analyze requests so one batch only runs once', async () => {
    const prompts: string[] = [];
    const fakeAiService = {
      init() {},
      async generateText(options: { prompt: string }) {
        prompts.push(options.prompt);
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (options.prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b')) {
          return {
            content: JSON.stringify({
              '1:\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae': ['\u4f55\u7085'],
            }),
          };
        }
        return {
          content: JSON.stringify([
            {
              name: '\u4f55\u7085',
              gender: '\u7537',
              birthday: '1974\u5e744\u670828\u65e5',
              bio: '\u4f55\u7085\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
              photoUrl: '',
              promptText: '\u4f55\u7085\uff0c\u4e3b\u6301\u4eba\u3002',
            },
          ]),
        };
      },
    };

    const saved: any[] = [];
    const fakeDb: any = {
      hotTopicAnalysis: {
        listPending: () => [{ id: 1, platform: '\u5fae\u535a', title: '\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae' }],
        markExtracted: () => {},
        markProcessed: () => {},
        markFailed: () => {},
        getQueueSummary: () => ({ pendingTopics: 0, coolingFailedTopics: 0, nextRetryAt: '' }),
      },
      hotPeople: {
        findByName: () => null,
        upsert: (input: any) => {
          const item = { id: saved.length + 1, updateTime: new Date().toISOString(), createTime: new Date().toISOString(), ...input };
          saved.push(item);
          return item;
        },
        list: () => saved,
      },
      publicFigureEvidence: {
        findByName: () => null,
        upsert: () => null,
      },
    };

    const service = new HotPeopleService(fakeAiService as any);
    service.init(fakeDb);

    const [first, second, third] = await Promise.all([
      service.analyzePendingHotTopics({ limit: 20, retriever: 'model', provider: 'dashscope' }),
      service.analyzePendingHotTopics({ limit: 20, retriever: 'model', provider: 'dashscope' }),
      service.analyzePendingHotTopics({ limit: 20, retriever: 'model', provider: 'dashscope' }),
    ]);

    expect(first.createdCount).toBe(1);
    expect(second.createdCount).toBe(1);
    expect(third.createdCount).toBe(1);
    expect(prompts.filter((prompt) => prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b'))).toHaveLength(1);
    expect(prompts.filter((prompt) => prompt.includes('\u516c\u4f17\u4eba\u7269\u8d44\u6599\u6574\u7406\u52a9\u624b'))).toHaveLength(1);
  });

  test('reports skipped topics when no public figure is extracted', async () => {
    const fakeAiService = {
      init() {},
      async generateText() {
        return {
          content: JSON.stringify({
            '1:\u96be\u542c': [],
          }),
        };
      },
    };

    const marks: Array<{ type: string; id: number; names?: string[] }> = [];
    const fakeDb: any = {
      hotTopicAnalysis: {
        listPending: () => [{ id: 1, platform: '\u5fae\u535a', title: '\u96be\u542c' }],
        markExtracted: (id: number, names: string[]) => marks.push({ type: 'extracted', id, names }),
        markProcessed: (id: number, names: string[]) => marks.push({ type: 'processed', id, names }),
        markFailed: () => {},
        getQueueSummary: () => ({ pendingTopics: 0, coolingFailedTopics: 0, nextRetryAt: '' }),
      },
      hotPeople: {
        findByName: () => null,
        upsert: () => {
          throw new Error('should not upsert when no names are extracted');
        },
        list: () => [],
      },
      publicFigureEvidence: {
        findByName: () => null,
        upsert: () => null,
      },
    };

    const service = new HotPeopleService(fakeAiService as any);
    service.init(fakeDb);

    const result = await service.analyzePendingHotTopics({
      limit: 20,
      retriever: 'model',
      provider: 'dashscope',
    });

    expect(result.selectedTopics).toBe(1);
    expect(result.processedTopics).toBe(1);
    expect(result.skippedTopics).toBe(1);
    expect(result.createdCount).toBe(0);
    expect(result.updatedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(marks).toEqual([
      { type: 'extracted', id: 1, names: [] },
      { type: 'processed', id: 1, names: [] },
    ]);
  });

  test('uses one model call for extraction and one model call for enriching multiple people', async () => {
    const prompts: string[] = [];
    const fakeAiService = {
      init() {},
      async generateText(options: { prompt: string }) {
        prompts.push(options.prompt);
        if (options.prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b')) {
          return {
            content: JSON.stringify({
              '1:\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae': ['\u4f55\u7085'],
              '2:\u8c22\u5a1c\u8282\u76ee\u8868\u73b0\u5f15\u53d1\u8ba8\u8bba': ['\u8c22\u5a1c'],
            }),
          };
        }
        return {
          content: JSON.stringify([
            {
              name: '\u4f55\u7085',
              gender: '\u7537',
              birthday: '1974\u5e744\u670828\u65e5',
              bio: '\u4f55\u7085\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
              photoUrl: '',
              promptText: '\u4f55\u7085\uff0c\u4e3b\u6301\u4eba\u3002',
            },
            {
              name: '\u8c22\u5a1c',
              gender: '\u5973',
              birthday: '1981\u5e745\u67086\u65e5',
              bio: '\u8c22\u5a1c\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
              photoUrl: '',
              promptText: '\u8c22\u5a1c\uff0c\u4e3b\u6301\u4eba\u3002',
            },
          ]),
        };
      },
    };

    const saved: any[] = [];
    const fakeDb: any = {
      hotTopicAnalysis: {
        listPending: () => [
          { id: 1, platform: '\u5fae\u535a', title: '\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae' },
          { id: 2, platform: '\u5fae\u535a', title: '\u8c22\u5a1c\u8282\u76ee\u8868\u73b0\u5f15\u53d1\u8ba8\u8bba' },
        ],
        markExtracted: () => {},
        markProcessed: () => {},
        markFailed: () => {},
        getQueueSummary: () => ({ pendingTopics: 0, coolingFailedTopics: 0, nextRetryAt: '' }),
      },
      hotPeople: {
        findByName: () => null,
        upsert: (input: any) => {
          const item = { id: saved.length + 1, updateTime: new Date().toISOString(), createTime: new Date().toISOString(), ...input };
          saved.push(item);
          return item;
        },
        list: () => saved,
      },
      publicFigureEvidence: {
        findByName: () => null,
        upsert: () => null,
      },
    };

    const service = new HotPeopleService(fakeAiService as any);
    service.init(fakeDb);

    const result = await service.analyzePendingHotTopics({
      limit: 20,
      retriever: 'model',
      provider: 'dashscope',
    });

    expect(result.selectedTopics).toBe(2);
    expect(result.processedTopics).toBe(2);
    expect(result.skippedTopics).toBe(0);
    expect(result.createdCount).toBe(2);
    expect(saved).toHaveLength(2);
    expect(prompts.filter((prompt) => prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b'))).toHaveLength(1);
    expect(prompts.filter((prompt) => prompt.includes('\u516c\u4f17\u4eba\u7269\u8d44\u6599\u6574\u7406\u52a9\u624b'))).toHaveLength(1);
  });

  test('saves core birthday, gender, and qwen verified birthday before slow profile enrichment finishes', async () => {
    const calls: Array<{ prompt: string; model?: string }> = [];
    const fakeAiService = {
      init() {},
      async generateText(options: { prompt: string; model?: string }) {
        calls.push({ prompt: options.prompt, model: options.model });
        if (options.prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b')) {
          return {
            content: JSON.stringify([
              {
                topicId: 1,
                title: '\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae',
                name: '\u4f55\u7085',
                birthday: '1974\u5e744\u670828\u65e5',
                gender: '\u7537',
              },
            ]),
          };
        }
        if (options.prompt.includes('\u516c\u4f17\u4eba\u7269\u751f\u65e5\u6821\u9a8c\u52a9\u624b')) {
          expect(options.model).toBe('kimi-k2.5');
          expect(options.prompt).toContain('\u7b2c\u4e00\u8f6e\u751f\u65e5\uff1a1974\u5e744\u670828\u65e5');
          return {
            content: JSON.stringify([
              { name: '\u4f55\u7085', verifyBirthday: '1974\u5e744\u670828\u65e5' },
            ]),
          };
        }
        throw new Error('profile enrichment should not block the analyze result');
      },
    };

    const saved: any[] = [];
    const fakeDb: any = {
      hotTopicAnalysis: {
        listPending: () => [{ id: 1, platform: '\u5fae\u535a', title: '\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae' }],
        markExtracted: () => {},
        markProcessed: () => {},
        markFailed: () => {},
        getQueueSummary: () => ({ pendingTopics: 0, coolingFailedTopics: 0, nextRetryAt: '' }),
      },
      hotPeople: {
        findByName: (name: string) => saved.find((item) => item.name === name) ?? null,
        upsert: (input: any) => {
          const existing = saved.find((item) => item.name === input.name);
          if (existing) {
            Object.assign(existing, input, { updateTime: new Date().toISOString() });
            return existing;
          }
          const item = { id: saved.length + 1, updateTime: new Date().toISOString(), createTime: new Date().toISOString(), ...input };
          saved.push(item);
          return item;
        },
        list: () => saved,
      },
      publicFigureEvidence: {
        findByName: () => null,
        upsert: () => null,
      },
    };

    const service = new HotPeopleService(fakeAiService as any);
    service.init(fakeDb);

    const result = await service.analyzePendingHotTopics({
      limit: 20,
      retriever: 'model',
      provider: 'dashscope',
    });

    expect(result.createdCount).toBe(1);
    expect(saved[0]).toEqual(expect.objectContaining({
      name: '\u4f55\u7085',
      gender: '\u7537',
      birthday: '1974\u5e744\u670828\u65e5',
      verifyBirthday: '1974\u5e744\u670828\u65e5',
      analysisStatus: 'completed',
    }));
    expect(saved[0].sizhu).toBeTruthy();
    expect(saved[0].bio).toBe('');
    expect(calls.filter((call) => call.prompt.includes('\u70ed\u70b9\u4eba\u7269\u57fa\u7840\u8d44\u6599\u63d0\u53d6\u52a9\u624b'))).toHaveLength(1);
    expect(calls.filter((call) => call.prompt.includes('\u516c\u4f17\u4eba\u7269\u751f\u65e5\u6821\u9a8c\u52a9\u624b'))).toHaveLength(1);
  });

  test('filters noisy extracted names before the birthday pipeline and preserves clean names', async () => {
    const birthdayPrompts: string[] = [];
    const fakeAiService = {
      init() {},
      async generateText(options: { prompt: string }) {
        if (options.prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b')) {
          return {
            content: JSON.stringify({
              '1:\u4e8e\u6b63\u770b\u77ed\u5267Enemy\u770b\u54ed\u4e86': ['\u4e8e\u6b63\u770b\u77ed'],
              '2:\u65f6\u4ee3\u5c11\u5e74\u56e2\u6f14\u5531\u4f1a': ['\u65f6\u4ee3\u5c11\u5e74'],
              '3:\u6797\u4f9d\u6668\u8bf4\u5988\u5988\u5b8c\u7f8e\u5b69\u5b50\u4f1a\u53d8\u5f97\u65e0\u80fd': ['\u6797\u4f9d\u6668\u8bf4'],
            }),
          };
        }

        if (options.prompt.includes('\u516c\u4f17\u4eba\u7269\u751f\u65e5\u63d0\u53d6\u52a9\u624b')) {
          birthdayPrompts.push(options.prompt);
          return {
            content: JSON.stringify([
              { name: '\u4e8e\u6b63', birthday: '1978 \u5e74 2 \u6708 28 \u65e5' },
              { name: '\u6797\u4f9d\u6668', birthday: '1982\u5e7410\u670829\u65e5' },
            ]),
          };
        }

        if (options.prompt.includes('\u516c\u4f17\u4eba\u7269\u751f\u65e5\u6821\u9a8c\u52a9\u624b')) {
          return {
            content: JSON.stringify([
              { name: '\u4e8e\u6b63', verifyBirthday: '1978\u5e742\u670828\u65e5' },
              { name: '\u6797\u4f9d\u6668', verifyBirthday: '1982\u5e7410\u670829\u65e5' },
            ]),
          };
        }

        return {
          content: JSON.stringify([
            {
              name: '\u4e8e\u6b63',
              gender: '\u7537',
              birthday: '1978\u5e742\u670828\u65e5',
              bio: '\u4e8e\u6b63\uff0c\u7f16\u5267\u3001\u5236\u7247\u4eba\u3002',
              photoUrl: '',
              promptText: '\u4e8e\u6b63\uff0c\u7f16\u5267\u3001\u5236\u7247\u4eba\u3002',
            },
            {
              name: '\u6797\u4f9d\u6668',
              gender: '\u5973',
              birthday: '1982\u5e7410\u670829\u65e5',
              bio: '\u6797\u4f9d\u6668\uff0c\u6f14\u5458\u3002',
              photoUrl: '',
              promptText: '\u6797\u4f9d\u6668\uff0c\u6f14\u5458\u3002',
            },
          ]),
        };
      },
    };

    const saved: any[] = [];
    const fakeDb: any = {
      hotTopicAnalysis: {
        listPending: () => [
          { id: 1, platform: '\u5fae\u535a', title: '\u4e8e\u6b63\u770b\u77ed\u5267Enemy\u770b\u54ed\u4e86' },
          { id: 2, platform: '\u5fae\u535a', title: '\u65f6\u4ee3\u5c11\u5e74\u56e2\u6f14\u5531\u4f1a' },
          { id: 3, platform: '\u5fae\u535a', title: '\u6797\u4f9d\u6668\u8bf4\u5988\u5988\u5b8c\u7f8e\u5b69\u5b50\u4f1a\u53d8\u5f97\u65e0\u80fd' },
        ],
        markExtracted: () => {},
        markProcessed: () => {},
        markFailed: () => {},
        getQueueSummary: () => ({ pendingTopics: 0, coolingFailedTopics: 0, nextRetryAt: '' }),
      },
      hotPeople: {
        findByName: () => null,
        upsert: (input: any) => {
          const item = { id: saved.length + 1, updateTime: new Date().toISOString(), createTime: new Date().toISOString(), ...input };
          saved.push(item);
          return item;
        },
        list: () => saved,
      },
      publicFigureEvidence: {
        findByName: () => null,
        upsert: () => null,
      },
    };

    const service = new HotPeopleService(fakeAiService as any);
    service.init(fakeDb);

    const result = await service.analyzePendingHotTopics({
      limit: 20,
      retriever: 'model',
      provider: 'dashscope',
    });

    expect(result.createdCount).toBe(2);
    expect(saved.map((item) => item.name)).toEqual(['\u4e8e\u6b63', '\u6797\u4f9d\u6668']);
    expect(saved.map((item) => item.birthday)).toEqual(['1978\u5e742\u670828\u65e5', '1982\u5e7410\u670829\u65e5']);
    expect(birthdayPrompts).toHaveLength(1);
    expect(birthdayPrompts[0]).toContain('\u4eba\u7269\u540d\uff1a\u4e8e\u6b63');
    expect(birthdayPrompts[0]).toContain('\u4eba\u7269\u540d\uff1a\u6797\u4f9d\u6668');
    expect(birthdayPrompts[0]).not.toContain('\u65f6\u4ee3\u5c11\u5e74');
    expect(birthdayPrompts[0]).not.toContain('\u4e8e\u6b63\u770b\u77ed');
    expect(birthdayPrompts[0]).not.toContain('\u6797\u4f9d\u6668\u8bf4');
  });

  test('drains all pending hot topics across multiple batches in one analyze run', async () => {
    const marks: Array<{ type: string; id: number; names?: string[]; message?: string }> = [];
    const batches = [
      [
        { id: 1, platform: '\u5fae\u535a', title: '\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae' },
        { id: 2, platform: '\u5fae\u535a', title: '\u96be\u542c' },
      ],
      [
        { id: 3, platform: '\u5fae\u535a', title: '\u8c22\u5a1c\u8282\u76ee\u8868\u73b0\u5f15\u53d1\u8ba8\u8bba' },
      ],
      [],
    ];

    const fakeAiService = {
      init() {},
      async generateText(options: { prompt: string }) {
        if (options.prompt.includes('\u70ed\u70b9\u6807\u9898\u4eba\u7269\u62bd\u53d6\u52a9\u624b')) {
          return {
            content: JSON.stringify({
              '1:\u4f55\u7085\u56de\u5e94\u8fd1\u671f\u7efc\u827a\u4e89\u8bae': ['\u4f55\u7085'],
              '2:\u96be\u542c': [],
              '3:\u8c22\u5a1c\u8282\u76ee\u8868\u73b0\u5f15\u53d1\u8ba8\u8bba': ['\u8c22\u5a1c'],
            }),
          };
        }
        if (options.prompt.includes('\u516c\u4f17\u4eba\u7269\u751f\u65e5\u63d0\u53d6\u52a9\u624b')) {
          return {
            content: JSON.stringify([
              { name: '\u4f55\u7085', birthday: '1974\u5e744\u670828\u65e5' },
              { name: '\u8c22\u5a1c', birthday: '1981\u5e745\u67086\u65e5' },
            ]),
          };
        }
        if (options.prompt.includes('\u516c\u4f17\u4eba\u7269\u751f\u65e5\u6821\u9a8c\u52a9\u624b')) {
          return {
            content: JSON.stringify([
              { name: '\u4f55\u7085', verifyBirthday: '1974\u5e744\u670828\u65e5' },
              { name: '\u8c22\u5a1c', verifyBirthday: '1981\u5e745\u67086\u65e5' },
            ]),
          };
        }
        return {
          content: JSON.stringify([
            {
              name: '\u4f55\u7085',
              gender: '\u7537',
              birthday: '1974\u5e744\u670828\u65e5',
              bio: '\u4f55\u7085\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
              photoUrl: '',
              promptText: '\u4f55\u7085\uff0c\u4e3b\u6301\u4eba\u3002',
            },
            {
              name: '\u8c22\u5a1c',
              gender: '\u5973',
              birthday: '1981\u5e745\u67086\u65e5',
              bio: '\u8c22\u5a1c\uff0c\u4e2d\u56fd\u77e5\u540d\u4e3b\u6301\u4eba\u3002',
              photoUrl: '',
              promptText: '\u8c22\u5a1c\uff0c\u4e3b\u6301\u4eba\u3002',
            },
          ]),
        };
      },
    };

    const saved: any[] = [];
    const fakeDb: any = {
      hotTopicAnalysis: {
        listPending: () => batches.shift() ?? [],
        markExtracted: (id: number, names: string[]) => marks.push({ type: 'extracted', id, names }),
        markProcessed: (id: number, names: string[]) => marks.push({ type: 'processed', id, names }),
        markFailed: (id: number, message: string) => marks.push({ type: 'failed', id, message }),
        getQueueSummary: () => ({ pendingTopics: 0, coolingFailedTopics: 0, nextRetryAt: '' }),
      },
      hotPeople: {
        findByName: (name: string) => saved.find((item) => item.name === name) ?? null,
        upsert: (input: any) => {
          const item = { id: saved.length + 1, updateTime: new Date().toISOString(), createTime: new Date().toISOString(), ...input };
          saved.push(item);
          return item;
        },
        list: () => saved,
      },
      publicFigureEvidence: {
        findByName: () => null,
        upsert: () => null,
      },
    };

    const service = new HotPeopleService(fakeAiService as any);
    service.init(fakeDb);

    const result = await service.analyzePendingHotTopics({
      limit: 2,
      retriever: 'model',
      provider: 'dashscope',
    });

    expect(result.selectedTopics).toBe(3);
    expect(result.processedTopics).toBe(3);
    expect(result.skippedTopics).toBe(1);
    expect(result.createdCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(saved.map((item) => item.name)).toEqual(['\u4f55\u7085', '\u8c22\u5a1c']);
    expect(marks).toEqual([
      { type: 'extracted', id: 1, names: ['\u4f55\u7085'] },
      { type: 'extracted', id: 2, names: [] },
      { type: 'processed', id: 2, names: [] },
      { type: 'processed', id: 1, names: ['\u4f55\u7085'] },
      { type: 'extracted', id: 3, names: ['\u8c22\u5a1c'] },
      { type: 'processed', id: 3, names: ['\u8c22\u5a1c'] },
    ]);
  });
});
