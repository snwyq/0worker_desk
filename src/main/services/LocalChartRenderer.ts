import { BrowserWindow, ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';

export class LocalChartRenderer {
  public async renderBaziCharts(person: any, generatedContent: any, mediaDir?: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      // 1. Create a hidden window for offscreen rendering
      const win = new BrowserWindow({
        show: false,
        width: 1080,
        height: 1920,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          webSecurity: false
        }
      });

      const targetDir = mediaDir || process.env.HOT_BAZI_MEDIA_DIR || path.join(process.cwd(), 'media_assets', 'hot_bazi');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Log console messages from the renderer
      win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levels = ['debug', 'info', 'warning', 'error'];
        console.log(`[Renderer ${levels[level] || 'log'}] ${message} (${sourceId}:${line})`);
      });

      const generatedImages: string[] = [];
      const hash = crypto.createHash('md5').update(person.name + Date.now().toString()).digest('hex').substring(0, 8);

      // Timeout safety for the whole operation
      const failTimeout = setTimeout(() => {
        if (!win.isDestroyed()) win.close();
        reject(new Error('Render timeout'));
      }, 60000);

      // Navigate to the React export route
      const loadUrl = process.env.VITE_DEV_SERVER_URL 
        ? `${process.env.VITE_DEV_SERVER_URL}#/export/bazi-chart` 
        : `file://${path.join(__dirname, '../renderer/index.html')}#/export/bazi-chart`;

      win.loadURL(loadUrl);

      win.webContents.on('did-finish-load', async () => {
        const payload = { person, generatedContent };
        
        await win.webContents.executeJavaScript(`
          (function() {
            const payload = ${JSON.stringify(payload)};
            window.__BAZI_RENDER_DATA_RAW__ = payload;
            window.postMessage({
               type: 'RENDER_BAZI_CHART',
               payload: payload
            }, '*');
          })();
        `);

        // 轮询检测页面是否准备就绪
        const checkReady = setInterval(async () => {
          try {
            const isReady = await win.webContents.executeJavaScript('window.__RENDER_READY__');
            if (isReady) {
              clearInterval(checkReady);
              await performCapture();
            }
          } catch (e) {
            // Ignore potential early execution errors
          }
        }, 200);

        const performCapture = async () => {
          try {
            const results: string[] = [];
            // 调整图片生成顺序：AI长文(4)作为首图最能吸引网民，将最硬核生涩的排盘(1)放到最后。
            // 顺序：长文 -> 大运 -> 流年 -> 排盘
            const parts = ['bazi-part-4', 'bazi-part-2', 'bazi-part-3'];

            for (const partId of parts) {
              // 1. 先把所有部分隐藏，只显示当前要截的部分
              await win.webContents.executeJavaScript(`
                (function() {
                  ['bazi-part-2', 'bazi-part-3', 'bazi-part-4'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = (id === '${partId}') ? 'flex' : 'none';
                  });
                  window.scrollTo(0, 0);
                })();
              `);

              // 稍微给一点点时间让布局稳定
              await new Promise(r => setTimeout(r, 100));

              // 2. 获取该部分的真实位置和尺寸
              const rect = await win.webContents.executeJavaScript(`
                (function() {
                  const el = document.getElementById('${partId}');
                  if (!el) return null;
                  const r = el.getBoundingClientRect();
                  return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.floor(r.width), height: Math.floor(r.height) };
                })();
              `);

              if (rect && rect.width > 0 && rect.height > 0) {
                // Resize the window dynamically so that capturePage can capture the full height without clipping
                win.setSize(1080, rect.height + 20);
                await new Promise(r => setTimeout(r, 150)); // allow resize to apply
                const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1080, height: rect.height });
                const buffer = image.toPNG();
                const fileName = `bazi_${person.name}_${partId}_${Date.now()}.png`;
                const fullPath = path.join(targetDir, fileName);
                fs.writeFileSync(fullPath, buffer);
                results.push(fullPath);
              }
            }

            if (!win.isDestroyed()) win.close();
            clearTimeout(failTimeout);
            resolve(results);
          } catch (err) {
            if (!win.isDestroyed()) win.close();
            clearTimeout(failTimeout);
            reject(err);
          }
        };
      });
    });
  }
}

export const localChartRenderer = new LocalChartRenderer();
