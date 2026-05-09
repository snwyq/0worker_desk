import type { DistributionTask } from '../../../shared/types.js';
import type { PlatformAdapter, ValidationResult } from '../types.js';
import { readTaskContent } from '../types.js';

export const weiboAdapter: PlatformAdapter = {
  platform: 'weibo',
  displayName: '微博',
  capabilities: {
    text: true,
    images: true,
    video: true,
    richText: false,
    scheduledPublish: true,
    manualHandoff: true,
    implemented: true,
  },
  validate(task: DistributionTask): ValidationResult {
    if (!readTaskContent(task)) {
      return { ok: false, reason: 'Content is required' };
    }

    return { ok: true };
  },
};
