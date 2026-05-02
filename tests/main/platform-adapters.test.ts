import { describe, expect, test } from 'vitest';
import { getPlatformAdapter, listPlatformCapabilities, validatePlatformTask } from '../../src/main/platforms/registry.js';
import type { DistributionTask } from '../../src/shared/types.js';

const baseTask: DistributionTask = {
  id: 1,
  contentId: 1,
  accountId: 1,
  platform: 'weibo',
  legacyPostId: 1,
  scheduledAt: '2026-05-01T10:00:00.000Z',
  status: 'queued',
  platformPayload: {
    content: 'hello platform adapter',
    mediaPaths: [],
  },
  lastError: '',
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
};

describe('platform adapters', () => {
  test('registers all planned social platforms with explicit capabilities', () => {
    expect(listPlatformCapabilities().map((platform) => platform.platform)).toEqual([
      'wechat_official',
      'wechat_channels',
      'xiaohongshu',
      'douyin',
      'weibo',
    ]);
    expect(getPlatformAdapter('weibo').capabilities).toMatchObject({
      text: true,
      images: true,
      video: false,
      manualHandoff: true,
    });
  });

  test('validates weibo text tasks and blocks empty content', () => {
    expect(validatePlatformTask(baseTask)).toEqual({ ok: true });
    expect(validatePlatformTask({
      ...baseTask,
      platformPayload: { content: '   ', mediaPaths: [] },
    })).toEqual({
      ok: false,
      reason: 'Content is required',
    });
  });

  test('returns explicit unsupported messages for planned but unfinished platforms', () => {
    expect(validatePlatformTask({
      ...baseTask,
      platform: 'douyin',
      platformPayload: { content: 'video caption', mediaPaths: [] },
    })).toEqual({
      ok: false,
      reason: 'Douyin publishing adapter is planned but not implemented yet',
    });
  });
});
