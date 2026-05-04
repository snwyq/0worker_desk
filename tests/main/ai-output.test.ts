import { describe, expect, test } from 'vitest';
import { extractGeneratedContent } from '../../src/shared/aiOutput.js';

describe('extractGeneratedContent', () => {
  test('normalizes common workflow output field names', () => {
    expect(extractGeneratedContent({ final_post: ' final post ' })).toEqual({
      content: 'final post',
      sourceKey: 'final_post',
    });
    expect(extractGeneratedContent({ finalContent: 'final content' })).toEqual({
      content: 'final content',
      sourceKey: 'finalContent',
    });
    expect(extractGeneratedContent({ outputDraft: { body: 'object body' } })).toEqual({
      content: 'object body',
      sourceKey: 'outputDraft',
    });
  });
});
