import type { Browser } from 'playwright';
import type { Post } from '../../shared/types.js';

export interface PublishResult {
  status: 'published' | 'failed' | 'needs_manual_action';
  message: string;
  screenshotPath?: string;
}

export class WeiboPublisher {
  async publish(browser: Browser, post: Post): Promise<PublishResult> {
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = context.pages()[0] ?? await context.newPage();

    await page.goto('https://weibo.com/', { waitUntil: 'domcontentloaded' });

    if (/login|passport/i.test(page.url())) {
      return { status: 'needs_manual_action', message: 'Weibo login page detected' };
    }

    if (!post.content.trim()) {
      return { status: 'failed', message: 'Post content is empty' };
    }

    return {
      status: 'failed',
      message: 'Weibo compose selectors are not configured yet; run dry automation only',
    };
  }
}
