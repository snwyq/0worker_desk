import electron from 'electron';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/main/db/database.js';
import { registerIpcHandlers, startHttpApi } from '../src/main/ipc/handlers.js';
import { PublishScheduler } from '../src/main/publisher/Scheduler.js';

const { app, BrowserWindow } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });
async function createWindow() {
  const databasePath = path.join(app.getPath('userData'), 'weibo-publisher.sqlite');
  const repositories = await createDatabase(databasePath);
  const scheduler = new PublishScheduler(repositories);
  registerIpcHandlers(repositories, scheduler);
  startHttpApi(repositories, scheduler);

  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
