#!/usr/bin/env node
// Structural check that /api/proofs/canonical, /api/receipt/27 and
// /api/receipt/27/verify still contain every field the proof-first frontend
// consumes. Runs against the production backend by default.
//
// Usage: node frontend/scripts/check-canonical.mjs [BASE_URL]

import assert from 'node:assert/strict';

const BASE =
  process.argv[2] ??
  process.env.BONDSMAN_API_BASE ??
  'https://bondsman-backend-production.up.railway.app';

const CANONICAL_ID = '27';

const results = [];

function record(name, fn) {
  results.push({ name, fn });
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

record('canonical proof parses and has expected shape', async () => {
  const p = await getJson('/api/proofs/canonical');
  assert.equal(p.actionId, CANONICAL_ID);
  assert.equal(p.outcome, 'SLASHED');
  assert.equal(p.faultClass, 'delivery_contradiction');
  assert.ok(Array.isArray(p.timeline));
  const stages = p.timeline.map((s) => s.stage);
  for (const required of [
    'initiate',
    'bond_posted',
    'execute',
    'evidence_arrived',
    'challenge',
    'resolve',
  ]) {
    assert.ok(stages.includes(required), `missing timeline stage ${required}`);
  }
  const stageIndex = Object.fromEntries(stages.map((s, i) => [s, i]));
  assert.ok(stageIndex.initiate < stageIndex.bond_posted, 'initiate must precede bond_posted');
  assert.ok(stageIndex.bond_posted < stageIndex.execute, 'bond_posted must precede execute');
  assert.ok(stageIndex.execute < stageIndex.challenge, 'execute must precede challenge');
  assert.ok(stageIndex.challenge < stageIndex.resolve, 'challenge must precede resolve');
});

record('canonical proof has real payment fields', async () => {
  const p = await getJson('/api/proofs/canonical');
  assert.ok(p.payment, 'payment block missing');
  assert.equal(p.payment.protocol, 'x402');
  assert.equal(p.payment.asset, 'WCSPR');
  assert.match(p.payment.paymentAmount, /^\d+$/);
  assert.match(p.payment.settlementTransaction, /^[0-9a-f]{64}$/i);
});

record('canonical proof has paid quote fields', async () => {
  const p = await getJson('/api/proofs/canonical');
  assert.ok(p.paidQuote);
  assert.match(p.paidQuote.quoteHash, /^0x[0-9a-f]{64}$/i);
  assert.equal(p.paidQuote.consumedActionId, Number(CANONICAL_ID));
});

record('canonical proof has verified delivery attestation', async () => {
  const p = await getJson('/api/proofs/canonical');
  assert.ok(p.deliveryAttestation);
  assert.equal(p.deliveryAttestation.signatureVerified, true);
  assert.match(p.deliveryAttestation.evidenceRoot, /^0x[0-9a-f]{64}$/i);
});

record('canonical proof has economic impact fields', async () => {
  const p = await getJson('/api/proofs/canonical');
  assert.ok(p.economicImpact);
  assert.match(p.economicImpact.challengerReward, /^\d+$/);
  assert.match(p.economicImpact.reserveCredit, /^\d+$/);
  assert.equal(
    p.economicImpact.challengerReward,
    p.economicImpact.reserveCredit,
    'bond must split 50/50',
  );
});

record('portable receipt is well-formed', async () => {
  const r = await getJson(`/api/receipt/${CANONICAL_ID}`);
  assert.equal(r.actionId, CANONICAL_ID);
  assert.equal(r.outcome, 'SLASHED');
  assert.equal(r.faultClass, 'delivery_contradiction');
  assert.ok(r.signerPublicKey);
  assert.ok(r.signature);
  assert.ok(r.deployHashes.challenge);
  assert.ok(r.deployHashes.resolve);
});

record('receipt verification returns valid:true', async () => {
  const v = await getJson(`/api/receipt/${CANONICAL_ID}/verify`);
  assert.equal(v.valid, true);
});

record('receipt verification rejects unknown ids', async () => {
  const res = await fetch(`${BASE}/api/receipt/99999/verify`);
  assert.notEqual(res.status, 200, 'unknown ids must not return 200');
});

record('featured proofs includes canonical and refund class', async () => {
  const list = await getJson('/api/proofs/featured');
  assert.ok(Array.isArray(list) && list.length >= 1);
  const canonical = list.find((p) => p.actionId === CANONICAL_ID);
  assert.ok(canonical, 'featured list must include canonical action 27');
});

record('agent card advertises x402 and expected skills', async () => {
  const a = await getJson('/.well-known/agent.json');
  assert.ok(a.authentication.schemes.includes('x402'));
  const ids = a.skills.map((s) => s.id);
  for (const s of ['quote_bonded_action', 'submit_bonded_action', 'verify_receipt']) {
    assert.ok(ids.includes(s), `agent card missing skill ${s}`);
  }
});

record('health endpoint is reachable and typed', async () => {
  const h = await getJson('/api/health');
  assert.equal(typeof h.ok, 'boolean');
  assert.ok(h.spending);
  assert.equal(typeof h.spending.code, 'string');
});

// Explorer link formatting matches lib/format.ts helper.
record('transaction explorer format matches frontend helper', async () => {
  const p = await getJson('/api/proofs/canonical');
  const tx = p.payment.settlementTransaction;
  const expected = `https://testnet.cspr.live/transaction/${tx}`;
  assert.equal(p.payment.settlementExplorerUrl, expected);
});

let failed = 0;
for (const { name, fn } of results) {
  try {
    await fn();
    console.log(`ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`fail ${name}`);
    console.log(String(err?.message ?? err));
  }
}
console.log(`\n${results.length - failed}/${results.length} passed`);
if (failed > 0) process.exit(1);
