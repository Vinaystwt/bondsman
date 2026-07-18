import type { ActionRecord, DeliveryAttestationRecord, Repository } from '../db/repositories.js';

function explorer(hash: string | undefined): string | null {
  return hash && /^[0-9a-f]{64}$/.test(hash)
    ? `https://testnet.cspr.live/transaction/${hash}`
    : null;
}

function role(action: ActionRecord): string {
  return action.challengerType === 'watchdog' ? 'deterministic' : 'model-driven';
}

export function completed(action: ActionRecord): boolean {
  return action.status === 'ResolvedSlash' || action.status === 'ResolvedRefund';
}

export function buildProof(
  repository: Repository,
  action: ActionRecord,
  controllerHash: string,
): Record<string, unknown> {
  const attestation = repository.deliveryAttestationForAction(action.actionId);
  const slashed = action.status === 'ResolvedSlash';
  const challengerReward = slashed ? (BigInt(action.bondPosted) / 2n).toString() : '0';
  const reserveCredit = slashed ? (BigInt(action.bondPosted) - BigInt(challengerReward)).toString() : '0';
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
      verificationDetails: action.duplicateProven ? 'Paid claim registry confirmed the collision.' : 'No fault was confirmed before the window expired.',
    },
    modelReasoning: { text: action.reasoning, commitHash: action.reasoningHash, verifiedMatches: Boolean(action.reasoning) },
    economicImpact: {
      challengerReward, reserveCredit, totalReserveAfter: repository.reserve(),
      reputationAfter: reputation?.score ?? null,
    },
    receiptUrl: `/api/receipt/${action.actionId}`,
    cachedAt: new Date().toISOString(),
  };
}

export function proofFor(
  repository: Repository, actionId: number, controllerHash: string,
): Record<string, unknown> | undefined {
  const action = repository.action(actionId);
  if (!action || action.controllerHash !== controllerHash || !completed(action)) return undefined;
  const cached = repository.proof(controllerHash, actionId);
  if (cached) return cached as Record<string, unknown>;
  const proof = buildProof(repository, action, controllerHash);
  repository.cacheProof(controllerHash, actionId, proof);
  return proof;
}

export function cacheCompletedProofs(repository: Repository, controllerHash: string): void {
  for (const action of repository.listActions()) {
    if (action.controllerHash === controllerHash && completed(action)) {
      repository.cacheProof(controllerHash, action.actionId, buildProof(repository, action, controllerHash));
    }
  }
}

export function featuredProofs(repository: Repository, controllerHash: string): Record<string, unknown>[] {
  const actions = repository.listActions()
    .filter((action) => action.controllerHash === controllerHash && completed(action))
    .sort((a, b) => b.actionId - a.actionId);
  const picks: ActionRecord[] = [];
  const pick = (predicate: (action: ActionRecord) => boolean) => {
    const value = actions.find((action) => !picks.includes(action) && predicate(action));
    if (value) picks.push(value);
  };
  pick((a) => a.status === 'ResolvedSlash' && a.faultClass === 'duplicate_claim');
  pick((a) => a.status === 'ResolvedSlash' && a.faultClass === 'delivery_contradiction');
  pick((a) => a.status === 'ResolvedRefund');
  pick((a) => a.challengerType === 'watchdog');
  pick((a) => a.challengeSigning === 'external-wallet');
  return picks.map((action) => proofFor(repository, action.actionId, controllerHash)!).filter(Boolean);
}
