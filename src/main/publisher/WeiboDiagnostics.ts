import fs from 'node:fs/promises';
import path from 'node:path';

export function getWeiboPublisherLogPath(userDataPath: string) {
  return path.join(userDataPath, 'weibo-publisher.log');
}

export function formatWeiboPublishLogLine(message: string, date = new Date()) {
  return `[${date.toISOString()}] ${message}\n`;
}

export async function appendWeiboPublishLog(logPath: string | undefined, message: string) {
  if (!logPath) {
    return;
  }

  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, formatWeiboPublishLogLine(message), 'utf8');
}
