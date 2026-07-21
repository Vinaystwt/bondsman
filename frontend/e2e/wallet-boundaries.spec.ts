import { expect, test, type Page } from '@playwright/test';

const BLOCKED_MUTATIONS = /\/(v1\/actions|api\/(demo|challenge|resolve|watchdog|delivery-attestation|verify|labs|receipt))/;
const ED25519_KEY = `01${'11'.repeat(32)}`;
const ALT_ED25519_KEY = `01${'22'.repeat(32)}`;
const SECP_KEY = `02${'33'.repeat(33)}`;

async function blockMutations(page: Page) {
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
}

async function gotoNewAction(page: Page) {
  await blockMutations(page);
  await page.goto('/app/new', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
  if (await page.getByText(/backend unavailable|backend is unavailable|backend not reachable/i).count()) {
    test.skip(true, 'backend-backed app/new shell is unavailable in this e2e environment');
  }
  if ((await page.getByRole('button', { name: /connect payer|reconnect wallet/i }).count()) === 0) {
    test.skip(true, 'wallet boundary UI is not rendered in this e2e environment');
  }
}

function walletConnectButton(page: Page) {
  return page.getByRole('button', { name: /^(Connect payer|Reconnect wallet)$/ }).last();
}

async function installWallet(page: Page, config: {
  publicKey?: string;
  connected?: boolean;
  approved?: boolean;
  supports?: string[];
  omit?: Array<'requestConnection' | 'getActivePublicKeySupports' | 'signTypedData' | 'signMessage'>;
}) {
  await page.addInitScript((walletConfig) => {
    const configValue = walletConfig as {
      publicKey?: string;
      connected?: boolean;
      approved?: boolean;
      supports?: string[];
      omit?: string[];
    };
    const provider: Record<string, unknown> = {
      requestConnection: async () => configValue.approved ?? true,
      isConnected: async () => configValue.connected ?? true,
      getActivePublicKey: async () => configValue.publicKey,
      getActivePublicKeySupports: async () => configValue.supports ?? ['sign-typed-data-eip712', 'sign-message'],
      getVersion: async () => 'e2e',
      signTypedData: async () => ({ signatureHex: '01' + '44'.repeat(64) }),
      signMessage: async () => ({ signatureHex: '55'.repeat(64) }),
    };
    for (const key of configValue.omit ?? []) delete provider[key];
    (window as unknown as { CasperWalletProvider?: () => Record<string, unknown> }).CasperWalletProvider = () => provider;
  }, config);
}

test('absent Casper Wallet is reported without attempting payment', async ({ page }) => {
  await gotoNewAction(page);
  await expect(page.getByText('Wallet absent')).toBeVisible();
  await walletConnectButton(page).click();
  await expect(page.getByText('Casper Wallet is not installed.')).toBeVisible();
});

test('missing provider methods are blocked at connection', async ({ page }) => {
  await installWallet(page, {
    publicKey: ED25519_KEY,
    omit: ['getActivePublicKeySupports', 'signTypedData', 'signMessage'],
  });
  await gotoNewAction(page);
  await walletConnectButton(page).click();
  await expect(page.getByText(/missing getActivePublicKeySupports, signTypedData, signMessage/i)).toBeVisible();
});

test('wallet rejection is surfaced as a boundary state', async ({ page }) => {
  await installWallet(page, { publicKey: ED25519_KEY, connected: false, approved: false });
  await gotoNewAction(page);
  await walletConnectButton(page).click();
  await expect(page.getByText('Wallet connection was rejected.')).toBeVisible();
});

test('account mismatch disables recovered quote authorization', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('bondsman.newAction.v2', JSON.stringify({
      schemaVersion: 1,
      quoteHash: '0x' + 'aa'.repeat(32),
      quoteExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      payerAccount: '00' + 'bb'.repeat(32),
      faultClass: 'delivery_contradiction',
      principalAmount: '10000000000000',
      selectedTemplateId: 'invoice_delivery',
      scenarioHash: 'scenario-e2e',
      paymentSettlementTx: 'cc'.repeat(32),
      actionId: null,
      savedAt: new Date().toISOString(),
    }));
  });
  await installWallet(page, { publicKey: ALT_ED25519_KEY, connected: true });
  await gotoNewAction(page);
  await expect(page.getByRole('heading', { name: 'Recovered paid quote' })).toBeVisible();
  await expect(page.getByText('Connected payer does not match the paid quote.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign authorization and create action' })).toBeDisabled();
});

test('unsupported public key type is blocked', async ({ page }) => {
  await installWallet(page, { publicKey: SECP_KEY });
  await gotoNewAction(page);
  await walletConnectButton(page).click();
  await expect(page.getByText(/Only Ed25519 Casper public keys are supported/i)).toBeVisible();
});

test('typed-data unavailable is blocked before payment', async ({ page }) => {
  await installWallet(page, { publicKey: ED25519_KEY, supports: ['sign-message'] });
  await gotoNewAction(page);
  await walletConnectButton(page).click();
  await expect(page.getByText(/cannot sign Casper EIP 712 typed data/i)).toBeVisible();
});

test('message signing unavailable is blocked before submit authorization', async ({ page }) => {
  await installWallet(page, { publicKey: ED25519_KEY, supports: ['sign-typed-data-eip712'] });
  await gotoNewAction(page);
  await walletConnectButton(page).click();
  await expect(page.getByText(/cannot sign submit authorization messages/i)).toBeVisible();
});
