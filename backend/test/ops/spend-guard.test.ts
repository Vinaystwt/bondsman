import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertSpendAllowed,
  recordSpend,
  resetSpendGuard,
  signerAccount,
  spendSnapshot,
} from '../../src/ops/spend-guard.js';

describe('spending circuit breaker', () => {
  afterEach(() => {
    delete process.env.TX_BUDGET_PER_HOUR_MOTES;
    delete process.env.TX_BUDGET_PER_DAY_MOTES;
    delete process.env.TX_BUDGET_PER_HOUR;
    delete process.env.TX_BUDGET_PER_DAY;
    resetSpendGuard();
    vi.restoreAllMocks();
  });

  it('classifies signers by key path', () => {
    expect(signerAccount('/repo/.keys/deployer.pem')).toBe('deployer');
    expect(signerAccount('/repo/.keys/agent.pem')).toBe('agent');
    expect(signerAccount('/repo/.keys/challenger.pem')).toBe('challenger');
    expect(signerAccount('/repo/.keys/watchdog.pem')).toBe('watchdog');
  });

  it('warns at eighty percent and trips before a second over budget transaction', () => {
    process.env.TX_BUDGET_PER_HOUR_MOTES = '100';
    process.env.TX_BUDGET_PER_DAY_MOTES = '1000';

    recordSpend({
      signerPath: '/repo/.keys/agent.pem',
      gas: 80,
      transactionHash: 'a'.repeat(64),
      now: 1_000,
    });
    expect(spendSnapshot(1_000).accounts.find((account) => account.account === 'agent')).toMatchObject({
      warning: true,
      tripped: false,
      hourlyPercent: 80,
      hourTransactions: 1,
    });

    expect(() =>
      assertSpendAllowed({
        signerPath: '/repo/.keys/agent.pem',
        gas: 21,
        now: 2_000,
      }),
    ).toThrow('SPENDING_CIRCUIT_TRIPPED');
    expect(spendSnapshot(2_000)).toMatchObject({
      code: 'SPENDING_CIRCUIT_TRIPPED',
      tripped: true,
    });
    expect(spendSnapshot(60 * 60 * 1000)).toMatchObject({
      code: 'SPENDING_CIRCUIT_TRIPPED',
      tripped: true,
    });
    expect(spendSnapshot(60 * 60 * 1000 + 2_001)).toMatchObject({
      code: 'SPENDING_OK',
      tripped: false,
    });
  });

  it('keeps account budgets independent', () => {
    process.env.TX_BUDGET_PER_HOUR_MOTES = '100';
    process.env.TX_BUDGET_PER_DAY_MOTES = '1000';
    recordSpend({
      signerPath: '/repo/.keys/agent.pem',
      gas: 95,
      now: 1_000,
    });

    expect(() =>
      assertSpendAllowed({
        signerPath: '/repo/.keys/challenger.pem',
        gas: 50,
        now: 2_000,
      }),
    ).not.toThrow();
  });

  it('trips on transaction count even when estimated motes remain low', () => {
    process.env.TX_BUDGET_PER_HOUR = '1';
    process.env.TX_BUDGET_PER_DAY = '10';
    process.env.TX_BUDGET_PER_HOUR_MOTES = '1000000';
    process.env.TX_BUDGET_PER_DAY_MOTES = '10000000';

    recordSpend({
      signerPath: '/repo/.keys/watchdog.pem',
      gas: 1,
      now: 1_000,
    });

    expect(() =>
      assertSpendAllowed({
        signerPath: '/repo/.keys/watchdog.pem',
        gas: 1,
        now: 2_000,
      }),
    ).toThrow('hourlyTransactions=2/1');
    expect(
      spendSnapshot(2_000).accounts.find((account) => account.account === 'watchdog'),
    ).toMatchObject({
      tripped: true,
      hourlyTransactionLimit: 1,
      hourTransactions: 1,
    });
  });
});
