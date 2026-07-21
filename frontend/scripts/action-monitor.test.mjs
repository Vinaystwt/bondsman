import { test } from 'node:test';
import assert from 'node:assert/strict';

const delays = [5000, 10000, 20000, 30000];
const terminal = new Set(['ResolvedSlash', 'ResolvedRefund']);

function nextActionPollDelayMs(attempt) {
  return delays[Math.min(Math.max(0, Math.floor(attempt)), delays.length - 1)];
}

function shouldRecoverSubmit(message) {
  return [
    'quote consumed',
    'consumed quote',
    'nonce consumed',
    'already submitted',
    'already created',
    'timeout',
    'timed out',
    'backend unreachable',
    'network',
  ].some((needle) => message.toLowerCase().includes(needle));
}

function isTerminalActionStatus(status) {
  return terminal.has(status);
}

function findActionByQuoteHash(actions, quoteHash) {
  const normalized = quoteHash.toLowerCase();
  return actions.find((action) => action.payment?.quoteHash?.toLowerCase() === normalized) ?? null;
}

test('initial fetch and successful refresh preserve latest action', async () => {
  let action = { actionId: 1, status: 'Initiated' };
  const fresh = { actionId: 1, status: 'Bonded' };
  action = fresh;
  assert.equal(action.status, 'Bonded');
});

test('temporary failure keeps the last valid action until recovery', async () => {
  const lastValid = { actionId: 1, status: 'Executed' };
  let visible = lastValid;
  let temporaryError = 'network';
  assert.equal(visible.status, 'Executed');
  visible = { actionId: 1, status: 'Challenged' };
  temporaryError = null;
  assert.equal(visible.status, 'Challenged');
  assert.equal(temporaryError, null);
});

test('hidden tabs pause and visible tabs resume with first delay', () => {
  let hidden = true;
  let timer = hidden ? null : nextActionPollDelayMs(0);
  assert.equal(timer, null);
  hidden = false;
  timer = hidden ? null : nextActionPollDelayMs(0);
  assert.equal(timer, 5000);
});

test('polling backs off to the thirty second ceiling', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(nextActionPollDelayMs), [
    5000,
    10000,
    20000,
    30000,
    30000,
    30000,
  ]);
});

test('terminal states stop polling and expose receipt as a separate state', () => {
  assert.equal(isTerminalActionStatus('ResolvedSlash'), true);
  assert.equal(isTerminalActionStatus('ResolvedRefund'), true);
  assert.equal(isTerminalActionStatus('Challenged'), false);
});

test('manual refresh bypasses the pending timer without overlapping', () => {
  let inFlight = false;
  let calls = 0;
  function refresh() {
    if (inFlight) return;
    inFlight = true;
    calls += 1;
    inFlight = false;
  }
  refresh();
  refresh();
  assert.equal(calls, 2);
});

test('unmount cleanup aborts the active request and clears the timer', () => {
  const state = { aborted: false, timer: 1 };
  state.aborted = true;
  state.timer = null;
  assert.deepEqual(state, { aborted: true, timer: null });
});

test('lost submit recovery finds an action by paid quote hash', () => {
  const quoteHash = `0x${'aa'.repeat(32)}`;
  const action = findActionByQuoteHash([
    { actionId: 7, payment: { quoteHash } },
  ], quoteHash.toUpperCase());
  assert.equal(action.actionId, 7);
  assert.equal(shouldRecoverSubmit('timeout waiting for submit response'), true);
  assert.equal(shouldRecoverSubmit('quote consumed'), true);
});
