import fs from 'node:fs';
import type { Post } from '../../shared/types.js';
import type { AdsPowerBrowserInfo } from '../browser/AdsPowerApi.js';
import { RawCdpClient } from '../browser/RawCdpClient.js';
import {
  getSendButtonStatusFromDom,
  hasWeiboUploadingText,
  isSendReadyStable,
  isDisabledElement,
  isWeiboComposePlaceholder,
  isWeiboSendButtonElement,
  isWeiboUploadInputElement,
  normalizeText,
} from './WeiboDom.js';

interface DebugTarget {
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

interface ButtonLocation {
  ok: boolean;
  message: string;
  url: string;
  title: string;
  x?: number;
  y?: number;
}

async function findWeiboPage(debugPort: number): Promise<DebugTarget> {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
  if (!response.ok) {
    throw new Error(`Unable to list debug targets from port ${debugPort}`);
  }

  const targets = await response.json() as DebugTarget[];
  const weiboPages = targets.filter((target) => target.type === 'page' && target.url.startsWith('https://weibo.com/'));
  const page = weiboPages.find((target) => !target.url.includes('newlogin') && !target.url.includes('passport.weibo'))
    ?? weiboPages[0];
  if (!page) {
    throw new Error('No active weibo.com page was found in AdsPower browser');
  }

  return page;
}

export async function fillWeiboDraft(browserInfo: AdsPowerBrowserInfo, post: Post) {
  const page = await findWeiboPage(browserInfo.debugPort);
  const client = await RawCdpClient.connect(page.webSocketDebuggerUrl);

  try {
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    const draftResult = await fillComposeText(client, post.content);
    const uploadResult = await uploadMediaFiles(client, post.mediaPaths);
    const ready = await waitForSendReady(client, {
      hasMedia: uploadResult.uploaded > 0,
      timeoutMs: uploadResult.uploaded > 0 ? 120_000 : 8_000,
    });

    return {
      ...draftResult,
      sendButtonDisabled: ready.sendButtonDisabled,
      message: [
        draftResult.message,
        uploadResult.uploaded > 0 ? `uploaded ${uploadResult.uploaded} media file(s)` : '',
        ready.ok ? 'send button is ready' : ready.message,
      ].filter(Boolean).join('; '),
    };
  } finally {
    client.close();
  }
}

async function fillComposeText(client: RawCdpClient, content: string) {
  const result = await client.send<{ result: { value: {
    ok: boolean;
    message: string;
    url: string;
    title: string;
    sendButtonText?: string;
    sendButtonDisabled?: boolean;
  } } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const content = ${JSON.stringify(content)};
      const textarea = findComposeTextarea();

      if (!textarea) {
        return { ok: false, message: 'Weibo compose textarea was not found', url: location.href, title: document.title };
      }

      textarea.focus();
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      valueSetter?.call(textarea, content);
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));

      const sendButton = findSendButton();
      const sendStatus = getSendButtonStatusFromDom(toElementSnapshot(sendButton));

      return {
        ok: true,
        message: sendButton ? 'Draft filled and send button detected' : 'Draft filled but send button was not found',
        url: location.href,
        title: document.title,
        sendButtonText: sendButton?.innerText?.trim() || '',
        sendButtonDisabled: sendStatus.disabled,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result.value;
}

async function uploadMediaFiles(client: RawCdpClient, mediaPaths: string[]) {
  const paths = mediaPaths.map((filePath) => filePath.trim()).filter(Boolean);
  if (!paths.length) {
    return { uploaded: 0 };
  }

  const missing = paths.filter((filePath) => !fs.existsSync(filePath));
  if (missing.length) {
    throw new Error(`Media file was not found: ${missing.join(', ')}`);
  }

  const document = await client.send<{ root: { nodeId: number } }>('DOM.getDocument', {
    depth: -1,
    pierce: true,
  });
  const selector = await readMediaInputSelector(client);

  const input = await client.send<{ nodeId: number }>('DOM.querySelector', {
    nodeId: document.root.nodeId,
    selector,
  });

  if (!input.nodeId) {
    throw new Error('Weibo file input was not found');
  }

  await client.send('DOM.setFileInputFiles', {
    nodeId: input.nodeId,
    files: paths,
  });

  return { uploaded: paths.length };
}

async function readMediaInputSelector(client: RawCdpClient) {
  const result = await client.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const inputs = [...document.querySelectorAll('input[type="file"]')];
      const matched = inputs.find((el) => isWeiboUploadInputElement(toElementSnapshot(el)));
      if (!matched) {
        return 'input[type="file"]';
      }
      const accept = matched.getAttribute('accept');
      if (accept?.includes('image')) {
        return 'input[type="file"][accept*="image"]';
      }
      if (accept?.includes('video')) {
        return 'input[type="file"][accept*="video"]';
      }
      const ariaLabel = matched.getAttribute('aria-label');
      if (ariaLabel?.includes('\\u56fe\\u7247')) {
        return 'input[type="file"][aria-label*="\\u56fe\\u7247"]';
      }
      if (ariaLabel?.includes('\\u89c6\\u9891')) {
        return 'input[type="file"][aria-label*="\\u89c6\\u9891"]';
      }
      return 'input[type="file"]';
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result.value;
}

async function waitForSendReady(client: RawCdpClient, options: { hasMedia: boolean; timeoutMs: number }) {
  const started = Date.now();
  let consecutiveReadyPolls = 0;
  let last = {
    ok: false,
    message: 'Send button is not ready yet',
    remainingText: '',
    sendButtonDisabled: true,
    hasUploadingText: false,
  };

  while (Date.now() - started < options.timeoutMs) {
    const status = await readSendStatus(client);
    last = status;
    if (status.ok) {
      consecutiveReadyPolls += 1;
      if (isSendReadyStable({
        hasMedia: options.hasMedia,
        elapsedMs: Date.now() - started,
        consecutiveReadyPolls,
      })) {
        return {
          ...status,
          message: options.hasMedia
            ? `Send button stayed ready after media settling (${consecutiveReadyPolls} checks)`
            : status.message,
        };
      }
    } else {
      consecutiveReadyPolls = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    ...last,
    ok: false,
    message: `Send button was still not stable after ${Math.round(options.timeoutMs / 1000)} seconds`,
  };
}

async function readSendStatus(client: RawCdpClient) {
  const result = await client.send<{ result: { value: {
    ok: boolean;
    message: string;
    remainingText: string;
    sendButtonDisabled: boolean;
    hasUploadingText: boolean;
  } } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const textarea = findComposeTextarea();
      const remainingText = (textarea?.value || '').trim();
      const sendButton = findSendButton();
      const pageText = document.body.innerText || '';
      const uploading = hasWeiboUploadingText(pageText);
      const sendStatus = getSendButtonStatusFromDom(toElementSnapshot(sendButton));

      return {
        ok: Boolean(remainingText) && sendStatus.found && !sendStatus.disabled && !uploading,
        message: sendButton
          ? (sendStatus.disabled ? 'Send button is disabled' : 'Send button is enabled')
          : 'Send button was not found',
        remainingText,
        sendButtonDisabled: sendStatus.disabled,
        hasUploadingText: uploading,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result.value;
}

export async function publishWeiboDraft(browserInfo: AdsPowerBrowserInfo) {
  const page = await findWeiboPage(browserInfo.debugPort);
  const client = await RawCdpClient.connect(page.webSocketDebuggerUrl);

  try {
    await client.send('Runtime.enable');

    const ready = await waitForSendReady(client, { hasMedia: false, timeoutMs: 60_000 });
    if (!ready.ok) {
      return { ok: false, message: ready.message, url: page.url, title: page.title };
    }

    const button = await locateSendButton(client);
    if (!button.ok || button.x === undefined || button.y === undefined) {
      return button;
    }

    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: button.x,
      y: button.y,
      button: 'none',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: button.x,
      y: button.y,
      button: 'left',
      clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: button.x,
      y: button.y,
      button: 'left',
      clickCount: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 3500));

    const verify = await verifySendClick(client);
    return {
      ok: verify.ok,
      message: verify.message,
      url: button.url,
      title: button.title,
    };
  } finally {
    client.close();
  }
}

async function locateSendButton(client: RawCdpClient): Promise<ButtonLocation> {
  const result = await client.send<{ result: { value: ButtonLocation } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const sendButton = findSendButton();

      if (!sendButton) {
        return { ok: false, message: 'Send button was not found', url: location.href, title: document.title };
      }

      if (getSendButtonStatusFromDom(toElementSnapshot(sendButton)).disabled) {
        return { ok: false, message: 'Send button is disabled', url: location.href, title: document.title };
      }

      const rect = sendButton.getBoundingClientRect();
      return {
        ok: true,
        message: 'Send button located',
        url: location.href,
        title: document.title,
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result.value;
}

async function verifySendClick(client: RawCdpClient) {
  const result = await client.send<{ result: { value: {
    ok: boolean;
    message: string;
    remainingText: string;
    sendButtonDisabled: boolean;
  } } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const textarea = findComposeTextarea();
      const remainingText = (textarea?.value || '').trim();
      const sendButton = findSendButton();
      const sendButtonDisabled = getSendButtonStatusFromDom(toElementSnapshot(sendButton)).disabled;

      return {
        ok: !remainingText || sendButtonDisabled,
        message: !remainingText || sendButtonDisabled
          ? 'Send button clicked and compose box cleared or disabled'
          : 'Send click did not clear compose box',
        remainingText,
        sendButtonDisabled,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result.value;
}

function weiboDomRuntimeHelpers() {
  return `
    const normalizeText = ${normalizeText.toString()};
    const isWeiboComposePlaceholder = ${isWeiboComposePlaceholder.toString()};
    const isWeiboSendButtonElement = ${isWeiboSendButtonElement.toString()};
    const isDisabledElement = ${isDisabledElement.toString()};
    const getSendButtonStatusFromDom = ${getSendButtonStatusFromDom.toString()};
    const hasWeiboUploadingText = ${hasWeiboUploadingText.toString()};
    const isWeiboUploadInputElement = ${isWeiboUploadInputElement.toString()};
    const toElementSnapshot = (el) => el ? ({
      accept: el.getAttribute?.('accept') || '',
      ariaDisabled: el.getAttribute?.('aria-disabled'),
      ariaLabel: el.getAttribute?.('aria-label'),
      className: typeof el.className === 'string' ? el.className : '',
      disabled: Boolean(el.disabled),
      hidden: Boolean(el.hidden || el.offsetParent === null),
      name: el.getAttribute?.('name') || '',
      text: el.innerText || el.textContent || '',
    }) : null;
    const findComposeTextarea = () => [...document.querySelectorAll('textarea')]
      .find((el) => isWeiboComposePlaceholder(el.getAttribute('placeholder')))
      ?? document.querySelector('textarea');
    const findSendButton = () => [...document.querySelectorAll('button, [role="button"]')]
      .find((el) => isWeiboSendButtonElement({ text: el.innerText || el.textContent || '' }));
  `;
}
