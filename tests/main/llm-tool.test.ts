import { describe, expect, test } from 'vitest';
import { LlmTool } from '../../src/main/core/tools/LlmTool.js';

describe('LlmTool prompt interpolation', () => {
  test('interpolates top-level keys and nested state paths', () => {
    const tool = new LlmTool();
    const interpolate = (tool as unknown as {
      interpolate: (template: string, state: Record<string, unknown>) => string;
    }).interpolate;

    const prompt = interpolate(
      'Topic: {{topic}}. Summary: {{state.baziResult.summary}}. Person: {{state.person.name}}.',
      {
        topic: 'hot topic',
        baziResult: { summary: 'balanced elements' },
        person: { name: 'demo person' },
      },
    );

    expect(prompt).toBe('Topic: hot topic. Summary: balanced elements. Person: demo person.');
  });
});
