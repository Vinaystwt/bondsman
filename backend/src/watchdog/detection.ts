import type { ActionRecord } from '../db/repositories.js';

const PAID_STATUSES = new Set([
  'Executed',
  'Challenged',
  'ResolvedRefund',
  'ResolvedSlash',
]);

export function detectDuplicateActions(
  actions: ActionRecord[],
  nowMs: number,
): ActionRecord[] {
  const seen = new Set<string>();
  const duplicates: ActionRecord[] = [];
  for (const action of [...actions].sort(
    (left, right) => left.actionId - right.actionId,
  )) {
    if (!PAID_STATUSES.has(action.status)) continue;
    const duplicate = seen.has(action.claimHash);
    if (
      duplicate &&
      action.status === 'Executed' &&
      action.windowEnd >= nowMs &&
      !action.reservedForManual &&
      action.challenger === null
    ) {
      duplicates.push(action);
    }
    seen.add(action.claimHash);
  }
  return duplicates;
}
