import { chromium } from 'playwright';
import type { Account } from '../../shared/types.js';
import type { BrowserConnector, BrowserSession } from './BrowserConnector.js';

export class ManualWsConnector implements BrowserConnector {
  kind = 'manual_ws' as const;

  async connect(account: Account): Promise<BrowserSession> {
    if (!account.wsEndpoint.trim()) {
      throw new Error('Missing websocket endpoint');
    }

    const browser = await chromium.connectOverCDP(account.wsEndpoint);
    return { browser, account };
  }
}
