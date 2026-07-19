import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import { buildServer } from '../../src/api/server.js';
import { createDemoJobService } from '../../src/api/demo-jobs.js';
import type { Deployment } from '../../src/shared/deployment.js';

const hash = `hash-${'1'.repeat(64)}`;
const account = {
  publicKey: `01${'2'.repeat(64)}`,
  accountHash: '3'.repeat(64),
};
const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  contracts: {
    mockCsprUsd: { packageHash: hash, contractHash: hash },
    bondVault: { packageHash: hash, contractHash: hash },
    controller: { packageHash: hash, contractHash: hash },
    invoicePool: { packageHash: hash, contractHash: hash },
  },
  accounts: {
    deployer: account,
    agent: account,
    challenger: account,
    watchdog: account,
  },
} as Deployment;

function fixture() {
  const database = openDatabase(':memory:');
  const repository = new Repository(database);
  repository.upsertAction({
    actionId: 4,
    invoiceId: 1046,
    agent: `account-hash-${account.accountHash}`,
    amount: '100',
    claimHash: 'aa',
    reasoning: 'Delivered',
    reasoningHash: 'bb',
    bondRequired: '2',
    bondPosted: '2',
    windowEnd: Date.now() + 1_800_000,
    status: 'Executed',
    challenger: null,
    challengerType: null,
    controllerHash: deployment.contracts.controller.contractHash,
    duplicateProven: true,
    reservedForManual: false,
    transactions: { execute: 'c'.repeat(64) },
  });
  repository.upsertAction({
    actionId: 6,
    invoiceId: 2049,
    agent: `account-hash-${account.accountHash}`,
    amount: '500',
    claimHash: 'manual-ready',
    reasoning: 'Duplicate fixture',
    reasoningHash: 'ee',
    bondRequired: '25',
    bondPosted: '25',
    windowEnd: Date.now() + 1_800_000,
    status: 'Executed',
    challenger: null,
    challengerType: null,
    challengeSigning: null,
    controllerHash: deployment.contracts.controller.contractHash,
    duplicateProven: true,
    reservedForManual: true,
    transactions: { execute: '6'.repeat(64) },
  });
  repository.upsertAction({
    actionId: 3,
    invoiceId: 1045,
    agent: `account-hash-${account.accountHash}`,
    amount: '100',
    claimHash: 'slash-current',
    reasoning: 'Duplicate',
    reasoningHash: 'cc',
    bondRequired: '2',
    bondPosted: '2',
    windowEnd: Date.now() - 1_800_000,
    status: 'ResolvedSlash',
    challenger: `account-hash-${account.accountHash}`,
    challengerType: 'watchdog',
    challengeSigning: 'watchdog-key',
    controllerHash: deployment.contracts.controller.contractHash,
    duplicateProven: true,
    reservedForManual: false,
    transactions: {
      execute: 'e'.repeat(64),
      challenge: 'f'.repeat(64),
      resolve: 'd'.repeat(64),
    },
  });
  repository.upsertAction({
    actionId: 2,
    invoiceId: 1044,
    agent: `account-hash-${account.accountHash}`,
    amount: '100',
    claimHash: 'slash-stale',
    reasoning: 'Old controller',
    reasoningHash: 'dd',
    bondRequired: '2',
    bondPosted: '2',
    windowEnd: Date.now() - 1_800_000,
    status: 'ResolvedSlash',
    challenger: `account-hash-${account.accountHash}`,
    challengerType: 'watchdog',
    challengeSigning: 'watchdog-key',
    controllerHash: `hash-${'9'.repeat(64)}`,
    duplicateProven: true,
    reservedForManual: false,
    transactions: {},
  });
  repository.setReputation(
    `account-hash-${account.accountHash}`,
    1,
    0,
    10,
  );
  repository.setReserve('25');
  const resolution = {
    challenge: vi.fn().mockResolvedValue('a'.repeat(64)),
    challengeAndResolve: vi
      .fn()
      .mockResolvedValue({
        challenge: 'a'.repeat(64),
        resolve: 'b'.repeat(64),
      }),
    resolve: vi.fn().mockResolvedValue('d'.repeat(64)),
  };
  const arm = {
    arm: vi
      .fn()
      .mockImplementation(
        async ({ reservedForManual }: { reservedForManual: boolean }) => ({
          actionId: 5,
          invoiceId: 2048,
          status: 'Executed',
          challengerType: null,
          reservedForManual,
          events: [],
          explorerLinks: {
            execute: `https://testnet.cspr.live/transaction/${'e'.repeat(64)}`,
          },
        }),
      ),
  };
  const walletChallenge = {
    transactionStatus: vi.fn().mockResolvedValue({
      hash: 'f'.repeat(64),
      status: 'success',
      final: true,
      success: true,
      error: null,
    }),
    resolveWalletChallenge: vi.fn().mockResolvedValue({
      success: true,
      actionId: 5,
      challenger: `account-hash-${'8'.repeat(64)}`,
      challengerSource: 'external-wallet',
      reward: {
        total: '400',
        challengerShare: '200',
        reserveShare: '200',
        token: 'csprUSD',
        decimals: 9,
      },
      transactions: {
        challenge: 'f'.repeat(64),
        resolve: 'e'.repeat(64),
      },
      finality: { challenge: true, resolve: true },
      explorerLinks: {
        challenge:
          `https://testnet.cspr.live/transaction/${'f'.repeat(64)}`,
        resolve:
          `https://testnet.cspr.live/transaction/${'e'.repeat(64)}`,
      },
    }),
  };
  return {
    database,
    repository,
    resolution,
    arm,
    walletChallenge,
    jobs: createDemoJobService({ repository, resolution, arm }),
    server: buildServer(
      repository,
      deployment,
      resolution,
      arm,
      walletChallenge,
      createDemoJobService({ repository, resolution, arm }),
    ),
  };
}

describe('REST routes', () => {
  it('serves actions, detail, agent, reserve, and deployment state', async () => {
    const context = fixture();
    for (const path of [
      '/api/health',
      '/api/actions',
      '/api/actions/4',
      `/api/agents/account-hash-${account.accountHash}`,
      '/api/reserve',
      '/api/deployments',
      '/api/invoices',
    ]) {
      const response = await context.server.inject(path);
      expect(response.statusCode, path).toBe(200);
    }
    expect(
      (
        await context.server.inject('/api/actions/4')
      ).json().explorerLinks.execute,
    ).toContain('testnet.cspr.live');
    expect(
      (await context.server.inject('/api/actions')).json(),
    ).toHaveLength(3);
    expect(
      (await context.server.inject('/api/actions')).json()[1],
    ).toMatchObject({
      challengerType: null,
      reservedForManual: false,
    });
    expect((await context.server.inject('/api/health')).json()).toMatchObject({
      ok: true,
      version: '0.2.0',
      controller: deployment.contracts.controller.contractHash,
      watchdog: { running: false },
      deploymentsPath: 'deployments/testnet.json',
    });
    await context.server.close();
    context.database.close();
  });

  it('returns ready manual demo cases without starting a fresh arm', async () => {
    const context = fixture();
    const response = await context.server.inject('/api/demo/ready');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      count: 1,
      best: {
        actionId: 6,
        status: 'Executed',
        duplicateProven: true,
        reservedForManual: true,
        safeToChallengeNow: true,
      },
    });
    expect(response.json().best.remainingMs).toBeGreaterThanOrEqual(
      10 * 60 * 1000,
    );
    expect(context.arm.arm).not.toHaveBeenCalled();
    await context.server.close();
    context.database.close();
  });

  it('returns persisted Casper proof and ready cases without a fresh transaction', async () => {
    const context = fixture();
    const response = await context.server.inject('/api/demo/proofs');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      latestManualSlash: null,
      latestWatchdogSlash: {
        actionId: 3,
        status: 'ResolvedSlash',
        challengeTx: 'f'.repeat(64),
        resolveTx: 'd'.repeat(64),
      },
      readyCases: [
        expect.objectContaining({ actionId: 6, safeToChallengeNow: true }),
      ],
    });
    expect(context.arm.arm).not.toHaveBeenCalled();
    await context.server.close();
    context.database.close();
  });

  it('returns a structured no-ready response', async () => {
    const context = fixture();
    context.repository.upsertAction({
      ...context.repository.action(6)!,
      windowEnd: Date.now() + 60_000,
    });

    const response = await context.server.inject('/api/demo/ready');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: false,
      code: 'NO_READY_CASE',
      message: 'No challengeable case is ready yet.',
      nextStep: 'Run npm run demo:prearm or request a fresh case.',
      cases: [],
      count: 0,
      minRemainingMs: 10 * 60 * 1000,
    });
    await context.server.close();
    context.database.close();
  });

  it('starts a persisted challenge job and exposes manual resolution', async () => {
    const context = fixture();
    const challenged = await context.server.inject({
      method: 'POST',
      url: '/api/challenge',
      payload: { actionId: 4 },
    });
    expect(challenged.statusCode).toBe(200);
    expect(challenged.json()).toMatchObject({
      actionId: 4,
      kind: 'challenge',
      status: expect.stringMatching(/queued|submitting_challenge|challenge_finalized|resolving|resolved/),
    });
    expect(context.resolution.challenge).toHaveBeenCalledWith(4);
    const job = await context.server.inject(`/api/jobs/${challenged.json().id}`);
    expect(job.statusCode).toBe(200);

    const resolved = await context.server.inject({
      method: 'POST',
      url: '/api/resolve',
      payload: { actionId: 4 },
    });
    expect(resolved.statusCode).toBe(200);
    expect(context.resolution.resolve).toHaveBeenCalledWith(4);
    await context.server.close();
    context.database.close();
  });

  it('marks a challenge job resolved when projected chain state is resolved', async () => {
    const context = fixture();
    const job = context.repository.createDemoJob({
      id: 'resolved-job',
      kind: 'challenge',
      actionId: 3,
      status: 'resolving',
    });
    const response = await context.server.inject(`/api/jobs/${job.id}`);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'resolved',
      challengeTx: 'f'.repeat(64),
      resolveTx: 'd'.repeat(64),
    });
    await context.server.close();
    context.database.close();
  });

  it('arms one fresh challengeable action', async () => {
    const context = fixture();
    const response = await context.server.inject({
      method: 'POST',
      url: '/api/demo/arm',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      actionId: 5,
      status: 'Executed',
      events: [],
      explorerLinks: {
        execute: expect.stringContaining('testnet.cspr.live'),
      },
    });
    expect(context.arm.arm).toHaveBeenCalledWith({
      reservedForManual: true,
    });
    await context.server.close();
    context.database.close();
  });

  it('returns service unavailable when demo funding is exhausted', async () => {
    const context = fixture();
    context.arm.arm.mockRejectedValueOnce(
      Object.assign(
        new Error('demo funding is temporarily unavailable'),
        { statusCode: 503 },
      ),
    );

    const response = await context.server.inject({
      method: 'POST',
      url: '/api/demo/arm',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      success: false,
      code: 'ARM_FAILED',
      message: 'demo funding is temporarily unavailable',
    });
    await context.server.close();
    context.database.close();
  });

  it('returns the real arm step failure instead of an opaque message', async () => {
    const context = fixture();
    context.arm.arm.mockRejectedValueOnce(
      new Error(
        'execute_action failed; signer=agent (account-hash-agent); reason=User error: 5 (InvoiceAlreadyPaid)',
      ),
    );

    const response = await context.server.inject({
      method: 'POST',
      url: '/api/demo/arm',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      success: false,
      code: 'ARM_FAILED',
      message:
        'execute_action failed; signer=agent (account-hash-agent); reason=User error: 5 (InvoiceAlreadyPaid)',
    });
    await context.server.close();
    context.database.close();
  });

  it('exposes watchdog status and arms a non-reserved duplicate', async () => {
    const context = fixture();
    const watchdogAddress =
      `account-hash-${deployment.accounts.watchdog.accountHash}`;
    context.repository.setWatchdogHeartbeat(watchdogAddress, Date.now());

    const status = await context.server.inject('/api/watchdog');
    expect(status.statusCode).toBe(200);
    expect(status.json()).toEqual({
      running: true,
      account: watchdogAddress,
      recentCatches: [],
      totalRewardEarned: '0',
    });

    const demo = await context.server.inject({
      method: 'POST',
      url: '/api/watchdog/demo',
    });
    expect(demo.statusCode).toBe(200);
    expect(demo.json()).toMatchObject({
      actionId: 5,
      status: 'Executed',
      challengerType: null,
      reservedForManual: false,
    });
    expect(context.arm.arm).toHaveBeenCalledWith({
      reservedForManual: false,
    });
    await context.server.close();
    context.database.close();
  });

  it('exposes transaction finality and resolves a wallet challenge', async () => {
    const context = fixture();
    const challengeDeployHash = 'f'.repeat(64);
    const status = await context.server.inject(
      `/api/transactions/${challengeDeployHash}`,
    );
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      hash: challengeDeployHash,
      status: 'success',
      final: true,
    });

    const resolved = await context.server.inject({
      method: 'POST',
      url: '/api/challenge/wallet-resolve',
      payload: { actionId: 5, challengeDeployHash },
    });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json()).toMatchObject({
      success: true,
      actionId: 5,
      challengerSource: 'external-wallet',
      finality: { challenge: true, resolve: true },
    });
    expect(
      context.walletChallenge.resolveWalletChallenge,
    ).toHaveBeenCalledWith({ actionId: 5, challengeDeployHash });
    await context.server.close();
    context.database.close();
  });

  it('requires the sandbox payment envelope for claim verification', async () => {
    const context = fixture();
    const unpaid = await context.server.inject({
      method: 'POST',
      url: '/api/verify',
      payload: { claimHash: 'aa' },
    });
    expect(unpaid.statusCode).toBe(402);
    expect(unpaid.headers['x-payment-network']).toBe('casper');
    expect(unpaid.headers['x-payment-simulated']).toBe('true');
    expect(unpaid.json()).toMatchObject({
      payment: {
        mode: 'sandbox',
        simulated: true,
        settled: false,
      },
    });

    const paid = await context.server.inject({
      method: 'POST',
      url: '/api/verify',
      headers: {
        'x-payment-network': 'casper',
        'x-payment':
          `casper:01${'a'.repeat(64)}:1000000:` +
          `sig_ed25519_${'b'.repeat(128)}`,
      },
      payload: { claimHash: 'aa' },
    });
    expect(paid.statusCode).toBe(200);
    expect(paid.json()).toEqual({
      code: 'X402_SANDBOX',
      claimHash: 'aa',
      collidesWithPaidClaim: true,
      matchingActionIds: [4],
      payment: {
        mode: 'sandbox',
        simulated: true,
        settled: false,
        network: 'casper',
        amount: '1000000',
        payer: `01${'a'.repeat(64)}`,
        transactionHash: null,
      },
    });
    await context.server.close();
    context.database.close();
  });

  it('requires real x402 payment for the bond quote endpoint', async () => {
    const context = fixture();
    const response = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      payload: { amount: '50000000000000' },
    });
    expect(response.statusCode).toBe(402);
    expect(response.headers['payment-required']).toBeTruthy();
    expect(response.json()).toMatchObject({
      success: false,
      code: 'X402_PAYMENT_REQUIRED',
      payment: {
        x402Version: 2,
        accepts: [
          {
            scheme: 'exact',
            network: 'casper:casper-test',
            asset:
              '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
            amount: '100000000',
          },
        ],
      },
    });
    await context.server.close();
    context.database.close();
  });

  it('surfaces the facilitator reason when x402 settlement fails', async () => {
    const context = fixture();
    const originalKey = process.env.X402_FACILITATOR_API_KEY;
    process.env.X402_FACILITATOR_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        success: false,
        errorReason: 'insufficient_funds',
        errorMessage: 'payer has no WCSPR',
      })),
    });
    vi.stubGlobal('fetch', fetchMock);
    const payment = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: { signature: '00' },
    })).toString('base64');
    const response = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: { amount: '50000000000000' },
    });
    expect(response.statusCode).toBe(402);
    expect(response.json().message).toContain('insufficient_funds');
    expect(response.json().message).toContain('payer has no WCSPR');
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.X402_FACILITATOR_API_KEY;
    } else {
      process.env.X402_FACILITATOR_API_KEY = originalKey;
    }
    await context.server.close();
    context.database.close();
  });

  it('returns a paid quote after x402 settlement succeeds', async () => {
    const context = fixture();
    const originalKey = process.env.X402_FACILITATOR_API_KEY;
    process.env.X402_FACILITATOR_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        success: true,
        transaction: '7'.repeat(64),
        network: 'casper:casper-test',
        payer: `00${'4'.repeat(64)}`,
      })),
    }));
    const payment = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: { signature: '00' },
    })).toString('base64');
    const response = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: { amount: '50000000000000' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['payment-response']).toBeTruthy();
    expect(response.json()).toMatchObject({
      actionType: 'invoice_payout',
      riskTier: 'HIGH',
      requiredBond: '2500000000000',
      challengeWindow: 1800,
      policyModule: 'duplicate-claim-v1',
      paymentReceipt: {
        network: 'casper-test',
        asset: 'WCSPR',
        amount: '100000000',
        transaction: '7'.repeat(64),
        facilitator: 'x402-facilitator.cspr.cloud',
        settled: true,
      },
    });
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.X402_FACILITATOR_API_KEY;
    } else {
      process.env.X402_FACILITATOR_API_KEY = originalKey;
    }
    await context.server.close();
    context.database.close();
  });
});
