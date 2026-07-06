import { describe, expect, it, vi } from 'vitest';
import {
  assertChallengeWindow,
  createInvoiceIdGenerator,
  demoSignerPlan,
  DEMO_GAS_TARGET_MOTES,
  isInsufficientFundsError,
  isTransientRpcError,
  runFundedDemoAction,
  pollArmReadiness,
} from '../../src/api/arm.js';

describe('createInvoiceIdGenerator', () => {
  it('returns distinct increasing identifiers when time does not move', () => {
    const next = createInvoiceIdGenerator(() => 2_000_000_000_000);
    expect(next()).toBe(2_000_000_000_000);
    expect(next()).toBe(2_000_000_000_001);
    expect(next()).toBe(2_000_000_000_002);
  });
});

describe('demo signer plan', () => {
  it('uses the owner for invoice submission and the agent for action calls', () => {
    expect(demoSignerPlan('/owner.pem', '/agent.pem')).toEqual({
      submitInvoice: '/owner.pem',
      initiate: '/agent.pem',
      approve: '/agent.pem',
      postBond: '/agent.pem',
      execute: '/agent.pem',
    });
  });
});

describe('pollArmReadiness', () => {
  it('waits for executed duplicate state with fifteen minutes remaining', async () => {
    const getAction = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'Bonded',
        challenger: 'None',
        window_end: '2000000',
      })
      .mockResolvedValueOnce({
        status: 'Executed',
        challenger: 'None',
        window_end: '2000000',
      });
    const duplicate = vi
      .fn()
      .mockResolvedValueOnce('false')
      .mockResolvedValueOnce('true');
    const ready = await pollArmReadiness(getAction, duplicate, {
      now: () => 1_000_000,
      sleep: vi.fn().mockResolvedValue(undefined),
      attempts: 2,
    });
    expect(ready.status).toBe('Executed');
  });
});

describe('isTransientRpcError', () => {
  it('recognizes transport failures without treating contract reverts as transient', () => {
    expect(
      isTransientRpcError(
        new Error('failed to get response: error sending request'),
      ),
    ).toBe(true);
    expect(
      isTransientRpcError(new Error('contract reverted: NotDuplicate')),
    ).toBe(false);
  });
});

describe('assertChallengeWindow', () => {
  it('accepts exactly thirty minutes and rejects less', () => {
    expect(() =>
      assertChallengeWindow(10_000, 1_810_000),
    ).not.toThrow();
    expect(() =>
      assertChallengeWindow(10_000, 1_809_999),
    ).toThrow('thirty minutes');
  });
});

describe('demo gas target', () => {
  it('keeps existing subaccounts funded without forcing deployer top-ups', () => {
    expect(DEMO_GAS_TARGET_MOTES).toBe(300_000_000_000n);
  });
});

describe('runFundedDemoAction', () => {
  it('preflights funding and retries one insufficient-funds failure', async () => {
    const topUp = vi.fn().mockResolvedValue(undefined);
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Insufficient funds'))
      .mockResolvedValueOnce('armed');

    await expect(
      runFundedDemoAction(topUp, operation),
    ).resolves.toBe('armed');
    expect(topUp).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry unrelated failures', async () => {
    const topUp = vi.fn().mockResolvedValue(undefined);
    const operation = vi
      .fn()
      .mockRejectedValue(new Error('NotDuplicate'));

    await expect(runFundedDemoAction(topUp, operation)).rejects.toThrow(
      'NotDuplicate',
    );
    expect(topUp).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('marks exhausted insufficient funds as service unavailable', async () => {
    const error = new Error('Insufficient funds');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(
      runFundedDemoAction(async () => undefined, operation),
    ).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('recognizes only explicit insufficient-funds errors', () => {
    expect(
      isInsufficientFundsError(new Error('Insufficient funds')),
    ).toBe(true);
    expect(
      isInsufficientFundsError(new Error('network timeout')),
    ).toBe(false);
  });
});
