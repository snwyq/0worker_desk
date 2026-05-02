import { describe, expect, it } from 'vitest';
import {
  getSendButtonStatusFromDom,
  hasWeiboUploadingText,
  isSendReadyStable,
  isWeiboSendButtonElement,
  isWeiboUploadInputElement,
} from '../../src/main/publisher/WeiboDom.js';

describe('Weibo DOM helpers', () => {
  it('recognizes send button labels and disabled states', () => {
    expect(isWeiboSendButtonElement({ text: '\u53d1\u9001', disabled: false, className: '' })).toBe(true);
    expect(isWeiboSendButtonElement({ text: '\u53d1\u5e03', disabled: false, className: '' })).toBe(true);
    expect(isWeiboSendButtonElement({ text: '\u8f6c\u53d1', disabled: false, className: '' })).toBe(false);
    expect(getSendButtonStatusFromDom({
      text: '\u53d1\u9001',
      disabled: false,
      ariaDisabled: 'false',
      className: '',
    })).toEqual({ found: true, disabled: false });
    expect(getSendButtonStatusFromDom({
      text: '\u53d1\u9001',
      disabled: false,
      ariaDisabled: 'false',
      className: 'woo-button-disabled',
    })).toEqual({ found: true, disabled: true });
  });

  it('recognizes upload progress text from image and video flows', () => {
    expect(hasWeiboUploadingText('\u56fe\u7247\u4e0a\u4f20\u4e2d\uff0c\u8bf7\u7a0d\u5019')).toBe(true);
    expect(hasWeiboUploadingText('\u89c6\u9891\u8f6c\u7801\u4e2d')).toBe(true);
    expect(hasWeiboUploadingText('\u6b63\u5728\u5904\u7406\u89c6\u9891')).toBe(true);
    expect(hasWeiboUploadingText('\u52a0\u8f7d\u4e2d')).toBe(true);
    expect(hasWeiboUploadingText('\u5fae\u535a\u53d1\u5e03\u5668')).toBe(false);
  });

  it('requires media send readiness to stay stable before continuing', () => {
    expect(isSendReadyStable({ hasMedia: false, elapsedMs: 1000, consecutiveReadyPolls: 1 })).toBe(true);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 10_000, consecutiveReadyPolls: 3 })).toBe(false);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 16_000, consecutiveReadyPolls: 2 })).toBe(false);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 16_000, consecutiveReadyPolls: 3 })).toBe(true);
  });

  it('prefers media file inputs over unrelated file inputs', () => {
    expect(isWeiboUploadInputElement({
      accept: 'image/*,video/*',
      ariaLabel: '',
      className: '',
      hidden: false,
      name: '',
    })).toBe(true);
    expect(isWeiboUploadInputElement({
      accept: '.pdf',
      ariaLabel: 'attachment',
      className: '',
      hidden: false,
      name: 'document',
    })).toBe(false);
    expect(isWeiboUploadInputElement({
      accept: '',
      ariaLabel: '\u6dfb\u52a0\u56fe\u7247',
      className: '',
      hidden: false,
      name: '',
    })).toBe(true);
  });
});
