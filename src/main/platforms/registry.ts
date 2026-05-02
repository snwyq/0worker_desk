import type { DistributionTask, PlatformCode } from '../../shared/types.js';
import { createPlannedAdapter } from './plannedAdapter.js';
import type { PlatformAdapter, PlatformCapabilities, ValidationResult } from './types.js';
import { weiboAdapter } from './weibo/adapter.js';

const adapters: Record<PlatformCode, PlatformAdapter> = {
  wechat_official: createPlannedAdapter('wechat_official', '微信公众号', 'WeChat Official Account', {
    text: true,
    images: true,
    video: false,
    richText: true,
  }),
  wechat_channels: createPlannedAdapter('wechat_channels', '视频号', 'WeChat Channels', {
    text: true,
    images: false,
    video: true,
    richText: false,
  }),
  xiaohongshu: createPlannedAdapter('xiaohongshu', '小红书', 'Xiaohongshu', {
    text: true,
    images: true,
    video: true,
    richText: false,
  }),
  douyin: createPlannedAdapter('douyin', '抖音', 'Douyin', {
    text: true,
    images: true,
    video: true,
    richText: false,
  }),
  weibo: weiboAdapter,
};

const platformOrder: PlatformCode[] = ['wechat_official', 'wechat_channels', 'xiaohongshu', 'douyin', 'weibo'];

export function getPlatformAdapter(platform: PlatformCode): PlatformAdapter {
  return adapters[platform];
}

export function listPlatformCapabilities(): PlatformCapabilities[] {
  return platformOrder.map((platform) => {
    const adapter = getPlatformAdapter(platform);
    return {
      platform: adapter.platform,
      displayName: adapter.displayName,
      ...adapter.capabilities,
    };
  });
}

export function validatePlatformTask(task: DistributionTask): ValidationResult {
  return getPlatformAdapter(task.platform).validate(task);
}
