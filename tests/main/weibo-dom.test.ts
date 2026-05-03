import { describe, expect, it } from 'vitest';
import {
  getSendButtonStatusFromDom,
  getWeiboMediaSettleMs,
  getWeiboRawRetryDecision,
  getWeiboUploadBlockCooldownMs,
  hasExpectedWeiboMediaReady,
  hasWeiboUploadingText,
  getWeiboManualPublishDecision,
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
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 7000, consecutiveReadyPolls: 3 })).toBe(false);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 9000, consecutiveReadyPolls: 2 })).toBe(false);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 9000, consecutiveReadyPolls: 3 })).toBe(true);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 6000, consecutiveReadyPolls: 3, phase: 'draft' })).toBe(true);
  });

  it('scales media settle and upload-block cooldown by media count', () => {
    expect(getWeiboMediaSettleMs(1)).toBe(8000);
    expect(getWeiboMediaSettleMs(2)).toBe(12000);
    expect(getWeiboMediaSettleMs(3)).toBe(15000);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 9000, consecutiveReadyPolls: 3, mediaCount: 2 })).toBe(false);
    expect(isSendReadyStable({ hasMedia: true, elapsedMs: 13_000, consecutiveReadyPolls: 3, mediaCount: 2 })).toBe(true);
    expect(getWeiboUploadBlockCooldownMs(1)).toBe(6000);
    expect(getWeiboUploadBlockCooldownMs(2)).toBe(10000);
  });

  it('requires all expected media previews before treating media as upload-ready', () => {
    expect(hasExpectedWeiboMediaReady({
      expectedMediaCount: 2,
      mediaPreviewCount: 1,
      mediaLoadingCount: 0,
      hasUploadingText: false,
    })).toBe(false);
    expect(hasExpectedWeiboMediaReady({
      expectedMediaCount: 2,
      mediaPreviewCount: 2,
      mediaLoadingCount: 1,
      hasUploadingText: false,
    })).toBe(false);
    expect(hasExpectedWeiboMediaReady({
      expectedMediaCount: 2,
      mediaPreviewCount: 2,
      mediaLoadingCount: 0,
      hasUploadingText: false,
    })).toBe(true);
  });

  it('keeps waiting after an upload-blocked click until media is really ready', () => {
    expect(getWeiboManualPublishDecision({
      hasMedia: true,
      clickCount: 1,
      currentText: 'hello',
      hasAnyBoxes: true,
      hasLoading: false,
      hasRenderableMedia: false,
      hasUploadBlockingText: false,
      sendButtonFound: true,
      sendButtonDisabled: false,
      consecutiveReadyPolls: 5,
      elapsedMs: 45_000,
    })).toEqual({ action: 'wait', reason: 'Media preview is not fully rendered yet' });

    expect(getWeiboManualPublishDecision({
      hasMedia: true,
      clickCount: 1,
      currentText: 'hello',
      hasAnyBoxes: true,
      hasLoading: false,
      hasRenderableMedia: true,
      hasUploadBlockingText: true,
      sendButtonFound: true,
      sendButtonDisabled: false,
      consecutiveReadyPolls: 5,
      elapsedMs: 45_000,
    })).toEqual({ action: 'wait', reason: 'Weibo still reports media upload or processing' });
  });

  it('clicks only after media preview and send readiness stay stable', () => {
    const readyState = {
      hasMedia: true,
      clickCount: 0,
      currentText: 'hello',
      hasAnyBoxes: true,
      hasLoading: false,
      hasRenderableMedia: true,
      hasUploadBlockingText: false,
      sendButtonFound: true,
      sendButtonDisabled: false,
      elapsedMs: 45_000,
    };

    expect(getWeiboManualPublishDecision({
      ...readyState,
      consecutiveReadyPolls: 2,
    })).toEqual({ action: 'wait', reason: 'Send button readiness is not stable yet' });

    expect(getWeiboManualPublishDecision({
      ...readyState,
      consecutiveReadyPolls: 3,
    })).toEqual({ action: 'click', reason: 'Send button is ready and media has settled' });
  });

  it('falls back to stable send readiness when Weibo uses an unknown uploaded-media DOM', () => {
    expect(getWeiboManualPublishDecision({
      hasMedia: true,
      clickCount: 1,
      currentText: 'hello',
      hasAnyBoxes: true,
      hasLoading: false,
      hasRenderableMedia: false,
      hasUploadBlockingText: false,
      mediaFallbackReady: true,
      sendButtonFound: true,
      sendButtonDisabled: false,
      consecutiveReadyPolls: 5,
      elapsedMs: 60_000,
    })).toEqual({ action: 'click', reason: 'Send button is ready and media has settled' });
  });

  it('treats cleared compose text after a click as publish success', () => {
    expect(getWeiboManualPublishDecision({
      hasMedia: true,
      clickCount: 1,
      currentText: '',
      hasAnyBoxes: false,
      hasLoading: false,
      hasRenderableMedia: false,
      hasUploadBlockingText: false,
      sendButtonFound: false,
      sendButtonDisabled: true,
      consecutiveReadyPolls: 0,
      elapsedMs: 50_000,
    })).toEqual({ action: 'success', reason: 'Compose text was cleared after clicking send' });
  });

  it('backs off to full waiting when a raw send click reveals upload blocking text', () => {
    expect(getWeiboRawRetryDecision({
      remainingText: 'hello',
      sendButtonDisabled: false,
      hasUploadingText: true,
    })).toBe('full-wait');
    expect(getWeiboRawRetryDecision({
      remainingText: 'hello',
      sendButtonDisabled: false,
      hasUploadingText: false,
    })).toBe('quick-retry');
    expect(getWeiboRawRetryDecision({
      remainingText: '',
      sendButtonDisabled: true,
      hasUploadingText: false,
    })).toBe('stop');
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
