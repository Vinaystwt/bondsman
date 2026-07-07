import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import { buildServer } from '../../src/api/server.js';
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
    server: buildServer(
      repository,
      deployment,
      resolution,
      arm,
      walletChallenge,
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
      version: '0.1.0',
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

  it('sequences challenge then resolution and exposes manual resolution', async () => {
    const context = fixture();
    const challenged = await context.server.inject({
      method: 'POST',
      url: '/api/challenge',
      payload: { actionId: 4 },
    });
    expect(challenged.statusCode).toBe(200);
    expect(context.resolution.challengeAndResolve).toHaveBeenCalledWith(4);

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
});
