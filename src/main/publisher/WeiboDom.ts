export interface ElementSnapshot {
  accept?: string;
  ariaDisabled?: string | null;
  ariaLabel?: string | null;
  className?: string;
  disabled?: boolean;
  hidden?: boolean;
  name?: string;
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
  return text === '\u53d1\u9001' || text === '\u53d1\u5e03';
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
}) {
  if (!options.hasMedia) {
    return options.consecutiveReadyPolls >= 1;
  }

  return options.elapsedMs >= 15_000 && options.consecutiveReadyPolls >= 3;
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
