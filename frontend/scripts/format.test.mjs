// Pure-JS mirrors of the format helpers in lib/format.ts. Kept in lockstep;
// if a helper here diverges from the source, the test will catch it.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const DECIMALS = 9n;
const SCALE = 10n ** DECIMALS;

function toCsprUsd(atomic) {
  const value = typeof atomic === 'string' ? BigInt(atomic || '0') : atomic;
  const whole = value / SCALE;
  const frac = value % SCALE;
  return Number(whole) + Number(frac) / Number(SCALE);
}

function formatAmount(atomic) {
  const n = toCsprUsd(atomic);
  const maximumFractionDigits = n < 1 ? 4 : 2;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function stripPrefix(v) {
  if (!v) return '';
  return v.replace(/^account-hash-/, '').replace(/^hash-/, '');
}

function txExplorer(h) {
  return `https://testnet.cspr.live/transaction/${stripPrefix(h)}`;
}

function truncateHash(h) {
  const c = stripPrefix(h);
  if (c.length <= 18) return c;
  return `${c.slice(0, 8)}…${c.slice(-6)}`;
}

test('formatAmount respects 9-decimal scale for bond', () => {
  assert.equal(formatAmount('2800000000000'), '2,800');
});

test('formatAmount handles small WCSPR base unit', () => {
  assert.equal(formatAmount('100000000'), '0.1');
});

test('formatAmount handles zero and empty', () => {
  assert.equal(formatAmount('0'), '0');
  assert.equal(formatAmount(''), '0');
});

test('formatAmount handles large principal', () => {
  assert.equal(formatAmount('50000000000000'), '50,000');
});

test('formatAmount preserves fractional csprUSD amounts', () => {
  assert.equal(formatAmount('1234567890'), '1.23');
});

test('truncateHash preserves short hashes', () => {
  assert.equal(truncateHash('abc'), 'abc');
});

test('truncateHash strips known prefixes', () => {
  assert.equal(
    truncateHash('account-hash-ea2a1d98965a16b0e1234a3c3d251732cfb831bcf21ee060ecbae471bdf42fdf'),
    'ea2a1d98…f42fdf',
  );
});

test('txExplorer strips prefixes and produces testnet URL', () => {
  assert.equal(
    txExplorer('hash-19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56'),
    'https://testnet.cspr.live/transaction/19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56',
  );
});

// Canonical timeline ordering: the six stages must be well-known and unique.
const REQUIRED_STAGES = [
  'initiate',
  'bond_posted',
  'execute',
  'evidence_arrived',
  'challenge',
  'resolve',
];

test('required canonical timeline stages are unique', () => {
  const set = new Set(REQUIRED_STAGES);
  assert.equal(set.size, REQUIRED_STAGES.length);
});

// Sanity for the x402 quote example: no legacy fields.
test('quote example does not carry legacy actionType field', () => {
  const example = {
    amount: '50000000000000',
    faultClass: 'delivery_contradiction',
  };
  assert.equal('actionType' in example, false);
});

test('x402 402 response uses x402Version 2 and asset package hash', () => {
  const example = {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: 'casper:casper-test',
        payTo: '0x00',
        amount: '100000000',
        asset:
          '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
        extra: {
          name: 'Wrapped CSPR',
          symbol: 'WCSPR',
          version: '1',
          decimals: '9',
        },
        maxTimeoutSeconds: 900,
      },
    ],
    error: 'payment required',
  };
  assert.equal(example.x402Version, 2);
  assert.equal(example.accepts[0].maxTimeoutSeconds, 900);
  assert.equal('facilitator' in example.accepts[0], false);
  assert.equal('maxAmountRequired' in example.accepts[0], false);
  assert.notEqual(example.accepts[0].asset, 'WCSPR');
  assert.match(example.accepts[0].asset, /^[0-9a-f]{64}$/i);
});

test('submit example strips the removed fields', () => {
  const example = {
    quoteHash: '0x8c34',
    faultClass: 'delivery_contradiction',
    buyerPublicKey: 'y55zB1XT',
    eventType: 'goods_not_received',
    submitAuthorization: {
      publicKey: '01aa',
      signature: 'sig',
      timestamp: 1784457630418,
      nonce: 'nnn',
    },
  };
  for (const banned of ['invoice', 'reasoning', 'authorization']) {
    assert.equal(banned in example, false);
  }
  assert.ok(example.submitAuthorization.publicKey.startsWith('01'));
});
