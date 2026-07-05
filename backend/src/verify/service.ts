import type { Repository } from '../db/repositories.js';

const PAID_STATUSES = new Set([
  'Executed',
  'Challenged',
  'ResolvedRefund',
  'ResolvedSlash',
]);

export type VerificationInput =
  | { claimHash: string }
  | { actionId: number };

export function verifyClaimCollision(
  repository: Repository,
  input: VerificationInput,
) {
  const actions = repository.listActions();
  let claimHash: string;
  let beforeActionId = Number.POSITIVE_INFINITY;
  if ('actionId' in input) {
    const action = repository.action(input.actionId);
    if (!action) throw new Error('action not found');
    claimHash = action.claimHash;
    beforeActionId = action.actionId;
  } else {
    claimHash = input.claimHash;
  }
  const matchingActionIds = actions
    .filter(
      (action) =>
        action.claimHash === claimHash &&
        action.actionId < beforeActionId &&
        PAID_STATUSES.has(action.status),
    )
    .map((action) => action.actionId);
  return {
    claimHash,
    collidesWithPaidClaim: matchingActionIds.length > 0,
    matchingActionIds,
  };
}
