import fs from 'node:fs';
import type { Post } from '../../shared/types.js';
import type { AdsPowerBrowserInfo } from '../browser/AdsPowerApi.js';
import { RawCdpClient } from '../browser/RawCdpClient.js';
import {
  humanDelay,
  humanPreClickPause,
  humanJitterCoord,
  humanClickPressDuration,
  humanTypingChunks,
  generateMousePath,
  randomMouseOrigin,
} from './HumanDelay.js';
import { normalizeWeiboPostText } from './WeiboContent.js';
import { appendWeiboPublishLog } from './WeiboDiagnostics.js';
import {
  getSendButtonStatusFromDom,
  getWeiboUploadBlockCooldownMs,
  getWeiboRawRetryDecision,
  hasWeiboUploadingText,
  hasExpectedWeiboMediaReady,
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
  width?: number;
  height?: number;
}

interface RawPublishOptions {
  hasMedia?: boolean;
  mediaCount?: number;
  logPath?: string;
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function createRawPublishLogger(logPath: string | undefined, label: string) {
  const recent: string[] = [];
  const log = async (message: string) => {
    console.log(message);
    recent.push(message);
    if (recent.length > 12) {
      recent.shift();
    }
    await appendWeiboPublishLog(logPath, `${label} ${message}`);
  };
  const suffix = () => {
    const parts = [
      logPath ? `日志文件: ${logPath}` : '',
      recent.length ? `最后状态: ${recent.slice(-4).join(' || ')}` : '',
    ].filter(Boolean);
    return parts.length ? `。${parts.join('；')}` : '';
  };

  return { log, suffix };
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

export async function fillWeiboDraft(browserInfo: AdsPowerBrowserInfo, post: Post, options: RawPublishOptions = {}) {
  const page = await findWeiboPage(browserInfo.debugPort);
  const client = await RawCdpClient.connect(page.webSocketDebuggerUrl);
  const diagnostics = createRawPublishLogger(options.logPath, `post=${post.id} draft`);

  try {
    await diagnostics.log(`Connected to Weibo page for draft fill: ${page.title} ${page.url}`);
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    const draftResult = await fillComposeText(client, normalizeWeiboPostText(post.content));
    await diagnostics.log(draftResult.message);
    await diagnostics.log(`Media upload step started: ${post.mediaPaths.length} file(s)`);
    const uploadResult = await withTimeout(
      uploadMediaFiles(client, post.mediaPaths),
      20_000,
      `Media upload step timed out after 20 seconds for ${post.mediaPaths.length} file(s)`,
    );
    await diagnostics.log(`Media upload step finished: uploaded=${uploadResult.uploaded}`);
    if (uploadResult.uploaded > 0) {
      await diagnostics.log(`Queued ${uploadResult.uploaded} media file(s) for upload`);
    }
    if (uploadResult.uploaded === 0) {
      return {
        ...draftResult,
        sendButtonDisabled: draftResult.sendButtonDisabled ?? false,
        message: [
          draftResult.message,
          'text-only draft ready',
          diagnostics.suffix(),
        ].filter(Boolean).join('; '),
      };
    }
    const ready = await waitForSendReady(client, {
      hasMedia: uploadResult.uploaded > 0,
      mediaCount: uploadResult.uploaded,
      timeoutMs: 45_000,
      phase: 'draft',
      log: diagnostics.log,
    });

    return {
      ...draftResult,
      sendButtonDisabled: ready.sendButtonDisabled,
      message: [
        draftResult.message,
        uploadResult.uploaded > 0 ? `uploaded ${uploadResult.uploaded} media file(s)` : '',
        ready.ok ? 'send button is ready' : ready.message,
        diagnostics.suffix(),
      ].filter(Boolean).join('; '),
    };
  } finally {
    client.close();
  }
}

async function fillComposeText(client: RawCdpClient, content: string) {
  // 分段打字：将内容拆为多段模拟真人输入节奏
  const chunks = humanTypingChunks(content);

  // 第一步：一次性注入 helpers 并验证 textarea 存在
  const initResult = await client.send<{ result: { value: { ok: boolean } } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      // 挂载到 window 上供后续分段使用，避免重复注入
      window.__wbTextarea = findComposeTextarea();
      window.__wbValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      return { ok: Boolean(window.__wbTextarea) };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  if (!initResult.result.value.ok) {
    // textarea 未找到时走兜底——整体注入一次（兼容旧逻辑）
    return {
      ok: false,
      message: 'Weibo compose textarea was not found',
      url: '',
      title: '',
      sendButtonText: '',
      sendButtonDisabled: true,
    };
  }

  // 第二步：分段写入（轻量 evaluate，不重复注入 helpers）
  let accumulated = '';
  for (const chunk of chunks) {
    accumulated += chunk.text;
    const currentValue = accumulated;

    await client.send<{ result: { value: unknown } }>('Runtime.evaluate', {
      expression: `(() => {
        const textarea = window.__wbTextarea;
        const valueSetter = window.__wbValueSetter;
        if (!textarea) return { ok: false };
        textarea.focus();
        valueSetter?.call(textarea, ${JSON.stringify(currentValue)});
        textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${JSON.stringify(chunk.text)} }));
        return { ok: true };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    // 段间停顿，模拟打字节奏
    await new Promise((resolve) => setTimeout(resolve, chunk.delayMs));
  }

  // 最终触发 change 事件 + 读取按钮状态
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
      const textarea = findComposeTextarea();

      if (!textarea) {
        return { ok: false, message: 'Weibo compose textarea was not found', url: location.href, title: document.title };
      }

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

async function waitForSendReady(client: RawCdpClient, options: {
  hasMedia: boolean;
  mediaCount?: number;
  timeoutMs: number;
  phase?: 'draft' | 'publish';
  log?: (message: string) => Promise<void>;
}) {
  const started = Date.now();
  let consecutiveReadyPolls = 0;
  let lastLogAt = 0;
  let last = {
    ok: false,
    message: 'Send button is not ready yet',
    remainingText: '',
    sendButtonDisabled: true,
    hasUploadingText: false,
    mediaPreviewCount: 0,
    mediaLoadingCount: 0,
  };

  while (Date.now() - started < options.timeoutMs) {
    const status = await readSendStatus(client, options.mediaCount ?? 0);
    last = status;
    if (status.ok) {
      consecutiveReadyPolls += 1;
      if (isSendReadyStable({
        hasMedia: options.hasMedia,
        mediaCount: options.mediaCount,
        elapsedMs: Date.now() - started,
        consecutiveReadyPolls,
        phase: options.phase,
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
    if (options.log && Date.now() - lastLogAt >= 5000) {
      await options.log(
        `Waiting raw send ready: ${status.message} | ready=${consecutiveReadyPolls}, `
        + `remaining=${Boolean(status.remainingText)}, uploadText=${status.hasUploadingText}, disabled=${status.sendButtonDisabled}, `
        + `media=${status.mediaPreviewCount}/${options.mediaCount ?? 0}, mediaLoading=${status.mediaLoadingCount}`,
      );
      lastLogAt = Date.now();
    }
    await humanDelay(1200, 0.3);
  }

  return {
    ...last,
    ok: false,
    message: `Send button was still not stable after ${Math.round(options.timeoutMs / 1000)} seconds`,
  };
}

async function readSendStatus(client: RawCdpClient, expectedMediaCount = 0) {
  const result = await client.send<{ result: { value: {
    ok: boolean;
    message: string;
    remainingText: string;
    sendButtonDisabled: boolean;
    hasUploadingText: boolean;
    mediaPreviewCount: number;
    mediaLoadingCount: number;
  } } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const textarea = findComposeTextarea();
      const remainingText = (textarea?.value || '').trim();
      const sendButton = findSendButton();
      const pageText = document.body.innerText || '';
      const uploading = hasWeiboUploadingText(pageText);
      const sendStatus = getSendButtonStatusFromDom(toElementSnapshot(sendButton));
      const mediaState = readWeiboMediaState();
      const expectedMediaCount = ${JSON.stringify(expectedMediaCount)};
      const mediaReady = hasExpectedWeiboMediaReady({
        expectedMediaCount,
        mediaPreviewCount: mediaState.previewCount,
        mediaLoadingCount: mediaState.loadingCount,
        hasUploadingText: uploading,
      });

      return {
        ok: Boolean(remainingText) && sendStatus.found && !sendStatus.disabled && mediaReady,
        message: sendButton
          ? (sendStatus.disabled ? 'Send button is disabled' : 'Send button is enabled')
          : 'Send button was not found',
        remainingText,
        sendButtonDisabled: sendStatus.disabled,
        hasUploadingText: uploading,
        mediaPreviewCount: mediaState.previewCount,
        mediaLoadingCount: mediaState.loadingCount,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result.value;
}

export async function publishWeiboDraft(browserInfo: AdsPowerBrowserInfo, options: RawPublishOptions = {}) {
  const page = await findWeiboPage(browserInfo.debugPort);
  const client = await RawCdpClient.connect(page.webSocketDebuggerUrl);
  const diagnostics = createRawPublishLogger(options.logPath, 'raw-publish');

  try {
    await diagnostics.log(`Connected to Weibo page for publish: ${page.title} ${page.url}`);
    await client.send('Runtime.enable');

    const ready = await waitForSendReady(client, {
      hasMedia: Boolean(options.hasMedia),
      mediaCount: options.mediaCount ?? (options.hasMedia ? 1 : 0),
      timeoutMs: options.hasMedia ? 10 * 60_000 : 60_000,
      phase: 'publish',
      log: diagnostics.log,
    });
    if (!ready.ok) {
      return { ok: false, message: `${ready.message}${diagnostics.suffix()}`, url: page.url, title: page.title };
    }

    return await clickSendUntilPublished(client, {
      hasMedia: Boolean(options.hasMedia),
      mediaCount: options.mediaCount ?? (options.hasMedia ? 1 : 0),
      timeoutMs: options.hasMedia ? 10 * 60_000 : 90_000,
      log: diagnostics.log,
      suffix: diagnostics.suffix,
      page,
    });
  } finally {
    client.close();
  }
}

async function clickSendUntilPublished(client: RawCdpClient, options: {
  hasMedia: boolean;
  mediaCount: number;
  timeoutMs: number;
  log: (message: string) => Promise<void>;
  suffix: () => string;
  page: DebugTarget;
}) {
  const started = Date.now();
  let clickCount = 0;
  // 连续失败次数，用于指数退避
  let consecutiveFailCount = 0;

  while (Date.now() - started < options.timeoutMs) {
    const ready = await readSendStatus(client, options.mediaCount);
    if (!ready.ok) {
      await options.log(`Send not ready before click retry: ${ready.message}; uploadText=${ready.hasUploadingText}, disabled=${ready.sendButtonDisabled}`);
      await humanDelay(2500, 0.3);
      continue;
    }

    const button = await locateSendButton(client);
    if (!button.ok || button.x === undefined || button.y === undefined) {
      await options.log(`Send button cannot be clicked: ${button.message}`);
      await humanDelay(2500, 0.3);
      continue;
    }

    clickCount += 1;

    // 拟人化点击前停顿：模拟"看一眼按钮再点"
    await humanPreClickPause();

    // 坐标区域内随机偏移，避免每次精确命中同一像素
    const jittered = humanJitterCoord(button.x, button.y, button.width, button.height);
    await options.log(`Dispatching raw send click attempt ${clickCount} at ${jittered.x},${jittered.y} (base ${button.x},${button.y})`);
    await dispatchRawClick(client, jittered.x, jittered.y);

    // 退避等待：基准 2.5s + 连续失败递增，高斯随机化
    const postClickBaseMs = 2500 + consecutiveFailCount * 800;
    await humanDelay(Math.min(postClickBaseMs, 5500), 0.25);

    const verify = await verifySendClick(client);
    await options.log(`Verify after click ${clickCount}: ${verify.message}; remaining=${Boolean(verify.remainingText)}, disabled=${verify.sendButtonDisabled}`);
    if (verify.ok) {
      consecutiveFailCount = 0;
      return {
        ok: true,
        message: `${verify.message}${options.suffix()}`,
        url: button.url,
        title: button.title,
      };
    }

    const retryDecision = getWeiboRawRetryDecision({
      remainingText: verify.remainingText,
      sendButtonDisabled: verify.sendButtonDisabled,
      hasUploadingText: verify.hasUploadingText,
    });
    if (retryDecision === 'stop') {
      consecutiveFailCount = 0;
      return {
        ok: true,
        message: `${verify.message}${options.suffix()}`,
        url: button.url,
        title: button.title,
      };
    }
    if (retryDecision === 'full-wait') {
      consecutiveFailCount = 0;
      const cooldownMs = getWeiboUploadBlockCooldownMs(options.mediaCount);
      await options.log(`Upload blocking text appeared after click; cooling down ${cooldownMs}ms before full send-ready wait`);
      await humanDelay(cooldownMs, 0.2);
      await waitForSendReady(client, {
        hasMedia: options.hasMedia,
        mediaCount: options.mediaCount,
        timeoutMs: options.hasMedia ? 10 * 60_000 : 60_000,
        phase: 'publish',
        log: options.log,
      });
    } else {
      // quick-retry：累计连续失败，触发退避
      consecutiveFailCount += 1;
    }
  }

  return {
    ok: false,
    message: `Send click did not complete after ${clickCount} attempt(s)${options.suffix()}`,
    url: options.page.url,
    title: options.page.title,
  };
}

async function dispatchRawClick(client: RawCdpClient, x: number, y: number) {
  // 拟人鼠标轨迹：从随机起始点经贝塞尔曲线滑向目标
  const origin = randomMouseOrigin(x, y);
  const path = generateMousePath(origin.x, origin.y, x, y);

  for (const point of path) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
      button: 'none',
    });
    await new Promise((resolve) => setTimeout(resolve, point.delayMs));
  }

  // 按下鼠标
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });

  // 拟人按压时长：60~130ms（真人按下到松开不是瞬时的）
  const pressDuration = humanClickPressDuration();
  await new Promise((resolve) => setTimeout(resolve, pressDuration));

  // 松开鼠标
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
  });
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
        width: Math.round(rect.width),
        height: Math.round(rect.height),
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
    hasUploadingText: boolean;
  } } }>('Runtime.evaluate', {
    expression: `(() => {
      ${weiboDomRuntimeHelpers()}
      const textarea = findComposeTextarea();
      const remainingText = (textarea?.value || '').trim();
      const sendButton = findSendButton();
      const pageText = document.body.innerText || '';
      const sendButtonDisabled = getSendButtonStatusFromDom(toElementSnapshot(sendButton)).disabled;
      const hasUploadingText = hasWeiboUploadingText(pageText);

      return {
        ok: (!remainingText || sendButtonDisabled) && !hasUploadingText,
        message: (!remainingText || sendButtonDisabled) && !hasUploadingText
          ? 'Send button clicked and compose box cleared or disabled'
          : hasUploadingText
            ? 'Send click was blocked because media is still uploading'
            : 'Send click did not clear compose box',
        remainingText,
        sendButtonDisabled,
        hasUploadingText,
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
    const hasExpectedWeiboMediaReady = ${hasExpectedWeiboMediaReady.toString()};
    const isWeiboUploadInputElement = ${isWeiboUploadInputElement.toString()};
    const toElementSnapshot = (el) => el ? ({
      accept: el.getAttribute?.('accept') || '',
      ariaDisabled: el.getAttribute?.('aria-disabled'),
      ariaLabel: el.getAttribute?.('aria-label'),
      className: typeof el.className === 'string' ? el.className : '',
      disabled: Boolean(el.disabled),
      hidden: Boolean(el.hidden || el.offsetParent === null),
      name: el.getAttribute?.('name') || '',
      role: el.getAttribute?.('role') || '',
      title: el.getAttribute?.('title') || '',
      dataset: el.dataset ? Object.fromEntries(Object.entries(el.dataset)) : {},
      text: el.innerText || el.textContent || '',
    }) : null;
    const findComposeTextarea = () => [...document.querySelectorAll('textarea')]
      .find((el) => isWeiboComposePlaceholder(el.getAttribute('placeholder')))
      ?? document.querySelector('textarea');
    const findSendButton = () => [...document.querySelectorAll('button, [role="button"], span, div, a')]
      .find((el) => {
        const snapshot = toElementSnapshot(el);
        return isVisibleElement(el)
          && !isDisabledElement(snapshot)
          && isWeiboSendButtonElement(snapshot);
      });
    const isVisibleElement = (el) => {
      const rect = el.getBoundingClientRect?.();
      const style = window.getComputedStyle(el);
      return Boolean(rect && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden');
    };
    const readWeiboMediaState = () => {
      const loadingSelectors = '.woo-icon-loading, .woo-spinner, .Pic_loading_13r6n, [class*="loading"], [class*="Loading"]';
      const loadingCount = [...document.querySelectorAll(loadingSelectors)].filter(isVisibleElement).length;
      const previewSelectors = [
        '.woo-picture-img',
        '.woo-picture-main',
        '.woo-picture-slot',
        '[class*="picture"]',
        '[class*="Picture"]',
        '[class*="media"]',
        '[class*="Media"]',
        'img[src^="blob:"]',
        'img[src*="sinaimg.cn"]',
        'img[src*="weibocdn.com"]',
      ].join(',');
      const previews = [...document.querySelectorAll(previewSelectors)]
        .filter((el) => {
          if (!isVisibleElement(el)) return false;
          const text = (el.innerText || el.textContent || '').trim();
          const style = window.getComputedStyle(el);
          const backgroundImage = style.backgroundImage || '';
          const src = el.getAttribute?.('src') || '';
          const className = typeof el.className === 'string' ? el.className : '';
          return src.startsWith('blob:')
            || src.includes('sinaimg.cn')
            || src.includes('weibocdn.com')
            || backgroundImage.includes('blob:')
            || backgroundImage.includes('sinaimg.cn')
            || backgroundImage.includes('weibocdn.com')
            || /picture|media|Picture|Media/.test(className)
            || /删除|编辑|焦点/.test(text);
        });
      const uniquePreviewKeys = new Set(previews.map((el) => {
        const rect = el.getBoundingClientRect();
        return [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)].join(':');
      }));
      return { previewCount: uniquePreviewKeys.size, loadingCount };
    };
  `;
}
