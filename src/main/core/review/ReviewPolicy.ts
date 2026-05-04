import type { ContentStatus, ReviewMode } from '../../../shared/types.js';

export type ReviewPolicyDecision = {
  contentStatus: ContentStatus;
  createReview: boolean;
  reviewMode: ReviewMode;
  comment: string;
};

export type ReviewPolicyInput = {
  requestedMode?: unknown;
  stylePolicy?: Record<string, unknown>;
  riskScore?: number;
  seed?: string;
};

function asReviewMode(value: unknown): ReviewMode | null {
  return value === 'manual' || value === 'auto' || value === 'sample' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hashToUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function decideReviewPolicy(input: ReviewPolicyInput): ReviewPolicyDecision {
  const policy = input.stylePolicy ?? {};
  const mode = asReviewMode(input.requestedMode) ?? asReviewMode(policy.mode) ?? 'manual';
  const riskScore = input.riskScore ?? 0;

  if (mode === 'manual') {
    return {
      contentStatus: 'reviewing',
      createReview: true,
      reviewMode: 'manual',
      comment: 'Created by workflow persist step',
    };
  }

  if (mode === 'auto') {
    const threshold = asNumber(policy.autoApproveWhenRiskBelow)
      ?? asNumber(policy.autoApproveBelowRiskScore)
      ?? 20;
    if (riskScore < threshold) {
      return {
        contentStatus: 'approved',
        createReview: false,
        reviewMode: 'auto',
        comment: 'Auto approved by low risk policy',
      };
    }

    return {
      contentStatus: 'reviewing',
      createReview: true,
      reviewMode: 'manual',
      comment: `Escalated to manual review because risk score ${riskScore} is not below ${threshold}`,
    };
  }

  const sampleRate = Math.max(0, Math.min(1, asNumber(policy.sampleRate) ?? 0));
  const sampled = sampleRate >= 1 || (sampleRate > 0 && hashToUnit(input.seed ?? '') < sampleRate);
  return {
    contentStatus: sampled ? 'reviewing' : 'approved',
    createReview: sampled,
    reviewMode: 'sample',
    comment: sampled ? `Selected by sample review policy at rate ${sampleRate}` : 'Approved outside sample review cohort',
  };
}
