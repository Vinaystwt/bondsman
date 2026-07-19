import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import { buildServer } from '../../src/api/server.js';
import { createDemoJobService } from '../../src/api/demo-jobs.js';
import type { Deployment } from '../../src/shared/deployment.js';
import { blake2b256 } from '../../src/agent/hashing.js';
import {
  canonicalSubmitAuthorizationPayload,
  payerFromCasperPublicKey,
} from '../../src/verify/submit-authorization.js';
import {
  assertSpendAllowed,
  recordSpend,
  resetSpendGuard,
} from '../../src/ops/spend-guard.js';

const hash = `hash-${'1'.repeat(64)}`;
const v1Hash = `hash-${'9'.repeat(64)}`;
const account = {
  publicKey: `01${'2'.repeat(64)}`,
  accountHash: '3'.repeat(64),
};
const watchdogAccount = {
  publicKey: `01${'4'.repeat(64)}`,
  accountHash: '5'.repeat(64),
};
const operatorHeaders = { authorization: 'Bearer test-operator-token' };
const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  current: 'v2',
  contracts: {
    mockCsprUsd: { packageHash: hash, contractHash: hash },
    bondVault: { packageHash: hash, contractHash: hash },
    controller: { packageHash: hash, contractHash: hash },
    invoicePool: { packageHash: hash, contractHash: hash },
    controllerV1: { packageHash: v1Hash, contractHash: v1Hash },
    controllerV2: { packageHash: hash, contractHash: hash },
    bondVaultV2: { packageHash: hash, contractHash: hash },
    invoicePoolV2: { packageHash: hash, contractHash: hash },
  },
  versions: {
    v1: {
      mockCsprUsd: { packageHash: hash, contractHash: hash },
      bondVault: { packageHash: v1Hash, contractHash: v1Hash },
      controller: { packageHash: v1Hash, contractHash: v1Hash },
      invoicePool: { packageHash: v1Hash, contractHash: v1Hash },
    },
    v2: {
      mockCsprUsd: { packageHash: hash, contractHash: hash },
      bondVault: { packageHash: hash, contractHash: hash },
      controller: { packageHash: hash, contractHash: hash },
      invoicePool: { packageHash: hash, contractHash: hash },
      verifiers: {
        duplicateClaim: { packageHash: hash, contractHash: hash },
        deliveryContradiction: { packageHash: hash, contractHash: hash },
      },
    },
  },
  accounts: {
    deployer: account,
    agent: account,
    challenger: account,
    watchdog: watchdogAccount,
  },
} as Deployment;

function casperEd25519Key() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const rawPublicKey = Buffer.from(
    publicKey.export({ format: 'der', type: 'spki' }),
  ).subarray(-32).toString('hex');
  const publicKeyHex = `01${rawPublicKey}`;
  return {
    privateKey,
    publicKeyHex,
    payer: payerFromCasperPublicKey(publicKeyHex),
  };
}

function submitAuthorization(input: {
  privateKey: KeyObject;
  publicKeyHex: string;
  quoteHash: string;
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
  buyerPublicKey?: string;
  eventType?: 'delivery_rejected' | 'goods_not_received';
  timestamp?: number;
  nonce?: string;
}) {
  const timestamp = input.timestamp ?? Date.now();
  const nonce = input.nonce ?? 'nonce'.padEnd(32, '0');
  const payload = canonicalSubmitAuthorizationPayload({
    quoteHash: input.quoteHash,
    faultClass: input.faultClass,
    eventType: input.eventType ?? 'goods_not_received',
    timestamp,
    nonce,
    ...(input.buyerPublicKey ? { buyerPublicKey: input.buyerPublicKey } : {}),
  });
  return {
    publicKey: input.publicKeyHex,
    timestamp,
    nonce,
    signature: sign(null, payload, input.privateKey).toString('base64'),
  };
}

function seedCanonical(repository: Repository) {
  const reasoning = 'Release was contradicted by signed buyer non-delivery evidence.';
  repository.upsertAction({
    actionId: 27,
    invoiceId: 4027,
    agent: `account-hash-${account.accountHash}`,
    amount: '50000000000000',
    claimHash: 'canonical-delivery-claim',
    reasoning,
    reasoningHash: blake2b256(reasoning).toString('hex'),
    bondRequired: '2800000000000',
    bondPosted: '2800000000000',
    windowEnd: Date.now() - 60_000,
    status: 'ResolvedSlash',
    challenger: `account-hash-${watchdogAccount.accountHash}`,
    challengerType: 'watchdog',
    challengeSigning: 'watchdog-key',
    controllerHash: deployment.contracts.controller.contractHash,
    duplicateProven: false,
    faultClass: 'delivery_contradiction',
    evidenceRoot: `0x${'a'.repeat(64)}`,
    reservedForManual: false,
    transactions: {
      execute: '7'.repeat(64),
      challenge: '8'.repeat(64),
      resolve: '9'.repeat(64),
    },
  });
  repository.upsertPaidQuote({
    quoteHash: `0x${'b'.repeat(64)}`,
    actionType: 'invoice_payout',
    faultClass: 'delivery_contradiction',
    verifier: 'delivery-contradiction-v2',
    amount: '50000000000000',
    requiredBond: '2600000000000',
    challengeWindow: 1800,
    quoteExpiry: new Date(Date.now() + 60_000).toISOString(),
    payer: `00${'5'.repeat(64)}`,
    settlementTx: '6'.repeat(64),
    paymentAmount: '100000000',
    facilitator: 'x402-facilitator.cspr.cloud',
    status: 'consumed',
    submitPayloadHash: `0x${'c'.repeat(64)}`,
    consumedActionId: 27,
    createdAt: Date.now() - 120_000,
    consumedAt: Date.now() - 60_000,
  });
  repository.upsertDeliveryAttestation({
    evidenceRoot: `0x${'a'.repeat(64)}`,
    invoiceId: 4027,
    actionId: 27,
    eventType: 'goods_not_received',
    occurredAt: Date.now() - 180_000,
    buyerPublicKey: Buffer.alloc(32, 7).toString('base64'),
    signature: Buffer.alloc(64, 8).toString('base64'),
    payload: { invoiceId: 4027, actionId: 27, eventType: 'goods_not_received' },
    receivedAt: Date.now() - 120_000,
    usedActionId: 27,
  });
}

function fixture() {
  process.env.OPERATOR_API_TOKEN = 'test-operator-token';
  const database = openDatabase(':memory:');
  const repository = new Repository(database);
  const repositoryPath = join(
    tmpdir(),
    `bondsman-routes-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(join(repositoryPath, '.keys'), { recursive: true });
  const { privateKey: receiptKey } = generateKeyPairSync('ed25519');
  writeFileSync(
    join(repositoryPath, '.keys/receipt-signer.pem'),
    receiptKey.export({ format: 'pem', type: 'pkcs8' }),
    'utf8',
  );
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
  repository.upsertEvent({
    contract: 'BondsmanControllerV2',
    eventIndex: 1,
    eventType: 'ResolvedSlashV2',
    actionId: 3,
    data: JSON.stringify({
      challenger_amount: '1',
      reserve_amount: '1',
    }),
    transactionHash: 'd'.repeat(64),
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
  repository.setReputation(
    `account-hash-${watchdogAccount.accountHash}`,
    0,
    0,
    0,
  );
  seedCanonical(repository);
  repository.setWatchdogHeartbeat(
    `account-hash-${deployment.accounts.watchdog.accountHash}`,
    Date.now(),
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
    submitPaidAction: vi.fn().mockResolvedValue({
      actionId: 9,
      invoiceId: 3009,
      status: 'Executed',
      faultClass: 'delivery_contradiction',
      challengerType: null,
      reservedForManual: false,
      transactions: {
        execute: '9'.repeat(64),
      },
      events: [],
      explorerLinks: {
        execute: `https://testnet.cspr.live/transaction/${'9'.repeat(64)}`,
      },
      attestation: {
        actionId: 9,
        invoiceId: 3009,
        eventType: 'goods_not_received',
        occurredAt: Date.now() - 5_000,
        nonce: 'a'.repeat(64),
        buyerPublicKey: Buffer.alloc(32, 7).toString('base64'),
      },
    }),
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
      repositoryPath,
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
    ).toHaveLength(4);
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
      watchdog: { running: true },
      deploymentsPath: 'deployments/testnet.json',
    });
    await context.server.close();
    context.database.close();
  });

  it('returns ready manual demo cases without starting a fresh arm', async () => {
    const context = fixture();
    const response = await context.server.inject({
      url: '/api/demo/ready',
      headers: operatorHeaders,
    });

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
    const response = await context.server.inject({
      url: '/api/demo/proofs',
      headers: operatorHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      latestManualSlash: null,
      latestWatchdogSlash: {
        actionId: 27,
        status: 'ResolvedSlash',
        challengeTx: '8'.repeat(64),
        resolveTx: '9'.repeat(64),
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

    const response = await context.server.inject({
      url: '/api/demo/ready',
      headers: operatorHeaders,
    });

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
      headers: operatorHeaders,
      payload: { actionId: 4 },
    });
    expect(challenged.statusCode).toBe(200);
    expect(challenged.json()).toMatchObject({
      actionId: 4,
      kind: 'challenge',
      status: expect.stringMatching(/queued|submitting_challenge|challenge_finalized|resolving|resolved/),
    });
    expect(context.resolution.challenge).toHaveBeenCalledWith(4);
    const job = await context.server.inject({
      url: `/api/jobs/${challenged.json().id}`,
      headers: operatorHeaders,
    });
    expect(job.statusCode).toBe(200);

    const resolved = await context.server.inject({
      method: 'POST',
      url: '/api/resolve',
      headers: operatorHeaders,
      payload: { actionId: 4 },
    });
    expect(resolved.statusCode).toBe(200);
    expect(context.resolution.resolve).toHaveBeenCalledWith(4);
    await context.server.close();
    context.database.close();
  });

  it('reuses an idempotency result for repeated synchronous arm calls', async () => {
    const context = fixture();
    const headers = { 'idempotency-key': 'same-arm-click' };
    const first = await context.server.inject({
      method: 'POST',
      url: '/api/demo/arm',
      headers: { ...headers, ...operatorHeaders },
    });
    const second = await context.server.inject({
      method: 'POST',
      url: '/api/demo/arm',
      headers: { ...headers, ...operatorHeaders },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(context.arm.arm).toHaveBeenCalledTimes(1);
    await context.server.close();
    context.database.close();
  });

  it('rate limits repeated mutating requests with a structured error', async () => {
    const oldLimit = process.env.API_MUTATION_RATE_LIMIT_PER_MINUTE;
    process.env.API_MUTATION_RATE_LIMIT_PER_MINUTE = '1';
    const context = fixture();
    const first = await context.server.inject({
      method: 'POST',
      url: '/api/resolve',
      headers: operatorHeaders,
      payload: { actionId: 4 },
    });
    const second = await context.server.inject({
      method: 'POST',
      url: '/api/resolve',
      headers: operatorHeaders,
      payload: { actionId: 4 },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(second.json()).toEqual({
      success: false,
      code: 'RATE_LIMITED',
      message: 'too many mutating requests',
    });
    if (oldLimit === undefined) delete process.env.API_MUTATION_RATE_LIMIT_PER_MINUTE;
    else process.env.API_MUTATION_RATE_LIMIT_PER_MINUTE = oldLimit;
    await context.server.close();
    context.database.close();
  });

  it('exposes spend telemetry and recent errors without hiding the real code', async () => {
    const context = fixture();
    const missing = await context.server.inject('/api/nope');
    expect(missing.statusCode).toBe(404);

    const spend = await context.server.inject({
      url: '/api/ops/spend',
      headers: operatorHeaders,
    });
    expect(spend.statusCode).toBe(200);
    expect(spend.json()).toMatchObject({
      code: 'SPENDING_OK',
      tripped: false,
      accounts: expect.arrayContaining([
        expect.objectContaining({ account: 'agent' }),
        expect.objectContaining({ account: 'challenger' }),
      ]),
    });

    const errors = await context.server.inject({
      url: '/api/ops/recent-errors',
      headers: operatorHeaders,
    });
    expect(errors.statusCode).toBe(200);
    expect(errors.json()).toMatchObject({
      success: true,
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'route not found',
        }),
      ]),
    });
    await context.server.close();
    context.database.close();
  });

  it('advertises public capabilities and returns assurance manifests without mutation', async () => {
    const context = fixture();
    const capabilities = await context.server.inject('/api/public-capabilities');
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json()).toMatchObject({
      productCategory: 'bonded_execution_assurance',
      proofConsole: { enabled: true, canonicalActionId: 27 },
      assuranceStudio: { enabled: true, mode: 'design_only' },
      sponsoredLiveRun: { enabled: false },
      publicChallengeArena: { enabled: false },
      externalWalletChallenge: { enabled: false },
      operatorDemoWrites: { enabled: true, public: false },
    });

    const templates = await context.server.inject('/api/assurance/templates');
    expect(templates.statusCode).toBe(200);
    expect(templates.json().templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'invoice_delivery',
          implementationStatus: 'executable_now',
        }),
        expect.objectContaining({
          id: 'dex_execution',
          implementationStatus: 'blueprint',
        }),
      ]),
    );

    const schema = await context.server.inject('/api/assurance/schema');
    expect(schema.statusCode).toBe(200);
    expect(schema.json()).toMatchObject({
      title: 'Bondsman Assurance Manifest v1',
      properties: {
        boundaries: expect.any(Object),
      },
    });

    const before = context.repository.listActions().length;
    const analysis = await context.server.inject({
      method: 'POST',
      url: '/api/assurance/analyze',
      payload: {
        templateId: 'invoice_delivery',
        description: 'Pay a supplier only when delivery evidence remains challengeable.',
        amount: '50000000000000',
        agentConfidence: 0.82,
        counterpartyStatus: 'new',
        evidenceSource: 'signed_delivery_attestation',
        maxLossBps: 600,
        urgency: 'normal',
      },
    });
    expect(analysis.statusCode).toBe(200);
    expect(analysis.json()).toMatchObject({
      modelAnalysis: {
        source: 'deterministic_fallback',
      },
      manifest: {
        schemaId: 'bondsman.assurance-manifest.v1',
        implementationStatus: 'executable_now',
        faultClass: 'delivery_contradiction',
        boundaries: {
          submitsTransaction: false,
          makesPayment: false,
          challengesAction: false,
          settlesQuote: false,
        },
      },
    });
    const duplicate = await context.server.inject({
      method: 'POST',
      url: '/api/assurance/analyze',
      payload: {
        templateId: 'duplicate_invoice_test',
        description: 'Detect and slash a repeated invoice claim fingerprint.',
        amount: '50000000000000',
        agentConfidence: 0.9,
        counterpartyStatus: 'known',
        evidenceSource: 'paid_claim_registry',
        maxLossBps: 600,
        urgency: 'normal',
      },
    });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().manifest).toMatchObject({
      implementationStatus: 'executable_now',
      executableNow: true,
      faultClass: 'duplicate_claim',
      verifier: 'duplicate-claim-v2',
      proposedFaultClass: null,
      proposedVerifier: null,
    });

    for (const [templateId, proposedFaultClass] of [
      ['treasury_payment', 'treasury_policy_violation'],
      ['dex_execution', 'execution_constraint_violation'],
      ['x402_service_delivery', 'service_delivery_contradiction'],
    ] as const) {
      const blueprint = await context.server.inject({
        method: 'POST',
        url: '/api/assurance/analyze',
        payload: {
          templateId,
          description: `Blueprint analysis for ${templateId} without deployed verifier claims.`,
          amount: '50000000000000',
          agentConfidence: 0.84,
          counterpartyStatus: 'new',
          evidenceSource: templateId === 'treasury_payment'
            ? 'multisig_approval'
            : templateId === 'dex_execution'
              ? 'execution_receipt'
              : 'signed_delivery_attestation',
          maxLossBps: 600,
          urgency: 'normal',
        },
      });
      expect(blueprint.statusCode).toBe(200);
      expect(blueprint.json().manifest).toMatchObject({
        implementationStatus: 'blueprint',
        executableNow: false,
        faultClass: null,
        verifier: null,
        proposedFaultClass,
        quoteRequestShape: null,
        submitRequirements: [],
      });
    }
    expect(context.repository.listActions()).toHaveLength(before);
    await context.server.close();
    context.database.close();
  });

  it('replays canonical action 27 and rejects anonymous operator endpoints', async () => {
    const context = fixture();
    const canonical = await context.server.inject('/api/proofs/canonical');
    expect(canonical.statusCode).toBe(200);
    expect(canonical.json()).toMatchObject({
      actionId: '27',
      faultClass: 'delivery_contradiction',
      paidQuote: { status: 'consumed', consumedActionId: 27 },
      bondEconomics: {
        quotedMinimumBond: '2600000000000',
        actualPostedBond: '2800000000000',
        bondRelation: 'overcollateralized',
        minimumSatisfied: true,
        exactMatch: false,
      },
    });

    const replay = await context.server.inject('/api/replay/canonical');
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toMatchObject({
      actionId: 27,
      source: 'live_projection',
      checks: {
        quoteSingleUse: true,
        quoteReplayAllowed: false,
        minimumBondSatisfied: true,
        exactBondMatch: false,
        bondRelation: 'overcollateralized',
        receiptValid: true,
      },
    });

    const quoteCheck = await context.server.inject({
      method: 'POST',
      url: '/api/replay/canonical/quote-check',
    });
    expect(quoteCheck.statusCode).toBe(200);
    expect(quoteCheck.json()).toMatchObject({
      success: true,
      actionId: 27,
      singleUse: true,
      wouldAcceptNewSubmission: false,
      expectedRejectionCode: 'QUOTE_ALREADY_CONSUMED',
    });

    const ops = await context.server.inject('/api/ops/spend');
    expect(ops.statusCode).toBe(401);
    expect(ops.json()).toMatchObject({
      code: 'OPERATOR_AUTH_REQUIRED',
    });
    const challenge = await context.server.inject({
      method: 'POST',
      url: '/api/challenge',
      payload: { actionId: 4 },
    });
    expect(challenge.statusCode).toBe(401);
    await context.server.close();
    context.database.close();
  });

  it('keeps external wallet resolution disabled unless explicitly enabled', async () => {
    const oldWallet = process.env.PUBLIC_WALLET_CHALLENGE_ENABLED;
    delete process.env.PUBLIC_WALLET_CHALLENGE_ENABLED;
    const context = fixture();
    const response = await context.server.inject({
      method: 'POST',
      url: '/api/challenge/wallet-resolve',
      headers: operatorHeaders,
      payload: { actionId: 5, challengeDeployHash: 'f'.repeat(64) },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      code: 'WALLET_CHALLENGE_DISABLED',
    });
    expect(context.walletChallenge.resolveWalletChallenge).not.toHaveBeenCalled();
    if (oldWallet === undefined) delete process.env.PUBLIC_WALLET_CHALLENGE_ENABLED;
    else process.env.PUBLIC_WALLET_CHALLENGE_ENABLED = oldWallet;
    await context.server.close();
    context.database.close();
  });

  it('reports a tripped spending circuit in health', async () => {
    resetSpendGuard();
    const oldHour = process.env.TX_BUDGET_PER_HOUR;
    const oldDay = process.env.TX_BUDGET_PER_DAY;
    process.env.TX_BUDGET_PER_HOUR = '1';
    process.env.TX_BUDGET_PER_DAY = '10';
    recordSpend({ signerPath: '/repo/.keys/challenger.pem', gas: 1 });
    expect(() =>
      assertSpendAllowed({ signerPath: '/repo/.keys/challenger.pem', gas: 1 }),
    ).toThrow('SPENDING_CIRCUIT_TRIPPED');

    const context = fixture();
    const response = await context.server.inject('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: false,
      spending: {
        code: 'SPENDING_CIRCUIT_TRIPPED',
        tripped: true,
        accounts: expect.arrayContaining([
          expect.objectContaining({
            account: 'challenger',
            tripped: true,
          }),
        ]),
      },
    });

    resetSpendGuard();
    if (oldHour === undefined) delete process.env.TX_BUDGET_PER_HOUR;
    else process.env.TX_BUDGET_PER_HOUR = oldHour;
    if (oldDay === undefined) delete process.env.TX_BUDGET_PER_DAY;
    else process.env.TX_BUDGET_PER_DAY = oldDay;
    await context.server.close();
    context.database.close();
  });

  it('keeps current-controller data consistent across judge-facing endpoints', async () => {
    const context = fixture();
    const [
      health,
      actions,
      coverage,
      featured,
      latest,
      agentResponse,
      watchdogAgentResponse,
      reserve,
    ] = await Promise.all([
      context.server.inject('/api/health'),
      context.server.inject('/api/actions'),
      context.server.inject('/api/coverage'),
      context.server.inject('/api/proofs/featured'),
      context.server.inject('/api/proofs/latest'),
      context.server.inject(`/api/agents/account-hash-${account.accountHash}`),
      context.server.inject(`/api/agents/account-hash-${watchdogAccount.accountHash}`),
      context.server.inject('/api/reserve'),
    ]);

    for (const response of [health, actions, coverage, featured, latest, agentResponse, watchdogAgentResponse, reserve]) {
      expect(response.statusCode).toBe(200);
    }
    const controller = health.json().controller;
    const currentActions = actions.json() as Array<{ status: string; bondPosted: string }>;
    const slashedAmount = currentActions
      .filter((action) => action.status === 'ResolvedSlash')
      .reduce((sum, action) => sum + BigInt(action.bondPosted), 0n)
      .toString();
    expect(controller).toBe(deployment.contracts.controller.contractHash);
    expect(health.json().daily.actions).toBe(currentActions.length);
    expect(latest.json().every((proof: Record<string, unknown>) => proof.controller === controller)).toBe(true);
    expect(featured.json().every((proof: Record<string, unknown>) => proof.controller === controller)).toBe(true);
    expect(agentResponse.json().actions.every((action: Record<string, unknown>) => action.agent === `account-hash-${account.accountHash}`)).toBe(true);
    expect(watchdogAgentResponse.json().actions).toEqual([]);
    expect(coverage.json().reserveBalance).toBe(reserve.json().balance);
    expect(coverage.json().cumulativeSlashes).toBe(slashedAmount);
    expect(reserve.json().slashes).toHaveLength(1);
    expect(reserve.json().slashes[0]).toMatchObject({
      eventType: 'ResolvedSlashV2',
      actionId: 3,
    });
    await context.server.close();
    context.database.close();
  });

  it('reflects the active controller rollback suite in health and demo readiness', async () => {
    const context = fixture();
    const rollbackDeployment = {
      ...deployment,
      current: 'v1',
      contracts: {
        ...deployment.contracts,
        bondVault: deployment.versions!.v1!.bondVault,
        controller: deployment.versions!.v1!.controller,
        invoicePool: deployment.versions!.v1!.invoicePool,
      },
    } as Deployment;
    context.repository.upsertAction({
      ...context.repository.action(6)!,
      actionId: 88,
      invoiceId: 2088,
      controllerHash: rollbackDeployment.contracts.controller.contractHash,
    });
    const server = buildServer(
      context.repository,
      rollbackDeployment,
      context.resolution,
      context.arm,
      context.walletChallenge,
      context.jobs,
    );

    const health = await server.inject('/api/health');
    const ready = await server.inject({
      url: '/api/demo/ready',
      headers: operatorHeaders,
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      controllerVersion: 'v1',
      activeControllerVersion: 'v1',
      controller: v1Hash,
    });
    expect(ready.statusCode).toBe(200);
    expect(ready.json().best.actionId).toBe(88);
    await server.close();
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
    const response = await context.server.inject({
      url: `/api/jobs/${job.id}`,
      headers: operatorHeaders,
    });

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
      headers: operatorHeaders,
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
      headers: operatorHeaders,
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
      headers: operatorHeaders,
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
      headers: operatorHeaders,
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
    const oldWallet = process.env.PUBLIC_WALLET_CHALLENGE_ENABLED;
    process.env.PUBLIC_WALLET_CHALLENGE_ENABLED = 'true';
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
      headers: operatorHeaders,
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
    if (oldWallet === undefined) delete process.env.PUBLIC_WALLET_CHALLENGE_ENABLED;
    else process.env.PUBLIC_WALLET_CHALLENGE_ENABLED = oldWallet;
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
    const before = (
      context.database.prepare('SELECT COUNT(*) AS count FROM paid_quotes').get() as { count: number }
    ).count;
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
    const after = (
      context.database.prepare('SELECT COUNT(*) AS count FROM paid_quotes').get() as { count: number }
    ).count;
    expect(after).toBe(before);
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

  it('classifies CEP-18 insufficient balance failures from real x402 settlement', async () => {
    const context = fixture();
    const originalKey = process.env.X402_FACILITATOR_API_KEY;
    process.env.X402_FACILITATOR_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        success: false,
        errorReason: 'invalid_exact_casper_wait_deploy_failed',
        errorMessage: 'transaction execution failed: User error: 60001',
      })),
    }));
    const payment = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: {
        authorization: {
          from: `00${'4'.repeat(64)}`,
          to: `00${'3'.repeat(64)}`,
          value: '100000000',
          validBefore: '123',
        },
        signature: '00',
      },
    })).toString('base64');
    const response = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: { amount: '50000000000000' },
    });
    expect(response.statusCode).toBe(402);
    expect(response.json()).toMatchObject({
      code: 'X402_INSUFFICIENT_WCSPR',
      diagnostics: {
        payer: `00${'4'.repeat(64)}`,
        authorizedAmount: '100000000',
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
      faultClass: 'delivery_contradiction',
      riskTier: 'HIGH',
      requiredBond: '2500000000000',
      challengeWindow: 1800,
      policyModule: 'delivery-contradiction-v2',
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

  it('rejects mismatched, tampered, expired, and replayed submit authorizations', async () => {
    const context = fixture();
    const originalKey = process.env.X402_FACILITATOR_API_KEY;
    process.env.X402_FACILITATOR_API_KEY = 'test-key';
    const payerKey = casperEd25519Key();
    const otherKey = casperEd25519Key();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          success: true,
          transaction: '7'.repeat(64),
          network: 'casper:casper-test',
          payer: payerKey.payer,
        })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({
          success: true,
          transaction: '8'.repeat(64),
          network: 'casper:casper-test',
          payer: payerKey.payer,
        })),
      });
    vi.stubGlobal('fetch', fetchMock);
    const payment = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: { signature: '00' },
    })).toString('base64');
    const paid = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: {
        amount: '50000000000000',
        faultClass: 'delivery_contradiction',
      },
    });
    const quoteHash = paid.json().quoteHash;
    const buyerPublicKey = Buffer.alloc(32, 7).toString('base64');

    const wrongPayer = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: submitAuthorization({
          ...otherKey,
          quoteHash,
          faultClass: 'delivery_contradiction',
          buyerPublicKey,
        }),
      },
    });
    expect(wrongPayer.statusCode).toBe(401);
    expect(wrongPayer.json().code).toBe('SUBMIT_AUTHORIZATION_INVALID');

    const tampered = submitAuthorization({
      ...payerKey,
      quoteHash,
      faultClass: 'delivery_contradiction',
      buyerPublicKey,
      eventType: 'delivery_rejected',
      nonce: 'tampered'.padEnd(32, '0'),
    });
    const tamperedResponse = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        eventType: 'goods_not_received',
        submitAuthorization: tampered,
      },
    });
    expect(tamperedResponse.statusCode).toBe(401);

    const expired = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: submitAuthorization({
          ...payerKey,
          quoteHash,
          faultClass: 'delivery_contradiction',
          buyerPublicKey,
          timestamp: Date.now() - 10 * 60_000,
          nonce: 'expired'.padEnd(32, '0'),
        }),
      },
    });
    expect(expired.statusCode).toBe(401);

    const nonce = 'replay'.padEnd(32, '0');
    const accepted = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: submitAuthorization({
          ...payerKey,
          quoteHash,
          faultClass: 'delivery_contradiction',
          buyerPublicKey,
          nonce,
        }),
      },
    });
    expect(accepted.statusCode).toBe(200);

    const secondPaid = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: {
        amount: '50000000000000',
        faultClass: 'delivery_contradiction',
      },
    });
    expect(secondPaid.statusCode).toBe(200);
    const secondQuoteHash = secondPaid.json().quoteHash;
    const replay = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash: secondQuoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: submitAuthorization({
          ...payerKey,
          quoteHash: secondQuoteHash,
          faultClass: 'delivery_contradiction',
          buyerPublicKey,
          nonce,
        }),
      },
    });
    expect(replay.statusCode).toBe(409);
    expect(replay.json().code).toBe('SUBMIT_AUTHORIZATION_REPLAY');

    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.X402_FACILITATOR_API_KEY;
    } else {
      process.env.X402_FACILITATOR_API_KEY = originalKey;
    }
    await context.server.close();
    context.database.close();
  });

  it('rejects stale quote policy before nonce consumption or reservation', async () => {
    const context = fixture();
    const originalKey = process.env.X402_FACILITATOR_API_KEY;
    process.env.X402_FACILITATOR_API_KEY = 'test-key';
    const payerKey = casperEd25519Key();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        success: true,
        transaction: 'a'.repeat(64),
        network: 'casper:casper-test',
        payer: payerKey.payer,
      })),
    }));
    const payment = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: { signature: '00' },
    })).toString('base64');
    const paid = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: {
        amount: '50000000000000',
        faultClass: 'delivery_contradiction',
      },
    });
    expect(paid.statusCode).toBe(200);
    const quoteHash = paid.json().quoteHash;
    const quote = context.repository.paidQuote(quoteHash)!;
    context.repository.upsertPaidQuote({
      ...quote,
      requiredBond: '9999999999999999',
      policySnapshot: {
        ...(quote.policySnapshot ?? {}),
        quotedMinimumBond: '9999999999999999',
      },
    });
    const buyerPublicKey = Buffer.alloc(32, 7).toString('base64');
    const authorization = submitAuthorization({
      ...payerKey,
      quoteHash,
      faultClass: 'delivery_contradiction',
      buyerPublicKey,
      nonce: 'stale-policy'.padEnd(32, '0'),
    });
    const rejected = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: authorization,
      },
    });
    expect(rejected.statusCode).toBe(409);
    expect(rejected.json()).toMatchObject({
      code: 'QUOTE_POLICY_STALE',
    });
    expect(context.repository.paidQuote(quoteHash)).toMatchObject({
      status: 'paid',
      consumedActionId: null,
      submitPayloadHash: null,
    });
    const nonces = context.database
      .prepare('SELECT COUNT(*) AS count FROM submit_authorization_nonces')
      .get() as { count: number };
    expect(nonces.count).toBe(0);
    expect(context.arm.submitPaidAction).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.X402_FACILITATOR_API_KEY;
    } else {
      process.env.X402_FACILITATOR_API_KEY = originalKey;
    }
    await context.server.close();
    context.database.close();
  });

  it('binds a paid quote to one submitted delivery action', async () => {
    const context = fixture();
    const originalKey = process.env.X402_FACILITATOR_API_KEY;
    process.env.X402_FACILITATOR_API_KEY = 'test-key';
    const payerKey = casperEd25519Key();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        success: true,
        transaction: '7'.repeat(64),
        network: 'casper:casper-test',
        payer: payerKey.payer,
      })),
    }));
    const payment = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: { signature: '00' },
    })).toString('base64');
    const paid = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: {
        amount: '50000000000000',
        faultClass: 'delivery_contradiction',
      },
    });
    const quoteHash = paid.json().quoteHash;
    const buyerPublicKey = Buffer.alloc(32, 7).toString('base64');
    const authorization = submitAuthorization({
      ...payerKey,
      quoteHash,
      faultClass: 'delivery_contradiction',
      buyerPublicKey,
    });
    const submit = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: authorization,
      },
    });
    expect(submit.statusCode).toBe(200);
    expect(context.arm.submitPaidAction).toHaveBeenCalledWith({
      quoteHash,
      faultClass: 'delivery_contradiction',
      amount: '50000000000000',
      buyerPublicKey,
      eventType: 'goods_not_received',
    });
    expect(context.repository.paidQuote(quoteHash)).toMatchObject({
      status: 'consumed',
      consumedActionId: 9,
    });
    const paidRetry = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/quote',
      headers: { 'payment-signature': payment },
      payload: {
        amount: '50000000000000',
        faultClass: 'delivery_contradiction',
      },
    });
    expect(paidRetry.statusCode).toBe(200);
    expect(paidRetry.json().quoteHash).toBe(quoteHash);
    expect(context.repository.paidQuote(quoteHash)).toMatchObject({
      status: 'consumed',
      consumedActionId: 9,
    });
    const replay = await context.server.inject({
      method: 'POST',
      url: '/v1/actions/submit',
      payload: {
        quoteHash,
        faultClass: 'delivery_contradiction',
        buyerPublicKey,
        submitAuthorization: authorization,
      },
    });
    expect(replay.statusCode).toBe(409);
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
