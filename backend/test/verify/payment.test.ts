import { describe, expect, it } from 'vitest';
import {
  parseSandboxPayment,
  paymentRequired,
} from '../../src/verify/payment.js';

const account = `01${'a'.repeat(64)}`;
const signature = `sig_ed25519_${'b'.repeat(128)}`;

describe('sandbox Casper payment envelope', () => {
  it('accepts the documented Casper header shape and exact amount', () => {
    expect(
      parseSandboxPayment(
        `casper:${account}:1000000:${signature}`,
        'casper',
        '1000000',
      ),
    ).toEqual({
      account,
      amount: '1000000',
      signature,
    });
  });

  it('rejects the wrong network, amount, account, or signature shape', () => {
    expect(() =>
      parseSandboxPayment(
        `casper:${account}:1000000:${signature}`,
        'base',
        '1000000',
      ),
    ).toThrow('network');
    expect(() =>
      parseSandboxPayment(
        `casper:${account}:2:${signature}`,
        'casper',
        '1000000',
      ),
    ).toThrow('amount');
    expect(() =>
      parseSandboxPayment(
        'casper:not-an-account:1000000:sig_ed25519_bad',
        'casper',
        '1000000',
      ),
    ).toThrow('payment');
  });

  it('builds a plainly simulated payment requirement', () => {
    expect(paymentRequired(account, '1000000')).toMatchObject({
      mode: 'sandbox',
      simulated: true,
      settled: false,
      network: 'casper',
      amount: '1000000',
      payTo: account,
    });
  });
});
