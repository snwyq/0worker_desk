import type { Account } from '../../shared/types.js';
import type { BrowserConnector } from './BrowserConnector.js';
import { AdsPowerConnector } from './AdsPowerConnector.js';
import { ManualPortConnector } from './ManualPortConnector.js';
import { ManualWsConnector } from './ManualWsConnector.js';

export function createConnectorForAccount(account: Account): BrowserConnector {
  if (account.browserMode === 'manual_ws') {
    return new ManualWsConnector();
  }

  if (account.browserMode === 'manual_port') {
    return new ManualPortConnector();
  }

  if (account.browserMode === 'adspower') {
    return new AdsPowerConnector();
  }

  throw new Error(`Browser provider ${account.browserMode} is not implemented`);
}
