import type { Browser } from 'playwright';
import type { Account } from '../../shared/types.js';

export interface BrowserSession {
  browser: Browser;
  account: Account;
}

export interface BrowserConnector {
  kind: Account['browserMode'];
  connect(account: Account): Promise<BrowserSession>;
}
