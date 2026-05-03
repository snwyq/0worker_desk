import { describe, expect, it } from 'vitest';
import { readTaskEditorDraft } from '../../src/renderer/queueEditorModel';
import type { ContentItem, DistributionTask } from '../../src/shared/types';

const task: DistributionTask = {
  id: 1,
  contentId: 10,
  accountId: 2,
  platform: 'weibo',
  legacyPostId: 3,
  scheduledAt: '2026-05-03T10:00:00.000Z',
  status: 'queued',
  platformPayload: {},
  lastError: '',
  createdAt: '',
  updatedAt: '',
};

const content: ContentItem = {
  id: 10,
  title: 'fallback',
  body: '<p>fallback body</p>',
  source: 'manual',
  status: 'ready',
  createdAt: '',
  updatedAt: '',
};

describe('queue editor model', () => {
  it('reads editable content and media paths from task payload', () => {
    expect(readTaskEditorDraft({
      ...task,
      platformPayload: {
        content: '<p>payload body</p>',
        mediaPaths: ['D:/a.jpg', 'D:/b.jpg'],
      },
    }, [content])).toEqual({
      contentHtml: '<p>payload body</p>',
      mediaPathsText: 'D:/a.jpg\nD:/b.jpg',
    });
  });

  it('falls back to content library body when task payload has no content', () => {
    expect(readTaskEditorDraft(task, [content])).toEqual({
      contentHtml: '<p>fallback body</p>',
      mediaPathsText: '',
    });
  });
});
