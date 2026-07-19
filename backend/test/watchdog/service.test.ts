import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import {
  createSingleFlight,
  createWatchdogService,
} from '../../src/watchdog/service.js';

describe('watchdog service', () => {
  it('coalesces overlapping poll requests without a backlog', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const operation = vi.fn(async () => gate);
    const run = createSingleFlight(operation);

    const first = run();
    const second = run();
    expect(operation).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    release();
    await first;
    await run();
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('waits, catches a duplicate, and records reward and hashes once', async () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    for (const [actionId, status] of [
      [0, 'ResolvedRefund'],
      [1, 'Executed'],
    ] as const) {
      repository.upsertAction({
        actionId,
        invoiceId: actionId,
        agent: 'account-hash-agent',
        amount: '100',
        claimHash: 'collision',
        reasoning: 'Delivered',
        reasoningHash: 'bb',
        bondRequired: '20',
        bondPosted: '20',
        windowEnd: 20_000,
        status,
        challenger: null,
        challengerType: null,
        duplicateProven: true,
        reservedForManual: false,
        transactions: {},
      });
    }
    const sleep = vi.fn().mockResolvedValue(undefined);
    const transact = vi.fn().mockResolvedValue({
      challenge: 'a'.repeat(64),
      resolve: 'b'.repeat(64),
    });
    const service = createWatchdogService({
      repository,
      watchdogAddress: 'account-hash-watchdog',
      delayMs: 30_000,
      now: () => 10_000,
      sleep,
      transact,
      reasoning: async () => 'Repeated paid claim fingerprint detected.',
    });

    await expect(service.scanOnce()).resolves.toHaveLength(1);
    await expect(service.scanOnce()).resolves.toHaveLength(0);
    expect(sleep).toHaveBeenCalledWith(30_000);
    expect(transact).toHaveBeenCalledTimes(1);
    expect(repository.watchdogSummary()).toMatchObject({
      totalRewardEarned: '10',
      recentCatches: [
        {
          actionId: 1,
          reward: '10',
          challengeTx: 'a'.repeat(64),
          resolveTx: 'b'.repeat(64),
        },
      ],
    });
    expect(repository.action(1)).toMatchObject({
      status: 'ResolvedSlash',
      challenger: 'account-hash-watchdog',
      challengerType: 'watchdog',
    });
    database.close();
  });

  it('catches a delivery contradiction with verifier evidence once', async () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    repository.upsertAction({
      actionId: 5,
      invoiceId: 5,
      agent: 'account-hash-agent',
      amount: '100',
      claimHash: 'claim',
      reasoning: 'Delivered',
      reasoningHash: 'bb',
      bondRequired: '20',
      bondPosted: '20',
      windowEnd: 20_000,
      status: 'Executed',
      challenger: null,
      challengerType: null,
      duplicateProven: false,
      reservedForManual: false,
      transactions: {},
    });
    repository.upsertDeliveryAttestation({
      evidenceRoot: '0xabc',
      invoiceId: 5,
      actionId: 5,
      eventType: 'delivery_rejected',
      occurredAt: 11_000,
      buyerPublicKey: 'key',
      signature: 'signature',
      payload: { evidenceHex: 'ab'.repeat(120) },
      receivedAt: 12_000,
      usedActionId: null,
    });
    const transact = vi.fn().mockResolvedValue({
      challenge: 'c'.repeat(64),
      resolve: 'd'.repeat(64),
    });
    const service = createWatchdogService({
      repository,
      watchdogAddress: 'account-hash-watchdog',
      delayMs: 0,
      now: () => 10_000,
      sleep: vi.fn().mockResolvedValue(undefined),
      transact,
      reasoning: async (action) => `${action.faultClass}:${action.actionId}`,
    });

    await expect(service.scanOnce()).resolves.toHaveLength(1);
    await expect(service.scanOnce()).resolves.toHaveLength(0);
    expect(transact).toHaveBeenCalledWith(
      expect.objectContaining({
        faultClass: 'delivery_contradiction',
        evidence: Buffer.from('ab'.repeat(120), 'hex'),
      }),
    );
    expect(repository.action(5)).toMatchObject({
      status: 'ResolvedSlash',
      faultClass: 'delivery_contradiction',
      evidenceRoot: '0xabc',
    });
    database.close();
  });

  it('releases delivery evidence when the on-chain challenge fails', async () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    repository.upsertAction({
      actionId: 6,
      invoiceId: 6,
      agent: 'account-hash-agent',
      amount: '100',
      claimHash: 'claim',
      reasoning: 'Delivered',
      reasoningHash: 'bb',
      bondRequired: '20',
      bondPosted: '20',
      windowEnd: 20_000,
      status: 'Executed',
      challenger: null,
      challengerType: null,
      duplicateProven: false,
      reservedForManual: false,
      transactions: {},
    });
    repository.upsertDeliveryAttestation({
      evidenceRoot: '0xdef',
      invoiceId: 6,
      actionId: 6,
      eventType: 'delivery_rejected',
      occurredAt: 11_000,
      buyerPublicKey: 'key',
      signature: 'signature',
      payload: { evidenceHex: 'cd'.repeat(120) },
      receivedAt: 12_000,
      usedActionId: null,
    });
    const service = createWatchdogService({
      repository,
      watchdogAddress: 'account-hash-watchdog',
      delayMs: 0,
      now: () => 10_000,
      sleep: vi.fn().mockResolvedValue(undefined),
      transact: vi.fn().mockRejectedValue(new Error('rpc failed')),
      reasoning: async () => 'delivery contradiction',
    });

    await expect(service.scanOnce()).rejects.toThrow('rpc failed');
    expect(repository.deliveryAttestationForAction(6)?.usedActionId).toBeNull();
    database.close();
  });
});
