import { chromium } from 'playwright';

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node scripts/probe-adspower-cdp.mjs <endpoint>');
  process.exit(1);
}

const started = Date.now();
try {
  const browser = await chromium.connectOverCDP(endpoint, { timeout: 10_000 });
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()[0];
  console.log(JSON.stringify({
    ok: true,
    elapsedMs: Date.now() - started,
    contexts: contexts.length,
    currentUrl: page?.url() ?? null,
  }));
  await browser.close();
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    elapsedMs: Date.now() - started,
    message: error instanceof Error ? error.message : String(error),
  }));
}
