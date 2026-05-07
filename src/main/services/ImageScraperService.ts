import { chromium } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { app } from 'electron';

const DOMAIN_BLACKLIST = [
  'vcg.com', 'shutterstock', 'gettyimages', 'istockphoto', '500px',
  'nipic', 'quanjing', 'huitu', 'veer', 'tuchong', 'zcool', 'photocome'
];

export class ImageScraperService {
  private async getPlaywrightExecutablePath() {
    // Determine the path to Edge or Chrome
    const paths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error('No suitable browser found for Playwright.');
  }

  public async scrapeImages(keyword: string, limit = 2, mediaDir?: string): Promise<string[]> {
    const executablePath = await this.getPlaywrightExecutablePath();
    const browser = await chromium.launch({ executablePath, headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results: string[] = [];
    const targetDir = mediaDir || process.env.HOT_BAZI_MEDIA_DIR || path.join(process.cwd(), 'media_assets', 'hot_bazi');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    try {
      // Bing Image Search with filters for aspect ratio and size (e.g. portrait/large)
      const encodedKeyword = encodeURIComponent(`${keyword} 高清 个人照`);
      await page.goto(`https://cn.bing.com/images/search?q=${encodedKeyword}&form=HDRSC2&first=1`, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Wait for images to load
      await page.waitForSelector('.mimg', { timeout: 10000 }).catch(() => {});

      // Extract image data
      const imageElements = await page.$$('.mimg');
      let savedCount = 0;

      for (let i = 0; i < imageElements.length && savedCount < limit; i++) {
        const src = await imageElements[i].getAttribute('src') || await imageElements[i].getAttribute('data-src');
        if (!src || src.startsWith('data:')) continue; // Skip very low res embedded base64 thumbnails initially

        // For Bing, the actual high-res image is often inside an 'm' attribute on the parent 'a' tag
        const parentA = await imageElements[i].evaluateHandle((el) => el.closest('a.iusc'));
        let highResUrl = src;
        if (parentA) {
          const mAttr = await parentA.evaluate((el: any) => el.getAttribute('m'));
          if (mAttr) {
            try {
              const mData = JSON.parse(mAttr);
              if (mData.murl) {
                highResUrl = mData.murl;
              }
            } catch (e) {}
          }
        }

        // Domain blacklist check
        if (DOMAIN_BLACKLIST.some(domain => highResUrl.toLowerCase().includes(domain))) {
          continue;
        }

        try {
          const response = await fetch(highResUrl);
          if (!response.ok) continue;

          const buffer = Buffer.from(await response.arrayBuffer());
          
          // Heuristic validation: file size must be > 30KB
          if (buffer.length < 30 * 1024) continue;

          // Save to disk
          const hash = crypto.createHash('md5').update(highResUrl).digest('hex').substring(0, 8);
          const ext = highResUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
          const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
          const fileName = `${keyword}_${hash}.${validExt}`;
          const filePath = path.join(targetDir, fileName);

          fs.writeFileSync(filePath, buffer);
          results.push(filePath);
          savedCount++;
        } catch (e) {
          // Ignore download errors
        }
      }
    } catch (error) {
      console.error('Image scrape failed:', error);
    } finally {
      await browser.close();
    }

    return results;
  }
}

export const imageScraperService = new ImageScraperService();
