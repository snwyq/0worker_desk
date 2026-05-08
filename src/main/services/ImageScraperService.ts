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
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    const results: string[] = [];
    const targetDir = mediaDir || process.env.HOT_BAZI_MEDIA_DIR || path.join(process.cwd(), 'media_assets', 'hot_bazi');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    try {
      // Helper function to scrape high-res ObjUrls from Baidu
      const scrapeBaiduObjUrls = async (searchQuery: string) => {
        console.log(`[ImageScraper] Searching Baidu for: ${searchQuery}`);
        const encoded = encodeURIComponent(searchQuery);
        await page.goto(`https://image.baidu.com/search/index?tn=baiduimage&word=${encoded}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        await page.waitForTimeout(2000);

        return await page.evaluate(() => {
          const html = document.documentElement.innerHTML;
          const urls = [];
          const regex = /"ObjUrl":"(.*?)"/gi;
          let match;
          while ((match = regex.exec(html)) !== null) {
            urls.push(match[1]);
          }
          return urls;
        });
      };

      // 1. Primary Attempt: Try to find high-res images for the specific event
      let highResUrls = await scrapeBaiduObjUrls(`${keyword} 高清`);

      // 2. Fallback: If no event images, get ultra-high-res official portraits of the person
      if (highResUrls.length === 0) {
        const personName = keyword.split(' ')[0];
        if (personName && personName !== keyword) {
          console.log(`[ImageScraper] Event search returned 0 URLs. Falling back to portrait: ${personName}`);
          highResUrls = await scrapeBaiduObjUrls(`${personName} 高清 写真`);
        }
      }

      // Deduplicate
      highResUrls = Array.from(new Set(highResUrls));
      console.log(`[ImageScraper] Extracted ${highResUrls.length} original high-res candidate URLs.`);

      let savedCount = 0;

      for (let i = 0; i < highResUrls.length && savedCount < limit; i++) {
        const highResUrl = highResUrls[i];

        // Domain blacklist check (skip stock photo sites with watermarks)
        if (DOMAIN_BLACKLIST.some(domain => highResUrl.toLowerCase().includes(domain))) {
          continue;
        }

        try {
          console.log(`[ImageScraper] Fetching original URL: ${highResUrl}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(highResUrl, { 
            signal: controller.signal,
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://image.baidu.com/' 
            }
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            continue;
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          
          // STRICT HIGH-RES VALIDATION: Must be > 40KB. 
          // Original photos are usually 100KB - 5MB. This completely filters out blurry thumbnails.
          if (buffer.length < 40 * 1024) {
             console.log(`[ImageScraper] Skipped: Low resolution (${buffer.length} bytes)`);
             continue;
          }

          console.log(`[ImageScraper] Downloaded high-res image: ${buffer.length} bytes`);

          // Save to disk
          const hash = crypto.createHash('md5').update(highResUrl).digest('hex').substring(0, 8);
          const ext = 'jpg'; 
          const safeKeyword = keyword.replace(/[\/\?<>\\:\*\|":#%\s]/g, '_').trim();
          const fileName = `${safeKeyword}_${hash}.${ext}`;
          const filePath = path.join(targetDir, fileName);

          fs.writeFileSync(filePath, buffer);
          results.push(filePath);
          savedCount++;
          console.log(`[ImageScraper] Successfully saved: ${filePath}`);
        } catch (e) {
          // Silent catch for individual fetch failures (timeout, 403, etc.), just move to next candidate
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
