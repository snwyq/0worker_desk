export interface ElementSnapshot {
  accept?: string;
  ariaDisabled?: string | null;
  ariaLabel?: string | null;
  className?: string;
  disabled?: boolean;
  hidden?: boolean;
  name?: string;
  title?: string | null;
  role?: string | null;
  dataset?: Record<string, string>;
  text?: string;
}

export function normalizeText(text: string | null | undefined) {
  return (text ?? '').replace(/\s+/g, '').trim();
}

export function isWeiboComposePlaceholder(text: string | null | undefined) {
  const normalized = normalizeText(text);
  return normalized.includes('\u6709\u4ec0\u4e48\u65b0\u9c9c\u4e8b') || normalized.includes('Whatishappening');
}

export function isWeiboSendButtonElement(element: ElementSnapshot) {
  const text = normalizeText(element.text);
  const title = normalizeText(element.title);
  const ariaLabel = normalizeText(element.ariaLabel);
  const role = normalizeText(element.role);
  const datasetText = normalizeText([
    element.dataset?.action,
    element.dataset?.type,
    element.dataset?.name,
    element.dataset?.role,
  ].filter(Boolean).join(' '));
  const buttonText = text || title || ariaLabel || datasetText;
  return buttonText === '\u53d1\u9001'
    || buttonText === '\u53d1\u5e03'
    || role === 'button' && (text.includes('\u53d1\u9001') || text.includes('\u53d1\u5e03'));
}

export function isDisabledElement(element: ElementSnapshot) {
  const className = element.className ?? '';
  return Boolean(
    element.disabled
      || element.ariaDisabled === 'true'
      || /\b(disabled|woo-button-disabled|is-disabled)\b/i.test(className),
  );
}

export function getSendButtonStatusFromDom(element: ElementSnapshot | null | undefined) {
  if (!element || !isWeiboSendButtonElement(element)) {
    return { found: false, disabled: true };
  }

  return {
    found: true,
    disabled: isDisabledElement(element),
  };
}

export function hasWeiboUploadingText(text: string | null | undefined) {
  return /(\u4e0a\u4f20\u4e2d|\u6b63\u5728\u4e0a\u4f20|\u52a0\u8f7d\u4e2d|\u8bf7\u7a0d\u5019|\u8f6c\u7801\u4e2d|\u6b63\u5728\u5904\u7406|\u5904\u7406\u4e2d|uploading|loading|processing|transcoding|please wait)/i.test(text ?? '');
}

export function isSendReadyStable(options: {
  hasMedia: boolean;
  elapsedMs: number;
  consecutiveReadyPolls: number;
  phase?: 'draft' | 'publish';
  mediaCount?: number;
}) {
  if (!options.hasMedia) {
    return options.consecutiveReadyPolls >= 1;
  }

  if (options.phase === 'draft') {
    return options.elapsedMs >= 5_000 && options.consecutiveReadyPolls >= 3;
  }

  return options.elapsedMs >= getWeiboMediaSettleMs(options.mediaCount ?? 1) && options.consecutiveReadyPolls >= 3;
}

export function getWeiboMediaSettleMs(mediaCount: number) {
  if (mediaCount <= 1) {
    return 8_000;
  }

  if (mediaCount === 2) {
    return 12_000;
  }

  return 15_000;
}

export function getWeiboUploadBlockCooldownMs(mediaCount: number) {
  return mediaCount <= 1 ? 6_000 : 10_000;
}

export function hasExpectedWeiboMediaReady(options: {
  expectedMediaCount: number;
  mediaPreviewCount: number;
  mediaLoadingCount: number;
  hasUploadingText: boolean;
}) {
  if (options.expectedMediaCount <= 0) {
    return true;
  }

  return options.mediaPreviewCount >= options.expectedMediaCount
    && options.mediaLoadingCount === 0
    && !options.hasUploadingText;
}

export interface WeiboManualPublishState {
  hasMedia: boolean;
  clickCount: number;
  currentText: string;
  hasAnyBoxes: boolean;
  hasLoading: boolean;
  hasRenderableMedia: boolean;
  mediaFallbackReady?: boolean;
  hasUploadBlockingText: boolean;
  sendButtonFound: boolean;
  sendButtonDisabled: boolean;
  consecutiveReadyPolls: number;
  elapsedMs: number;
}

export type WeiboManualPublishDecision =
  | { action: 'success'; reason: string }
  | { action: 'click'; reason: string }
  | { action: 'wait'; reason: string };

export type WeiboRawRetryDecision = 'full-wait' | 'quick-retry' | 'stop';

export function getWeiboRawRetryDecision(state: {
  remainingText: string;
  sendButtonDisabled: boolean;
  hasUploadingText: boolean;
}) {
  if (!state.remainingText || state.sendButtonDisabled) {
    return 'stop' satisfies WeiboRawRetryDecision;
  }

  if (state.hasUploadingText) {
    return 'full-wait' satisfies WeiboRawRetryDecision;
  }

  return 'quick-retry' satisfies WeiboRawRetryDecision;
}

export function getWeiboManualPublishDecision(state: WeiboManualPublishState): WeiboManualPublishDecision {
  if (state.clickCount > 0 && state.currentText === '') {
    return { action: 'success', reason: 'Compose text was cleared after clicking send' };
  }

  if (state.hasMedia) {
    if (!state.hasAnyBoxes) {
      return { action: 'wait', reason: 'Media layout boxes are not visible yet' };
    }

    if (state.hasLoading) {
      return { action: 'wait', reason: 'Media loading spinner is still visible' };
    }

    if (!state.hasRenderableMedia && !state.mediaFallbackReady) {
      return { action: 'wait', reason: 'Media preview is not fully rendered yet' };
    }
  }

  if (state.hasUploadBlockingText) {
    return { action: 'wait', reason: 'Weibo still reports media upload or processing' };
  }

  if (!state.sendButtonFound) {
    return { action: 'wait', reason: 'Send button was not found' };
  }

  if (state.sendButtonDisabled) {
    return { action: 'wait', reason: 'Send button is disabled' };
  }

  if (!isSendReadyStable({
    hasMedia: state.hasMedia,
    elapsedMs: state.elapsedMs,
    consecutiveReadyPolls: state.consecutiveReadyPolls,
  })) {
    return { action: 'wait', reason: 'Send button readiness is not stable yet' };
  }

  return {
    action: 'click',
    reason: state.hasMedia ? 'Send button is ready and media has settled' : 'Send button is ready',
  };
}

export function isWeiboUploadInputElement(element: ElementSnapshot) {
  const haystack = [
    element.accept,
    element.ariaLabel,
    element.className,
    element.name,
  ].join(' ');

  if (/\b(pdf|doc|docx|xls|xlsx|zip)\b/i.test(haystack)) {
    return false;
  }

  return /(\bimage\b|\bvideo\b|\.(jpg|jpeg|png|gif|heic|heif|mp4|mov|m4v)|\u56fe\u7247|\u76f8\u518c|\u89c6\u9891|\u4e0a\u4f20)/i.test(haystack);
}
