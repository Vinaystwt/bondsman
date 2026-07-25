import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../SCREENSHOTS/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ['home', '/', 1280, 800],
  ['typography', '/typography', 1280, 1200],
  ['color', '/color', 1280, 1400],
  ['spacing', '/spacing', 1280, 900],
  ['grid-desktop', '/grid', 1280, 900],
  ['grid-tablet', '/grid', 768, 1024],
  ['grid-mobile', '/grid', 375, 812],
  ['buttons', '/buttons', 1280, 1200],
  ['forms', '/forms', 1280, 1400],
  ['wallet-states', '/wallet-states', 1280, 1600],
  ['payment-ladder', '/payment-states', 1280, 900],
  ['lifecycle', '/lifecycle', 1280, 1000],
  ['receipts', '/receipts', 1280, 1000],
  ['evidence-labels', '/evidence-labels', 1280, 600],
  ['banners-states', '/banners-states', 1280, 1400],
  ['mobile-nav', '/mobile-nav', 375, 812],
  ['motion-reduced', '/motion', 1280, 800],
];

const browser = await chromium.launch();
for (const [name, path, width, height] of SHOTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`http://localhost:4400${path}`);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log(`Captured ${SHOTS.length} screenshots to ${OUT}`);
