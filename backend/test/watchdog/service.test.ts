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
});
