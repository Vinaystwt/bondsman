import type {
  ActionRecord,
  DeliveryAttestationRecord,
} from '../db/repositories.js';

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
      action.duplicateProven === true &&
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

export interface DeliveryContradictionCandidate {
  action: ActionRecord;
  attestation: DeliveryAttestationRecord;
  evidence: Buffer;
}

export function detectDeliveryContradictions(
  actions: ActionRecord[],
  attestationForAction: (
    actionId: number,
  ) => DeliveryAttestationRecord | undefined,
  nowMs: number,
): DeliveryContradictionCandidate[] {
  const candidates: DeliveryContradictionCandidate[] = [];
  for (const action of [...actions].sort(
    (left, right) => left.actionId - right.actionId,
  )) {
    if (
      action.status !== 'Executed' ||
      action.windowEnd < nowMs ||
      action.reservedForManual ||
      action.challenger !== null
    ) {
      continue;
    }
    const attestation = attestationForAction(action.actionId);
    const evidenceHex = attestation?.payload.evidenceHex;
    if (
      !attestation ||
      (attestation.usedActionId !== null &&
        attestation.usedActionId !== action.actionId) ||
      typeof evidenceHex !== 'string' ||
      !/^[0-9a-f]{240}$/i.test(evidenceHex)
    ) {
      continue;
    }
    candidates.push({
      action,
      attestation,
      evidence: Buffer.from(evidenceHex, 'hex'),
    });
  }
  return candidates;
}
