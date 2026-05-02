import puppeteer from 'puppeteer-core';

const endpoint = process.argv[2];
if (!endpoint) {
  console.error('Usage: node scripts/probe-adspower-puppeteer.mjs <endpoint>');
  process.exit(1);
}

const started = Date.now();
try {
  const browser = await puppeteer.connect({
    browserWSEndpoint: endpoint,
    defaultViewport: null,
    protocolTimeout: 10_000,
  });
  const pages = await browser.pages();
  console.log(JSON.stringify({
    ok: true,
    elapsedMs: Date.now() - started,
    pages: pages.length,
    currentUrl: pages[0]?.url() ?? null,
  }));
  await browser.disconnect();
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    elapsedMs: Date.now() - started,
    message: error instanceof Error ? error.message : String(error),
  }));
}
