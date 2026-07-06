import type { ActionRecord } from '../db/repositories.js';

export function isChallengeEligible(
  action: ActionRecord,
  controllerHash: string,
  nowMs: number = Date.now(),
): boolean {
  return (
    action.controllerHash === controllerHash &&
    action.status === 'Executed' &&
    action.challenger === null &&
    action.windowEnd > nowMs &&
    action.duplicateProven === true
  );
}

export function challengeIneligibilityCode(
  action: ActionRecord | undefined,
  controllerHash: string,
  nowMs: number = Date.now(),
): string {
  if (!action) return 'NO_ELIGIBLE_ACTION';
  if (action.controllerHash !== controllerHash) {
    return 'STALE_CONTRACT_VERSION';
  }
  if (action.challenger !== null) return 'ALREADY_CHALLENGED';
  if (action.windowEnd <= nowMs) return 'CHALLENGE_WINDOW_CLOSED';
  if (action.status !== 'Executed' || !action.duplicateProven) {
    return 'NOT_EXECUTABLE';
  }
  return 'NO_ELIGIBLE_ACTION';
}
