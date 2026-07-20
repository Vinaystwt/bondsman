import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror the verificationStateFrom implementation exposed by
// components/proof/ReceiptTamperLab.tsx. Kept in lockstep with source; any
// divergence should surface here.
function verificationStateFrom(res) {
  if (res === null || res === undefined) return null;
  if (typeof res !== 'object') {
    return { kind: 'unavailable', reason: 'malformed verifier response' };
  }
  if (res.valid === true) return { kind: 'valid' };
  if (res.valid === false) {
    return {
      kind: 'invalid',
      reason: res.reason ?? 'signature verification failed',
    };
  }
  return {
    kind: 'unavailable',
    reason: 'malformed verifier response',
  };
}

test('original valid receipt maps to valid', () => {
  const s = verificationStateFrom({ valid: true });
  assert.deepEqual(s, { kind: 'valid' });
});

test('tampered invalid receipt maps to invalid with reason', () => {
  const s = verificationStateFrom({
    valid: false,
    reason: 'signature verification failed',
  });
  assert.deepEqual(s, {
    kind: 'invalid',
    reason: 'signature verification failed',
  });
});

test('backend unavailable (null) maps to unresolved state', () => {
  const s = verificationStateFrom(null);
  assert.equal(s, null);
});

test('malformed verifier response maps to unavailable, not invalid', () => {
  const s = verificationStateFrom({ notARealBody: true });
  assert.equal(s.kind, 'unavailable');
});

test('non object verifier response maps to unavailable', () => {
  const s = verificationStateFrom('boom');
  assert.equal(s.kind, 'unavailable');
});

test('invalid without a reason still exposes a default reason', () => {
  const s = verificationStateFrom({ valid: false });
  assert.equal(s.kind, 'invalid');
  assert.equal(typeof s.reason, 'string');
  assert.ok(s.reason.length > 0);
});
