import { describe, expect, test } from 'vitest';
import { createConnectorForAccount } from '../../src/main/browser/BrowserConnectorFactory.js';
import type { Account } from '../../src/shared/types.js';

function account(overrides: Partial<Account>): Account {
  return {
    id: 1,
    name: 'demo',
    platform: 'weibo',
    browserMode: 'manual_ws',
    providerProfileId: '',
    wsEndpoint: '',
    debuggingPort: null,
    status: 'active',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('browser connector factory', () => {
  test('selects manual websocket connector', () => {
    const connector = createConnectorForAccount(account({
      browserMode: 'manual_ws',
      wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/demo',
    }));

    expect(connector.kind).toBe('manual_ws');
  });

  test('selects manual port connector', () => {
    const connector = createConnectorForAccount(account({
      browserMode: 'manual_port',
      debuggingPort: 9222,
    }));

    expect(connector.kind).toBe('manual_port');
  });

  test('selects AdsPower connector', () => {
    const connector = createConnectorForAccount(account({
      browserMode: 'adspower',
      providerProfileId: 'k1c2uj68',
    }));

    expect(connector.kind).toBe('adspower');
  });

  test('rejects unsupported vendor modes until providers are implemented', () => {
    expect(() => createConnectorForAccount(account({ browserMode: 'bitbrowser' }))).toThrow('not implemented');
  });
});
