import { chromium } from 'playwright';
import type { Account } from '../../shared/types.js';
import { startAdsPowerBrowser } from './AdsPowerApi.js';
import type { BrowserConnector, BrowserSession } from './BrowserConnector.js';

export class AdsPowerConnector implements BrowserConnector {
  kind = 'adspower' as const;

  async connect(account: Account): Promise<BrowserSession> {
    const browserInfo = await startAdsPowerBrowser(account);
    const browser = await chromium.connectOverCDP(browserInfo.cdpEndpoint, { timeout: 10_000 });
    return { browser, account };
  }
}
