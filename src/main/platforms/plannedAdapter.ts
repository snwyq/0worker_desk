import type { PlatformCode } from '../../shared/types.js';
import type { PlatformAdapter } from './types.js';

export function createPlannedAdapter(
  platform: PlatformCode,
  displayName: string,
  logName: string,
  media: { text: boolean; images: boolean; video: boolean; richText: boolean },
): PlatformAdapter {
  return {
    platform,
    displayName,
    capabilities: {
      ...media,
      scheduledPublish: true,
      manualHandoff: true,
      implemented: false,
    },
    validate() {
      return {
        ok: false,
        reason: `${logName} publishing adapter is planned but not implemented yet`,
      };
    },
  };
}
