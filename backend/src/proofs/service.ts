import type { ActionRecord, DeliveryAttestationRecord, Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import {
  actionEconomics,
  deliveryAttestationSection,
  explorer,
  paidQuoteSection,
  paymentSection,
  reasoningCommitment,
} from '../evidence/canonical.js';

const PROOF_SCHEMA_VERSION = 3;

function role(action: ActionRecord): string {
  return action.challengerType === 'watchdog' ? 'deterministic' : 'model-driven';
}

function verificationDetails(action: ActionRecord, attestation?: DeliveryAttestationRecord): string {
  if (action.faultClass === 'delivery_contradiction') {
    return action.status === 'ResolvedSlash' && (action.evidenceRoot || attestation)
      ? 'Signed delivery contradiction evidence was verified on chain.'
      : 'No delivery contradiction was confirmed before the window expired.';
  }
  return action.duplicateProven
    ? 'Paid claim registry confirmed the collision.'
    : 'No duplicate claim was confirmed before the window expired.';
}

export function completed(action: ActionRecord): boolean {
  return action.status === 'ResolvedSlash' || action.status === 'ResolvedRefund';
}

export function buildProof(
  repository: Repository,
  action: ActionRecord,
  controllerHash: string,
  deployment: Deployment,
): Record<string, unknown> {
  const attestation = repository.deliveryAttestationForAction(action.actionId);
  const paidQuote = repository.paidQuoteForAction(action.actionId);
  const slashed = action.status === 'ResolvedSlash';
  const economics = actionEconomics(repository, action);
  const timeline: Record<string, unknown>[] = [
    { stage: 'initiate', transaction: 'initiate', actor: 'approver' },
    { stage: 'bond_posted', transaction: 'postBond', actor: 'approver' },
    { stage: 'execute', transaction: 'execute', actor: 'approver' },
  ].map(({ stage, transaction, actor }) => ({
    stage, at: null, actor,
    txHash: action.transactions[transaction] ?? null,
    explorerUrl: explorer(action.transactions[transaction]),
  }));
  if (attestation) timeline.push({
    stage: 'evidence_arrived', at: new Date(attestation.receivedAt).toISOString(),
    actor: 'buyer_signer', signature: attestation.signature, payload: attestation.payload,
  });
  if (action.transactions.challenge) timeline.push({
    stage: 'challenge', at: null, actor: action.challengerType ?? 'challenger',
    txHash: action.transactions.challenge, explorerUrl: explorer(action.transactions.challenge),
  });
  if (action.transactions.resolve) timeline.push({
    stage: 'resolve', at: null, actor: action.challengerType ?? 'resolver',
    txHash: action.transactions.resolve, explorerUrl: explorer(action.transactions.resolve),
    outcome: slashed ? 'SLASHED' : 'REFUNDED',
  });
  const reputation = repository.reputation(action.agent);
  return {
    proofSchemaVersion: PROOF_SCHEMA_VERSION,
    actionId: String(action.actionId), controller: controllerHash,
    outcome: slashed ? 'SLASHED' : 'REFUNDED',
    faultClass: action.faultClass ?? 'duplicate_claim',
    oneLine: slashed
      ? `Approver bond was slashed after ${action.faultClass ?? 'duplicate claim'} verification.`
      : 'Challenge window closed cleanly and the approver bond was refunded.',
    timeline,
    participants: {
      approver: { account: action.agent, role: 'model-driven' },
      challenger: action.challenger ? { account: action.challenger, role: role(action) } : null,
    },
    valueAtRisk: action.amount, bond: action.bondPosted,
    faultCondition: {
      class: action.faultClass ?? 'duplicate_claim',
      verifierModule: action.faultClass === 'delivery_contradiction' ? 'delivery-contradiction' : 'duplicate-claim',
      evidenceRoot: action.evidenceRoot ?? attestation?.evidenceRoot ?? null,
      verificationDetails: verificationDetails(action, attestation),
    },
    payment: paymentSection(deployment, paidQuote),
    paidQuote: paidQuoteSection(paidQuote),
    deliveryAttestation: deliveryAttestationSection(attestation),
    modelReasoning: reasoningCommitment(action),
    economicImpact: {
      challengerReward: economics.challengerReward,
      challengerRewardSource: economics.challengerRewardSource,
      reserveCredit: economics.reserveCredit,
      reserveCreditSource: economics.reserveCreditSource,
      currentReserveSnapshot: economics.currentReserveSnapshot,
      reputationBefore: economics.reputationBefore,
      reputationDelta: economics.reputationDelta,
      reputationDeltaSource: economics.reputationDeltaSource,
      reputationAfter: reputation?.score ?? economics.reputationAfter,
      resolutionEventTransaction: economics.resolutionEventTransaction,
      resolutionEventExplorerUrl: economics.resolutionEventExplorerUrl,
    },
    receiptUrl: `/api/receipt/${action.actionId}`,
    cachedAt: new Date().toISOString(),
  };
}

export function proofFor(
  repository: Repository,
  actionId: number,
  controllerHash: string,
  deployment: Deployment,
): Record<string, unknown> | undefined {
  const action = repository.action(actionId);
  if (!action || action.controllerHash !== controllerHash || !completed(action)) return undefined;
  const cached = repository.proof(controllerHash, actionId);
  if (
    cached &&
    typeof cached === 'object' &&
    (cached as Record<string, unknown>).proofSchemaVersion === PROOF_SCHEMA_VERSION
  ) {
    return cached as Record<string, unknown>;
  }
  const proof = buildProof(repository, action, controllerHash, deployment);
  repository.cacheProof(controllerHash, actionId, proof);
  return proof;
}

export function cacheCompletedProofs(
  repository: Repository,
  controllerHash: string,
  deployment: Deployment,
): void {
  for (const action of repository.listActions()) {
    if (action.controllerHash === controllerHash && completed(action)) {
      repository.cacheProof(
        controllerHash,
        action.actionId,
        buildProof(repository, action, controllerHash, deployment),
      );
    }
  }
}

export function featuredProofs(
  repository: Repository,
  controllerHash: string,
  deployment: Deployment,
): Record<string, unknown>[] {
  const actions = repository.listActions()
    .filter((action) => action.controllerHash === controllerHash && completed(action))
    .sort((a, b) => b.actionId - a.actionId);
  const picks: ActionRecord[] = [];
  const pick = (predicate: (action: ActionRecord) => boolean) => {
    const value = actions.find((action) => !picks.includes(action) && predicate(action));
    if (value) picks.push(value);
  };
  pick((a) =>
    a.status === 'ResolvedSlash' &&
    a.faultClass === 'delivery_contradiction' &&
    a.challengerType === 'watchdog' &&
    repository.paidQuoteForAction(a.actionId)?.status === 'consumed',
  );
  pick((a) => a.status === 'ResolvedSlash' && a.faultClass === 'duplicate_claim');
  pick((a) => a.status === 'ResolvedSlash' && a.faultClass === 'delivery_contradiction');
  pick((a) => a.status === 'ResolvedRefund');
  pick((a) => a.challengerType === 'watchdog');
  pick((a) => a.challengeSigning === 'external-wallet');
  return picks
    .map((action) => proofFor(repository, action.actionId, controllerHash, deployment)!)
    .filter(Boolean);
}

export function canonicalProof(
  repository: Repository,
  controllerHash: string,
  deployment: Deployment,
): Record<string, unknown> | undefined {
  const configured = Number(process.env.CANONICAL_ACTION_ID ?? 27);
  if (!Number.isInteger(configured) || configured < 0) return undefined;
  const action = repository.action(configured);
  const quote = repository.paidQuoteForAction(configured);
  if (
    !action ||
    action.controllerHash !== controllerHash ||
    action.status !== 'ResolvedSlash' ||
    action.faultClass !== 'delivery_contradiction' ||
    action.challengerType !== 'watchdog' ||
    quote?.status !== 'consumed' ||
    quote.consumedActionId !== configured
  ) {
    return undefined;
  }
  return proofFor(repository, configured, controllerHash, deployment);
}
