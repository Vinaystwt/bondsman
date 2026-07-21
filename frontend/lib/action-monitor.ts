import type { ActionDetail } from './types';

export const ACTION_POLL_DELAYS_MS = [5000, 10000, 20000, 30000] as const;
export const TERMINAL_ACTION_STATUSES = new Set(['ResolvedSlash', 'ResolvedRefund']);

export type ActionLifecycleName =
  | 'Initiated'
  | 'Bonded'
  | 'Executed'
  | 'Challenge window open'
  | 'Evidence received'
  | 'Challenged'
  | 'ResolvedSlash'
  | 'ResolvedRefund'
  | 'Receipt available';

export interface ActionLifecycleState {
  name: ActionLifecycleName;
  reached: boolean;
  active: boolean;
  detail: string;
}

export function nextActionPollDelayMs(attempt: number): number {
  const index = Math.min(
    Math.max(0, Math.floor(attempt)),
    ACTION_POLL_DELAYS_MS.length - 1,
  );
  return ACTION_POLL_DELAYS_MS[index]!;
}

export function isTerminalActionStatus(status: string): boolean {
  return TERMINAL_ACTION_STATUSES.has(status);
}

export function shouldRecoverSubmit(message: string): boolean {
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

function hasPositiveAtomic(value: string | null | undefined): boolean {
  try {
    return BigInt(value ?? '0') > 0n;
  } catch {
    return false;
  }
}

function hasTx(action: ActionDetail, names: string[]): boolean {
  return names.some((name) => Boolean(action.transactions[name]));
}

function hasEvidence(action: ActionDetail): boolean {
  if (action.evidenceRoot) return true;
  return action.events.some((event) => {
    const name = event.eventType.toLowerCase();
    return (
      name.includes('evidence') ||
      name.includes('delivery') ||
      name.includes('goods_not_received')
    );
  });
}

export function deriveActionLifecycleStates(
  action: ActionDetail,
  nowMs = Date.now(),
): ActionLifecycleState[] {
  const terminal = isTerminalActionStatus(action.status);
  const bonded =
    hasPositiveAtomic(action.bondPosted) ||
    hasTx(action, ['postBond', 'bond', 'approve']) ||
    ['Executed', 'Challenged', 'ResolvedSlash', 'ResolvedRefund'].includes(action.status);
  const executed =
    hasTx(action, ['execute']) ||
    ['Executed', 'Challenged', 'ResolvedSlash', 'ResolvedRefund'].includes(action.status);
  const challengeWindowOpen =
    action.status === 'Executed' &&
    Number.isFinite(action.windowEnd) &&
    action.windowEnd * 1000 > nowMs;
  const evidenceReceived = hasEvidence(action);
  const challenged =
    Boolean(action.challenger) ||
    hasTx(action, ['challenge']) ||
    action.status === 'Challenged' ||
    terminal;

  const active: ActionLifecycleName =
    action.receiptUrl
      ? 'Receipt available'
      : action.status === 'ResolvedSlash'
        ? 'ResolvedSlash'
        : action.status === 'ResolvedRefund'
          ? 'ResolvedRefund'
          : challenged
            ? 'Challenged'
            : evidenceReceived
              ? 'Evidence received'
              : challengeWindowOpen
                ? 'Challenge window open'
                : executed
                  ? 'Executed'
                  : bonded
                    ? 'Bonded'
                    : 'Initiated';

  const states: Array<[ActionLifecycleName, boolean, string]> = [
    ['Initiated', true, `Action ${action.actionId}`],
    ['Bonded', bonded, bonded ? 'Bond posted or later state observed' : 'Waiting for posted bond'],
    ['Executed', executed, executed ? 'Execution observed' : 'Waiting for execution'],
    [
      'Challenge window open',
      challengeWindowOpen,
      challengeWindowOpen ? 'Challenge window is currently open' : 'Only shown while executable state is fresh',
    ],
    [
      'Evidence received',
      evidenceReceived,
      evidenceReceived ? 'Objective evidence is present' : 'No objective evidence observed yet',
    ],
    ['Challenged', challenged, challenged ? 'Challenge path observed' : 'No challenge observed yet'],
    [
      'ResolvedSlash',
      action.status === 'ResolvedSlash',
      action.status === 'ResolvedSlash' ? 'Bond was slashed' : 'Not slashed',
    ],
    [
      'ResolvedRefund',
      action.status === 'ResolvedRefund',
      action.status === 'ResolvedRefund' ? 'Bond was refunded' : 'Not refunded',
    ],
    [
      'Receipt available',
      Boolean(action.receiptUrl),
      action.receiptUrl ? 'Portable receipt can be verified now' : 'Receipt not published yet',
    ],
  ];

  return states.map(([name, reached, detail]) => ({
    name,
    reached,
    active: name === active,
    detail,
  }));
}

export function findActionByQuoteHash(
  actions: ActionDetail[],
  quoteHash: string,
): ActionDetail | null {
  const normalized = quoteHash.toLowerCase();
  return (
    actions.find((action) => action.payment?.quoteHash?.toLowerCase() === normalized) ??
    null
  );
}
