import { chromium } from 'playwright';
import type { Account } from '../../shared/types.js';
import type { BrowserConnector, BrowserSession } from './BrowserConnector.js';

interface VersionResponse {
  webSocketDebuggerUrl?: string;
}

export class ManualPortConnector implements BrowserConnector {
  kind = 'manual_port' as const;

  async connect(account: Account): Promise<BrowserSession> {
    if (!account.debuggingPort) {
      throw new Error('Missing debugging port');
    }

    const response = await fetch(`http://127.0.0.1:${account.debuggingPort}/json/version`);
    if (!response.ok) {
      throw new Error(`Unable to read debugging endpoint from port ${account.debuggingPort}`);
    }

    const body = (await response.json()) as VersionResponse;
    if (!body.webSocketDebuggerUrl) {
      throw new Error('Debugging endpoint did not include webSocketDebuggerUrl');
    }

    const browser = await chromium.connectOverCDP(body.webSocketDebuggerUrl);
    return { browser, account };
  }
}
