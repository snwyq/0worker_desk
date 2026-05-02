import type { Account } from '../../shared/types.js';
import type { AppDatabase } from '../db/database.js';

export interface AdsPowerBrowserInfo {
  cdpEndpoint: string;
  debugPort: number;
}

interface AdsPowerStartResponse {
  code: number;
  msg?: string;
  data?: {
    ws?: {
      puppeteer?: string;
      selenium?: string;
    };
    debug_port?: string;
  };
}

export async function startAdsPowerBrowser(account: Account, repositories?: AppDatabase): Promise<AdsPowerBrowserInfo> {
  const apiKey = repositories?.settings.get('adspower.apiKey') || process.env.ADSPOWER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ADSPOWER_API_KEY environment variable');
  }

  if (!account.providerProfileId.trim()) {
    throw new Error('Missing AdsPower user_id');
  }

  const url = new URL('http://127.0.0.1:50325/api/v1/browser/start');
  url.searchParams.set('user_id', account.providerProfileId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`AdsPower start request failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as AdsPowerStartResponse;
  if (body.code !== 0) {
    throw new Error(`AdsPower start failed: ${body.msg ?? body.code}`);
  }

  const cdpEndpoint = body.data?.ws?.puppeteer;
  const debugPort = Number(body.data?.debug_port);
  if (!cdpEndpoint || !debugPort) {
    throw new Error('AdsPower response did not include cdp endpoint or debug port');
  }

  return { cdpEndpoint, debugPort };
}
