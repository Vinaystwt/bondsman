import type { Repository } from '../db/repositories.js';
import { actionDetail } from './action-detail.js';

export const READY_CASE_MIN_REMAINING_MS = 10 * 60 * 1000;

export function isReadyDemoCase(
  action: ReturnType<Repository['listActions']>[number],
  controllerHash: string,
  now: number = Date.now(),
  minRemainingMs: number = READY_CASE_MIN_REMAINING_MS,
): boolean {
  return (
    action.controllerHash === controllerHash &&
    action.status === 'Executed' &&
    action.challenger === null &&
    action.duplicateProven === true &&
    action.reservedForManual === true &&
    action.windowEnd - now >= minRemainingMs
  );
}

export function demoReadyCases(
  repository: Repository,
  controllerHash: string,
  now: number = Date.now(),
  minRemainingMs: number = READY_CASE_MIN_REMAINING_MS,
) {
  return repository
    .listActions()
    .filter((action) =>
      isReadyDemoCase(action, controllerHash, now, minRemainingMs),
    )
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
        minRemainingMs,
        safeToChallengeNow: true,
      };
    });
}

export function readyDemoCaseCount(
  repository: Repository,
  controllerHash: string,
  now: number = Date.now(),
  minRemainingMs: number = READY_CASE_MIN_REMAINING_MS,
): number {
  return repository
    .listActions()
    .filter((action) =>
      isReadyDemoCase(action, controllerHash, now, minRemainingMs),
    ).length;
}

export function demoReadyResponse(
  repository: Repository,
  controllerHash: string,
  now: number = Date.now(),
  minRemainingMs: number = READY_CASE_MIN_REMAINING_MS,
) {
  const cases = demoReadyCases(
    repository,
    controllerHash,
    now,
    minRemainingMs,
  );
  if (cases.length === 0) {
    return {
      success: false as const,
      code: 'NO_READY_CASE',
      message: 'No challengeable case is ready yet.',
      nextStep: 'Run npm run demo:prearm or request a fresh case.',
      cases,
      count: 0,
      minRemainingMs,
    };
  }
  return {
    success: true as const,
    count: cases.length,
    minRemainingMs,
    best: cases[0],
    cases,
  };
}
