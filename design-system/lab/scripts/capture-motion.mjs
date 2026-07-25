import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../SCREENSHOTS/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:4400/motion');
await page.getByRole('button', { name: 'Trigger resolution' }).click();
// Mid-transition: --duration-long is 480ms; capture partway through the
// divide/count-up before it settles.
await page.waitForTimeout(220);
await page.screenshot({ path: `${OUT}bond-split-motion.png`, fullPage: true });
await browser.close();
console.log('Captured bond-split-motion.png');
