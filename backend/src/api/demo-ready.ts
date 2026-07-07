import type { Repository } from '../db/repositories.js';
import { actionDetail } from './action-detail.js';

export const READY_CASE_MIN_REMAINING_MS = 10 * 60 * 1000;

export function isReadyDemoCase(
  action: ReturnType<Repository['listActions']>[number],
  controllerHash: string,
  now: number = Date.now(),
): boolean {
  return (
    action.controllerHash === controllerHash &&
    action.status === 'Executed' &&
    action.challenger === null &&
    action.duplicateProven === true &&
    action.reservedForManual === true &&
    action.windowEnd - now >= READY_CASE_MIN_REMAINING_MS
  );
}

export function demoReadyCases(
  repository: Repository,
  controllerHash: string,
  now: number = Date.now(),
) {
  return repository
    .listActions()
    .filter((action) => isReadyDemoCase(action, controllerHash, now))
    .sort(
      (left, right) =>
        Number(right.reservedForManual) -
          Number(left.reservedForManual) ||
        left.windowEnd - right.windowEnd ||
        left.actionId - right.actionId,
    )
    .map((action) => {
      const detail = actionDetail(repository, action.actionId)!;
      const remainingMs = Math.max(0, detail.windowEnd - now);
      return {
        ...detail,
        demo: true,
        remainingMs,
        minRemainingMs: READY_CASE_MIN_REMAINING_MS,
        safeToChallengeNow: true,
      };
    });
}

export function demoReadyResponse(
  repository: Repository,
  controllerHash: string,
  now: number = Date.now(),
) {
  const cases = demoReadyCases(repository, controllerHash, now);
  if (cases.length === 0) {
    return {
      success: false as const,
      code: 'NO_READY_CASE',
      message: 'No challengeable case is ready yet.',
      nextStep: 'Run npm run demo:prearm or request a fresh case.',
      cases,
      count: 0,
      minRemainingMs: READY_CASE_MIN_REMAINING_MS,
    };
  }
  return {
    success: true as const,
    count: cases.length,
    minRemainingMs: READY_CASE_MIN_REMAINING_MS,
    best: cases[0],
    cases,
  };
}
