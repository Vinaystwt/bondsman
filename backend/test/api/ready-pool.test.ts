import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import {
  createDemoReadyPool,
  demoReadyPoolConfig,
} from '../../src/api/ready-pool.js';
import type { DemoArmService } from '../../src/api/arm.js';

const controllerHash = `hash-${'1'.repeat(64)}`;

function repositoryWithReadyActions(count: number, now = 1_000_000) {
  const database = openDatabase(':memory:');
  const repository = new Repository(database);
  for (let index = 0; index < count; index += 1) {
    repository.upsertAction({
      actionId: index,
      invoiceId: 2_000 + index,
      agent: 'account-hash-agent',
      amount: '100',
      claimHash: `claim-${index}`,
      reasoning: 'Duplicate demo case',
      reasoningHash: 'reasoning',
      bondRequired: '5',
      bondPosted: '5',
      windowEnd: now + 1_800_000,
      status: 'Executed',
      challenger: null,
      challengerType: null,
      challengeSigning: null,
      controllerHash,
      duplicateProven: true,
      reservedForManual: true,
      transactions: {},
    });
  }
  return { database, repository };
}

describe('demoReadyPoolConfig', () => {
  it('stays disabled unless explicitly enabled', () => {
    expect(demoReadyPoolConfig({}).enabled).toBe(false);
    expect(
      demoReadyPoolConfig({
        DEMO_READY_POOL_ENABLED: 'true',
        DEMO_READY_POOL_TARGET: '3',
        DEMO_READY_POOL_MIN_WINDOW_MINUTES: '15',
        DEMO_READY_POOL_INTERVAL_SECONDS: '60',
      }),
    ).toEqual({
      enabled: true,
      target: 3,
      minWindowMs: 15 * 60 * 1000,
      intervalMs: 60 * 1000,
    });
  });

  it('uses a three-case, fifteen-minute reserve by default', () => {
    expect(demoReadyPoolConfig({})).toMatchObject({
      target: 3,
      minWindowMs: 15 * 60 * 1000,
      intervalMs: 300 * 1000,
    });
  });
});

describe('createDemoReadyPool', () => {
  it('arms one manual case when the ready pool is below target', async () => {
    const { database, repository } = repositoryWithReadyActions(1);
    const arm = {
      arm: vi.fn().mockResolvedValue({ actionId: 99 }),
    };
    const pool = createDemoReadyPool({
      config: {
        enabled: true,
        target: 2,
        minWindowMs: 10 * 60 * 1000,
        intervalMs: 300 * 1000,
      },
      repository,
      controllerHash,
      arm: arm as unknown as DemoArmService,
      now: () => 1_000_000,
      log: vi.fn(),
    });

    await pool.tick('test');

    expect(arm.arm).toHaveBeenCalledWith({ reservedForManual: true });
    database.close();
  });

  it('does not arm when enough ready cases already exist', async () => {
    const { database, repository } = repositoryWithReadyActions(2);
    const arm = {
      arm: vi.fn().mockResolvedValue({ actionId: 99 }),
    };
    const pool = createDemoReadyPool({
      config: {
        enabled: true,
        target: 2,
        minWindowMs: 10 * 60 * 1000,
        intervalMs: 300 * 1000,
      },
      repository,
      controllerHash,
      arm: arm as unknown as DemoArmService,
      now: () => 1_000_000,
      log: vi.fn(),
    });

    await pool.tick('test');

    expect(arm.arm).not.toHaveBeenCalled();
    database.close();
  });

  it('skips overlapping ticks so two arm jobs cannot run concurrently', async () => {
    const { database, repository } = repositoryWithReadyActions(0);
    let resolveArm: (value: { actionId: number }) => void = () => undefined;
    const arm = {
      arm: vi.fn(
        () =>
          new Promise<{ actionId: number }>((resolve) => {
            resolveArm = resolve;
          }),
      ),
    };
    const log = vi.fn();
    const pool = createDemoReadyPool({
      config: {
        enabled: true,
        target: 2,
        minWindowMs: 10 * 60 * 1000,
        intervalMs: 300 * 1000,
      },
      repository,
      controllerHash,
      arm: arm as unknown as DemoArmService,
      now: () => 1_000_000,
      log,
    });

    const first = pool.tick('first');
    await Promise.resolve();
    await pool.tick('second');
    resolveArm({ actionId: 99 });
    await first;

    expect(arm.arm).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'demo_ready_pool_skip',
        cause: 'already_running',
      }),
    );
    database.close();
  });

  it('backs off after a failed arm instead of retrying every tick', async () => {
    const { database, repository } = repositoryWithReadyActions(0);
    const arm = {
      arm: vi.fn().mockRejectedValue(new Error('HTTP 429 Too Many Requests')),
    };
    const log = vi.fn();
    let now = 1_000_000;
    const pool = createDemoReadyPool({
      config: {
        enabled: true,
        target: 3,
        minWindowMs: 15 * 60 * 1000,
        intervalMs: 300 * 1000,
      },
      repository,
      controllerHash,
      arm: arm as unknown as DemoArmService,
      now: () => now,
      random: () => 0,
      log,
    });

    await pool.tick('first');
    now += 60_000;
    await pool.tick('second');

    expect(arm.arm).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'demo_ready_pool_failed',
        cause: 'rpc_rate_limited',
        nextAttemptAt: new Date(1_300_000).toISOString(),
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'demo_ready_pool_skip',
        cause: 'backoff',
      }),
    );
    database.close();
  });
});
