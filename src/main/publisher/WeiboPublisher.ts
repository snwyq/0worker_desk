import type { Browser } from 'playwright';
import type { Post } from '../../shared/types.js';
import { normalizeWeiboPostText } from './WeiboContent.js';
import { appendWeiboPublishLog } from './WeiboDiagnostics.js';
import { getSendButtonStatusFromDom, getWeiboManualPublishDecision, hasWeiboUploadingText } from './WeiboDom.js';

export interface PublishResult {
  status: 'published' | 'failed' | 'needs_manual_action';
  message: string;
  screenshotPath?: string;
}

export interface WeiboPublisherOptions {
  logPath?: string;
}

export class WeiboPublisher {
  constructor(private readonly options: WeiboPublisherOptions = {}) {}

  async publish(browser: Browser, post: Post): Promise<PublishResult> {
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = context.pages()[0] ?? await context.newPage();
    const recentDiagnostics: string[] = [];
    const log = async (message: string) => {
      console.log(message);
      recentDiagnostics.push(message);
      if (recentDiagnostics.length > 12) {
        recentDiagnostics.shift();
      }
      await appendWeiboPublishLog(this.options.logPath, `post=${post.id} ${message}`);
    };
    const diagnosticsSuffix = () => {
      const suffix = [
        this.options.logPath ? `日志文件: ${this.options.logPath}` : '',
        recentDiagnostics.length ? `最后状态: ${recentDiagnostics.slice(-4).join(' || ')}` : '',
      ].filter(Boolean).join('；');
      return suffix ? `。${suffix}` : '';
    };

    try {
      await log('Navigating to Weibo home...');
      await page.goto('https://weibo.com/', { waitUntil: 'networkidle', timeout: 45000 });

      if (page.url().includes('login') || page.url().includes('passport')) {
        return { status: 'needs_manual_action', message: `Weibo requires login.${diagnosticsSuffix()}` };
      }

      // 1. 定位并填充内容
      const editorSelector = 'div[contenteditable="true"].Form_input_3fsPU, textarea.Form_input_3fsPU, [title="微博发布框"]';
      await page.waitForSelector(editorSelector, { timeout: 15000 });
      const plainText = normalizeWeiboPostText(post.content);
      
      await log('Filling text content...');
      await page.focus(editorSelector);
      await page.fill(editorSelector, plainText);
      await page.waitForTimeout(1000);

      // 2. 注入图片
      if (post.mediaPaths && post.mediaPaths.length > 0) {
        await log(`Injecting ${post.mediaPaths.length} images...`);
        const fileInputSelector = 'input[type="file"][accept*="image"]';
        await page.setInputFiles(fileInputSelector, post.mediaPaths);
        await page.waitForTimeout(3000); 
      }

      // 3. 终极“不死”轮询防线
      const startTime = Date.now();
      const hasMedia = Boolean(post.mediaPaths?.length);
      const timeout = hasMedia ? 10 * 60_000 : 120_000;
      let isSuccess = false;
      let clickCount = 0;
      let consecutiveReadyPolls = 0;
      let lastWaitLogAt = 0;

      const publishBtnLocator = page
        .locator('button, [role="button"], .Tool_btn_3E83X')
        .filter({ hasText: /^(发布|发送)$/ })
        .first();

      await log('Entering unbreakable watch loop...');

      while (Date.now() - startTime < timeout) {
        try { 
          const state = await page.evaluate((sel) => {
             const editor = document.querySelector(sel);
             const currentText = editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement
                ? editor.value.trim()
                : editor?.textContent?.trim() || '';
             
             // 仅确认 UI 已响应：占位框是否已经出现
             const closeIcons = document.querySelectorAll('.woo-icon-close, [title="删除"], [title="删除图片"], .woo-picture-close');
             const hasAnyBoxes = Array.from(closeIcons).some(el => el.clientWidth > 0);

             // 拦截图2：寻找转圈动画图标。警告：绝不能使用全局 svg circle，会误伤发帖按钮里的 svg，导致死锁！
             // 取消粗暴的 tag 判定，仅检测明确的 loading class
             const loadingIcons = document.querySelectorAll('.woo-icon-loading, .woo-spinner, .Pic_loading_13r6n');
             const hasLoading = Array.from(loadingIcons).some(el => {
                const style = window.getComputedStyle(el);
                return el.clientWidth > 0 && style.display !== 'none' && style.visibility !== 'hidden';
             });

             const pageText = document.body.innerText;
             // 有些图片上传完后并没有“焦点”两字，所以仅做加分项，不再做死锁条件
             const hasSuccessMask = pageText.includes('焦点') || pageText.includes('编辑');
             
             // 更加真实的图3标志：是否有真正的 img 标签被渲染在 .Form_media_ 区域
             // 扩大宽容度：微博新版云端图可能是各种域，或者只是 background 容器
             const imgElements = document.querySelectorAll('.woo-picture-img, img[src^="blob:"], img[src*="sinaimg.cn"], img[src*="weibocdn.com"], .woo-picture-main, .woo-picture-slot');
             const hasRealImages = Array.from(imgElements).some(el => {
                const style = window.getComputedStyle(el);
                return el.clientWidth > 0 && el.clientHeight > 0 && style.display !== 'none' && style.visibility !== 'hidden';
             });

             const sendButton = Array.from(document.querySelectorAll('button, [role="button"]')).find((el) => {
                const text = (el.textContent || '').replace(/\s+/g, '').trim();
                return text === '发布' || text === '发送';
             });
             
             const sendButtonBox = sendButton?.getBoundingClientRect();

             return {
                currentText,
                hasAnyBoxes,
                hasLoading,
                hasSuccessMask,
                hasRealImages,
                pageText,
                sendButton: sendButton ? {
                   text: sendButton.textContent || '',
                   disabled: Boolean((sendButton as HTMLButtonElement).disabled),
                   ariaDisabled: sendButton.getAttribute('aria-disabled'),
                   className: typeof sendButton.className === 'string' ? sendButton.className : '',
                   box: sendButtonBox && sendButtonBox.width > 0 && sendButtonBox.height > 0 ? {
                      x: sendButtonBox.x,
                      y: sendButtonBox.y,
                      width: sendButtonBox.width,
                      height: sendButtonBox.height,
                   } : null,
                } : null,
             };
          }, editorSelector);

          const sendStatus = getSendButtonStatusFromDom(state.sendButton);
          const hasUploadBlockingText = hasWeiboUploadingText(state.pageText);
          const readyNow = sendStatus.found
             && !sendStatus.disabled
             && !state.hasLoading
             && !hasUploadBlockingText
             && (!hasMedia || state.hasAnyBoxes);
          consecutiveReadyPolls = readyNow ? consecutiveReadyPolls + 1 : 0;
          const elapsedMs = Date.now() - startTime;
          const mediaFallbackReady = hasMedia
             && state.hasAnyBoxes
             && !state.hasLoading
             && !hasUploadBlockingText
             && elapsedMs >= 30_000
             && consecutiveReadyPolls >= 5;

          const decision = getWeiboManualPublishDecision({
             hasMedia,
             clickCount,
             currentText: state.currentText,
             hasAnyBoxes: state.hasAnyBoxes,
             hasLoading: state.hasLoading,
             hasRenderableMedia: state.hasSuccessMask || state.hasRealImages,
             mediaFallbackReady,
             hasUploadBlockingText,
             sendButtonFound: sendStatus.found,
             sendButtonDisabled: sendStatus.disabled,
             consecutiveReadyPolls,
             elapsedMs,
          });

          if (decision.action === 'success') {
             await log(`Target confirmed: ${decision.reason}. Publish Success!`);
             isSuccess = true;
             break;
          }

          if (decision.action === 'wait') {
             if (Date.now() - lastWaitLogAt >= 5000) {
                await log(
                   `Waiting: ${decision.reason} | ready=${consecutiveReadyPolls}, boxes=${state.hasAnyBoxes}, `
                   + `preview=${state.hasSuccessMask || state.hasRealImages}, fallback=${mediaFallbackReady}, `
                   + `loading=${state.hasLoading}, uploadText=${hasUploadBlockingText}, send=${sendStatus.found && !sendStatus.disabled}`,
                );
                lastWaitLogAt = Date.now();
             }
             await page.waitForTimeout(3000);
             continue;
          }

          if (decision.action === 'click') {
             const visibleButton = await publishBtnLocator.isVisible();
             if (!visibleButton && !state.sendButton?.box) {
                await log('Waiting: Send button was ready in DOM but no clickable target was visible');
                consecutiveReadyPolls = 0;
                await page.waitForTimeout(3000);
                continue;
             }

             await log(`All ultimate conditions met! Triggering physical click (Attempt ${clickCount + 1})...`);
             if (visibleButton) {
                await publishBtnLocator.click({ force: true, delay: 100 });
             } else if (state.sendButton?.box) {
                await page.mouse.click(
                   state.sendButton.box.x + state.sendButton.box.width / 2,
                   state.sendButton.box.y + state.sendButton.box.height / 2,
                   { delay: 100 },
                );
             }
             clickCount++;
             consecutiveReadyPolls = 0;
             await page.waitForTimeout(4000); // 点完让子弹飞一会儿
          }

        } catch (innerError) {
           await log(`[Resilient Loop] Ignored non-fatal evaluation error: ${innerError}`);
           await page.waitForTimeout(1000);
        }
      }

      if (isSuccess) {
        await page.waitForTimeout(2000); 
        return { status: 'published', message: `发布确认成功，微博发帖框已重置${diagnosticsSuffix()}` };
      } else {
        return { 
          status: 'failed', 
          message: `发布超时：长时间守候未能完成发帖。共尝试有效点击 ${clickCount} 次${diagnosticsSuffix()}` 
        };
      }

    } catch (error) {
      console.error('Automation error:', error);
      await appendWeiboPublishLog(this.options.logPath, `post=${post.id} Automation error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      return { status: 'failed', message: `自动化执行致命异常: ${error instanceof Error ? error.message : String(error)}${diagnosticsSuffix()}` };
    }
  }
}
