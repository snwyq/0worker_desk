import { afterEach, describe, expect, test, vi } from 'vitest';
import { createDatabase } from '../../src/main/db/database.js';
import { TopHubTool } from '../../src/main/core/tools/TopHubTool.js';

describe('TopHubTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('fetches node items through configured TopHub API key and base URL', async () => {
    const db = await createDatabase(':memory:');
    db.settings.set('ai.tophubKey', 'test-hot-key');
    db.settings.set('ai.tophubBaseUrl', 'https://example.test/nodes');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: 200,
        data: {
          items: [
            { title: 'first hot topic' },
            { title: 'second hot topic' },
          ],
        },
      }),
    })) as unknown as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const topics = await new TopHubTool(db).execute(
      { id: 'fetch_hot', type: 'tophub_search', nodeId: 'node_001', outputKey: 'hotTopics' },
      {
        runId: 'run_hot_001',
        workflowId: 'maoxiaoxian.hot',
        accountId: null,
        state: {},
        logs: [],
        config: {},
      },
    );

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/nodes/node_001', {
      method: 'GET',
      headers: { Authorization: 'test-hot-key' },
    });
    expect(topics).toEqual(['first hot topic', 'second hot topic']);
  });
});
