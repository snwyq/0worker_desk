import { describe, expect, test } from 'vitest';
import { normalizeBirthday, sanitizeExtractedPersonName } from '../../src/main/services/HotPeopleService.js';

describe('hot people name cleaning', () => {
  test('removes common trailing non-name words from extracted people names', () => {
    expect(sanitizeExtractedPersonName('\u5f90\u6d01\u513f\u6253')).toBe('\u5f90\u6d01\u513f');
    expect(sanitizeExtractedPersonName('\u738b\u83f2\u4e0d\u662f')).toBe('\u738b\u83f2');
    expect(sanitizeExtractedPersonName('\u4e25\u6d69\u7fd4\u4e0d')).toBe('\u4e25\u6d69\u7fd4');
    expect(sanitizeExtractedPersonName('\u6797\u4f9d\u6668\u8bf4')).toBe('\u6797\u4f9d\u6668');
    expect(sanitizeExtractedPersonName('\u5f90\u6d01\u513f\u5f81')).toBe('\u5f90\u6d01\u513f');
    expect(sanitizeExtractedPersonName('\u738b\u707f\u5e26\u5973')).toBe('\u738b\u707f');
    expect(sanitizeExtractedPersonName('\u9ec4\u707f\u707f\u8bef')).toBe('\u9ec4\u707f\u707f');
    expect(sanitizeExtractedPersonName('\u7530\u66e6\u8587\u6f14')).toBe('\u7530\u66e6\u8587');
    expect(sanitizeExtractedPersonName('\u5f20\u82e5\u6600\u5510')).toBe('\u5f20\u82e5\u6600');
    expect(sanitizeExtractedPersonName('\u66f9\u67e5\u7406\u8d5e')).toBe('\u66f9\u67e5\u7406');
    expect(sanitizeExtractedPersonName('\u5f20\u82e5\u6600\u4e3a')).toBe('\u5f20\u82e5\u6600');
    expect(sanitizeExtractedPersonName('\u8521\u5353\u598d\u5a5a')).toBe('\u8521\u5353\u598d');
  });

  test('removes common leading sensational words from extracted people names', () => {
    expect(sanitizeExtractedPersonName('\u66dd\u4e25\u519b\u4e54')).toBe('\u4e25\u519b\u4e54');
    expect(sanitizeExtractedPersonName('\u7206\u738b\u83f2')).toBe('\u738b\u83f2');
  });

  test('normalizes birthdays that contain spaces between Chinese date parts', () => {
    expect(normalizeBirthday('1995 年 2 月 28 日')).toBe('1995\u5e742\u670828\u65e5');
    expect(normalizeBirthday('1978年10月12日')).toBe('1978\u5e7410\u670812\u65e5');
  });
});
