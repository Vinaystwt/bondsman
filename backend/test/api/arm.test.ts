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
  selectResumablePending,
  runArmStep,
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

describe('selectResumablePending', () => {
  it('does not resume a bonded action whose invoice is already paid', async () => {
    const pending = await selectResumablePending(
      [
        {
          actionId: 12,
          invoiceId: 1_000_000_000_100,
          status: 'ResolvedSlash',
          windowEnd: 1,
        },
        {
          actionId: 13,
          invoiceId: 1_000_000_000_100,
          status: 'Bonded',
          windowEnd: 0,
        },
      ],
      async (invoiceId) => invoiceId === 1_000_000_000_100,
    );

    expect(pending).toBeUndefined();
  });

  it('resumes the newest unpaid initiated or bonded action', async () => {
    const pending = await selectResumablePending(
      [
        {
          actionId: 13,
          invoiceId: 1_000_000_000_100,
          status: 'Bonded',
          windowEnd: 0,
        },
        {
          actionId: 14,
          invoiceId: 1_000_000_000_101,
          status: 'Initiated',
          windowEnd: 0,
        },
      ],
      async (invoiceId) => invoiceId === 1_000_000_000_100,
    );

    expect(pending?.actionId).toBe(14);
  });
});

describe('runArmStep', () => {
  it('logs start and end duration with the transaction hash', async () => {
    const logged: unknown[] = [];
    const hash = 'a'.repeat(64);
    await expect(
      runArmStep(
        'post_bond',
        {
          role: 'agent',
          account: 'account-hash-agent',
          path: '/keys/agent.pem',
        },
        async () => hash,
        (entry) => logged.push(entry),
      ),
    ).resolves.toBe(hash);
    expect(logged).toEqual([
      expect.objectContaining({
        event: 'demo_arm_step_start',
        step: 'post_bond',
        signerRole: 'agent',
      }),
      expect.objectContaining({
        event: 'demo_arm_step_end',
        step: 'post_bond',
        signerRole: 'agent',
        transactionHash: hash,
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it('surfaces the exact step, signer, and contract error', async () => {
    const logged: unknown[] = [];
    await expect(
      runArmStep(
        'execute_action',
        {
          role: 'agent',
          account: 'account-hash-agent',
          path: '/keys/agent.pem',
        },
        async () => {
          throw new Error(
            'Transaction abc failed: User error: 5 (InvoiceAlreadyPaid)',
          );
        },
        (entry) => logged.push(entry),
      ),
    ).rejects.toThrow(
      'execute_action failed; signer=agent (account-hash-agent); reason=Transaction abc failed: User error: 5 (InvoiceAlreadyPaid)',
    );
    expect(logged).toEqual([
      expect.objectContaining({
        event: 'demo_arm_step_start',
        step: 'execute_action',
        signerRole: 'agent',
      }),
      expect.objectContaining({
        event: 'demo_arm_step_failed',
        step: 'execute_action',
        signerRole: 'agent',
        signerAccount: 'account-hash-agent',
        signerPath: '/keys/agent.pem',
        durationMs: expect.any(Number),
        reason:
          'Transaction abc failed: User error: 5 (InvoiceAlreadyPaid)',
      }),
    ]);
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
