import type { DistributionTask, PlatformCapabilities, PlatformCode } from '../../shared/types.js';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export interface PlatformAdapter {
  platform: PlatformCode;
  displayName: string;
  capabilities: Omit<PlatformCapabilities, 'platform' | 'displayName'>;
  validate(task: DistributionTask): ValidationResult;
}

export type { PlatformCapabilities };

export function readTaskContent(task: DistributionTask) {
  return String(task.platformPayload.content ?? task.platformPayload.body ?? '').trim();
}
