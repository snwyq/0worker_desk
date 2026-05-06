import { describe, expect, it } from 'vitest';
import { normalizePublishMediaPaths } from '../../src/shared/mediaPaths.js';

describe('publish media path normalization', () => {
  it('drops placeholder and pending media paths before publishing', () => {
    expect(normalizePublishMediaPaths([
      '',
      '   ',
      'pending://hot-bazi/1/example',
      'D:\\Image.jpg',
      'D:\\Images\\1.jpg',
      'C:\\real\\photo.png',
    ])).toEqual(['C:\\real\\photo.png']);
  });
});
