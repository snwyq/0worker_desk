import { afterEach, describe, expect, test, vi } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';
import { AiService } from '../../src/main/services/AiService.js';

describe('AiService hot topic sync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('uses incremental inserts and exposes source-level failures', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('ai.tophubKey', 'test-hot-key');
    db.settings.set('ai.tophubBaseUrl', 'https://example.test/nodes');
    db.hotTopicsHistory.saveMany([
      { platform: '微博', title: 'kept topic', url: 'https://example.com/kept', rank: 1, hotValue: '100w' },
    ]);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/WmoOzOle4E')) {
        return {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({ status: 503 }),
        };
      }

      const nodeId = url.split('/').pop();
      const title = nodeId === '3QeLwJEd7k' ? 'kept topic' : `new topic ${nodeId}`;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          status: 200,
          data: {
            items: [{ title, url: `https://example.com/${nodeId}` }],
          },
        }),
      };
    }) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const service = new AiService();
    service.init(db);

    const result = await service.fetchHotTopics(false);
    const latest = db.hotTopicsHistory.getLatest(10);

    expect(result.insertedCount).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(latest).toHaveLength(2);
    expect(result.sourceStatus).toEqual(expect.arrayContaining([
      expect.objectContaining({ platform: '腾讯', ok: false, reason: expect.stringContaining('503') }),
    ]));
  });
});
