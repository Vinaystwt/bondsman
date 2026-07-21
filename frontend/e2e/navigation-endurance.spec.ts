import { expect, test, type Page } from '@playwright/test';

const ROUTES = ['/', '/app', '/app/new', '/proof', '/proof/27', '/verify', '/build', '/'];
const BLOCKED_MUTATIONS = /\/(v1\/actions|api\/(demo|challenge|resolve|watchdog|delivery-attestation|verify|labs|receipt))/;

async function installGuards(page: Page) {
  const failures: string[] = [];
  page.on('pageerror', (error) => {
    if (/Minified React error #418/i.test(error.message)) return;
    failures.push(error.message);
  });
  page.on('console', (message) => {
    const text = message.text();
    if (/404 \(Not Found\)/i.test(text)) return;
    if (/Minified React error #418/i.test(text)) return;
    if (
      message.type() === 'error' ||
      /hydration|gsap|500 internal|unhandled/i.test(text)
    ) {
      failures.push(text);
    }
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET' && BLOCKED_MUTATIONS.test(new URL(request.url()).pathname)) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, code: 'E2E_BLOCKED_MUTATION', message: 'blocked by e2e' }),
      });
      return;
    }
    await route.continue();
  });
  return failures;
}

async function assertPageHealthy(page: Page, route: string, failures: string[]) {
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('main')).toBeVisible();
  expect(await page.locator('nav[aria-label="Primary"], nav[aria-label="Mobile"]').count()).toBeGreaterThan(0);
  await page.waitForTimeout(150);
  const metrics = await page.evaluate(() => ({
    bodyText: document.body.innerText.trim().length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    path: window.location.pathname,
  }));
  expect(metrics.bodyText, `${route} rendered blank text`).toBeGreaterThan(20);
  expect(metrics.overflow, `${route} has horizontal overflow`).toBeLessThanOrEqual(2);
  expect(metrics.path, `${route} stuck on another route`).toBe(route === '/' ? '/' : route);
  expect(failures, `${route} emitted client/runtime errors`).toEqual([]);
}

test('primary routes survive repeated production navigation', async ({ page }) => {
  test.setTimeout(420_000);
  const failures = await installGuards(page);
  for (let cycle = 0; cycle < 25; cycle += 1) {
    for (const route of ROUTES) {
      failures.length = 0;
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status() ?? 0, `${route} returned an unexpected server error`).toBeLessThan(500);
      await assertPageHealthy(page, route, failures);
    }
  }
});
