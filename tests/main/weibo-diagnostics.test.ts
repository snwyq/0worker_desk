import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatWeiboPublishLogLine, getWeiboPublisherLogPath } from '../../src/main/publisher/WeiboDiagnostics.js';

describe('Weibo publish diagnostics', () => {
  it('places the desktop log under the Electron user data directory', () => {
    expect(getWeiboPublisherLogPath(path.join('C:', 'Users', 'demo', 'AppData', 'Roaming', '0Worker Desk')))
      .toBe(path.join('C:', 'Users', 'demo', 'AppData', 'Roaming', '0Worker Desk', 'weibo-publisher.log'));
  });

  it('formats log lines with timestamps', () => {
    expect(formatWeiboPublishLogLine('Waiting for send button', new Date('2026-05-03T05:30:00.000Z')))
      .toBe('[2026-05-03T05:30:00.000Z] Waiting for send button\n');
  });
});
