import type {
  ActionRecord,
  DeliveryAttestationRecord,
  EventRecord,
  PaidQuoteRecord,
  Repository,
} from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import { blake2b256 } from '../agent/hashing.js';
import { x402Config } from '../verify/x402.js';

export function explorer(hash: string | null | undefined): string | null {
  return hash && /^[0-9a-f]{64}$/.test(hash)
    ? `https://testnet.cspr.live/transaction/${hash}`
    : null;
}

export function reasoningCommitment(action: ActionRecord) {
  const recomputedHash = blake2b256(action.reasoning).toString('hex');
  return {
    text: action.reasoning,
    commitHash: action.reasoningHash,
    recomputedHash,
    verifiedMatches: recomputedHash === action.reasoningHash,
  };
}

export function paymentSection(
  deployment: Deployment,
  quote?: PaidQuoteRecord,
) {
  if (!quote) return null;
  const config = x402Config(deployment);
  return {
    protocol: 'x402',
    scheme: 'exact',
    network: 'casper:casper-test',
    asset: 'WCSPR',
    assetPackage: config.asset,
    paymentAmount: quote.paymentAmount,
    payer: quote.payer,
    payTo: config.payTo,
    facilitator: quote.facilitator,
    settlementTransaction: quote.settlementTx,
    settlementExplorerUrl: explorer(quote.settlementTx),
    settled: quote.status === 'consumed',
  };
}

export function paidQuoteSection(quote?: PaidQuoteRecord) {
  if (!quote) return null;
  return {
    quoteHash: quote.quoteHash,
    actionType: quote.actionType,
    faultClass: quote.faultClass,
    verifier: quote.verifier,
    principalAmount: quote.amount,
    requiredBond: quote.requiredBond,
    challengeWindow: quote.challengeWindow,
    issuedAt: new Date(quote.createdAt).toISOString(),
    expiresAt: quote.quoteExpiry,
    consumedAt: quote.consumedAt === null
      ? null
      : new Date(quote.consumedAt).toISOString(),
    consumedActionId: quote.consumedActionId,
    status: quote.status,
  };
}

export function deliveryAttestationSection(
  attestation?: DeliveryAttestationRecord,
) {
  if (!attestation) return null;
  return {
    eventType: attestation.eventType,
    occurredAt: new Date(attestation.occurredAt).toISOString(),
    receivedAt: new Date(attestation.receivedAt).toISOString(),
    buyerPublicKey: attestation.buyerPublicKey,
    evidenceRoot: attestation.evidenceRoot,
    signatureVerified: true,
    usedActionId: attestation.usedActionId,
  };
}

function parseEventData(event: EventRecord): Record<string, unknown> {
  try {
    return JSON.parse(event.data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function slashEvent(repository: Repository, actionId: number): EventRecord | undefined {
  return repository.eventsForAction(actionId).find((event) =>
    event.eventType === 'ResolvedSlash' ||
    event.eventType === 'ResolvedSlashV2',
  );
}

export function actionEconomics(repository: Repository, action: ActionRecord) {
  const slashed = action.status === 'ResolvedSlash';
  const event = slashed ? slashEvent(repository, action.actionId) : undefined;
  const eventData = event ? parseEventData(event) : {};
  const derivedReward = slashed ? BigInt(action.bondPosted) / 2n : 0n;
  const chainReward =
    typeof eventData.challenger_amount === 'string'
      ? eventData.challenger_amount
      : null;
  const chainReserve =
    typeof eventData.reserve_amount === 'string'
      ? eventData.reserve_amount
      : null;
  const challengerReward = chainReward ?? derivedReward.toString();
  const reserveCredit = chainReserve ??
    (slashed ? (BigInt(action.bondPosted) - BigInt(challengerReward)).toString() : '0');
  const reputationDelta = slashed ? -50 : 10;
  const reputationAfter = repository.reputation(action.agent)?.score;
  return {
    challengerReward,
    challengerRewardSource: chainReward ? 'chain_event' : 'protocol_split',
    reserveCredit,
    reserveCreditSource: chainReserve ? 'chain_event' : 'protocol_split',
    currentReserveSnapshot: repository.reserve(),
    reputationDelta,
    reputationDeltaSource: 'protocol_rule',
    reputationBefore:
      typeof reputationAfter === 'number'
        ? reputationAfter - reputationDelta
        : null,
    reputationAfter:
      typeof reputationAfter === 'number' ? reputationAfter : null,
    resolutionEventTransaction: event?.transactionHash ?? null,
    resolutionEventExplorerUrl: explorer(event?.transactionHash),
  };
}
