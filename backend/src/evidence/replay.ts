import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import { proofFor } from '../proofs/service.js';
import {
  issueReceipt,
  verifyReceipt,
  type PortableReceipt,
} from '../receipts/service.js';

export const CANONICAL_REPLAY_SCHEMA_ID = 'bondsman.canonical-replay.v1';
export const CANONICAL_BUNDLE_SCHEMA_ID = 'bondsman.canonical-action-bundle.v1';

export function canonicalActionId(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.CANONICAL_ACTION_ID ?? 27);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 27;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value), null, 2);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortValue(child)]),
  );
}

export function checksum(value: unknown): string {
  return `0x${createHash('blake2b512')
    .update(stableJson(value))
    .digest('hex')
    .slice(0, 64)}`;
}

export function evidenceLabels() {
  return {
    quoteProbe: 'LIVE_REQUEST',
    payment: 'REAL_HISTORICAL_TRANSACTION',
    quote: 'REAL_HISTORICAL_TRANSACTION',
    action: 'CANONICAL_REPLAY',
    deliveryInput: 'CONTROLLED_TESTNET_FIXTURE',
    challenge: 'REAL_HISTORICAL_TRANSACTION',
    receipt: 'SIGNED_PORTABLE_EVIDENCE',
  };
}

export interface CanonicalValidation {
  ready: boolean;
  actionId: number;
  errors: string[];
}

export async function validateCanonical(input: {
  repositoryPath: string;
  repository: Repository;
  deployment: Deployment;
  controllerHash: string;
  actionId?: number;
}): Promise<CanonicalValidation> {
  const actionId = input.actionId ?? canonicalActionId();
  const action = input.repository.action(actionId);
  const quote = input.repository.paidQuoteForAction(actionId);
  const receipt = await issueReceipt({
    repositoryPath: input.repositoryPath,
    repository: input.repository,
    actionId,
    controllerHash: input.controllerHash,
    deployment: input.deployment,
  });
  const errors = [
    !action ? 'action missing' : null,
    action && action.controllerHash !== input.controllerHash ? 'wrong controller' : null,
    action && action.status !== 'ResolvedSlash' ? 'action is not ResolvedSlash' : null,
    action && action.faultClass !== 'delivery_contradiction' ? 'faultClass is not delivery_contradiction' : null,
    action && action.challengerType !== 'watchdog' ? 'challengerType is not watchdog' : null,
    !quote ? 'paid quote missing' : null,
    quote && quote.status !== 'consumed' ? 'paid quote is not consumed' : null,
    quote && quote.consumedActionId !== actionId ? 'paid quote consumedActionId mismatch' : null,
    quote && !quote.settlementTx ? 'settlement transaction missing' : null,
    action && !action.transactions.challenge ? 'challenge transaction missing' : null,
    action && !action.transactions.resolve ? 'resolution transaction missing' : null,
    !receipt ? 'receipt missing' : null,
    receipt && !verifyReceipt(receipt).valid ? 'receipt verification failed' : null,
  ].filter((error): error is string => Boolean(error));
  return { ready: errors.length === 0, actionId, errors };
}

export function quoteReplayCheck(input: {
  repository: Repository;
  actionId?: number;
}) {
  const actionId = input.actionId ?? canonicalActionId();
  const quote = input.repository.paidQuoteForAction(actionId);
  if (!quote) {
    return {
      success: false,
      actionId,
      code: 'CANONICAL_QUOTE_NOT_FOUND',
      message: 'canonical paid quote was not found',
    };
  }
  const consumed = quote.status === 'consumed' &&
    quote.consumedActionId === actionId;
  return {
    success: true,
    actionId,
    quoteHash: quote.quoteHash,
    status: quote.status,
    payerBound: Boolean(quote.payer),
    consumedActionId: quote.consumedActionId,
    singleUse: consumed,
    wouldAcceptNewSubmission: false,
    expectedRejectionCode: consumed
      ? 'QUOTE_ALREADY_CONSUMED'
      : 'QUOTE_NOT_CONSUMED_BY_CANONICAL_ACTION',
    explanation: consumed
      ? `The paid quote is already bound to and consumed by Action ${actionId}.`
      : 'The canonical quote is not in the expected consumed state.',
  };
}

export async function canonicalReplay(input: {
  repositoryPath: string;
  repository: Repository;
  deployment: Deployment;
  controllerHash: string;
}) {
  const actionId = canonicalActionId();
  const validation = await validateCanonical({ ...input, actionId });
  const action = input.repository.action(actionId);
  if (!action) return committedBundle(input.repositoryPath);
  if (!validation.ready) {
    return {
      schemaId: CANONICAL_REPLAY_SCHEMA_ID,
      mode: 'canonical_replay',
      actionId,
      source: 'live_projection',
      liveProjectionAvailable: true,
      generatedAt: new Date().toISOString(),
      ready: false,
      errors: validation.errors,
    };
  }
  const proof = proofFor(
    input.repository,
    actionId,
    input.controllerHash,
    input.deployment,
  )!;
  const receipt = await issueReceipt({
    repositoryPath: input.repositoryPath,
    repository: input.repository,
    actionId,
    controllerHash: input.controllerHash,
    deployment: input.deployment,
  }) as PortableReceipt;
  const receiptVerification = verifyReceipt(receipt);
  const quote = input.repository.paidQuoteForAction(actionId)!;
  const attestation = input.repository.deliveryAttestationForAction(actionId);
  const checks = {
    paymentSettled: proof.payment && (proof.payment as { settled?: boolean }).settled === true,
    settlementTransactionPresent: Boolean(quote.settlementTx),
    quotePayerPresent: Boolean(quote.payer),
    quotePayerBound: receipt.payment?.payer === quote.payer,
    quoteStatus: quote.status,
    quoteConsumedActionId: quote.consumedActionId,
    quoteSingleUse: quote.status === 'consumed' && quote.consumedActionId === actionId,
    quoteReplayAllowed: false,
    reasoningCommitmentValid:
      (proof.modelReasoning as { verifiedMatches?: boolean }).verifiedMatches === true,
    deliveryAttestationValid:
      Boolean(attestation) && attestation?.usedActionId === actionId,
    watchdogChallengePresent: Boolean(action.transactions.challenge),
    slashResolutionPresent: Boolean(action.transactions.resolve),
    receiptValid: receiptVerification.valid,
  };
  return {
    schemaId: CANONICAL_REPLAY_SCHEMA_ID,
    mode: 'canonical_replay',
    actionId,
    source: 'live_projection',
    liveProjectionAvailable: true,
    generatedAt: new Date().toISOString(),
    evidenceLabels: evidenceLabels(),
    proof,
    receipt,
    receiptVerification,
    checks,
    interactions: {
      liveQuoteProbe: {
        method: 'POST',
        path: '/v1/actions/quote',
        mutatesWithoutPayment: false,
      },
      quoteReplayCheck: {
        method: 'POST',
        path: '/api/replay/canonical/quote-check',
        mutatesState: false,
      },
      receiptVerify: {
        method: 'POST',
        path: `/api/receipt/${actionId}/verify`,
        mutatesState: false,
      },
    },
  };
}

async function committedBundle(repositoryPath: string) {
  const raw = await readFile(
    join(repositoryPath, 'docs/CANONICAL_ACTION_27_BUNDLE.json'),
    'utf8',
  );
  const bundle = JSON.parse(raw) as Record<string, unknown>;
  return {
    schemaId: CANONICAL_REPLAY_SCHEMA_ID,
    mode: 'canonical_replay',
    actionId: bundle.actionId,
    source: 'committed_bundle',
    liveProjectionAvailable: false,
    generatedAt: new Date().toISOString(),
    evidenceLabels: bundle.evidenceLabels,
    proof: bundle.proof,
    receipt: bundle.receipt,
    receiptVerification: bundle.verification,
    checks: bundle.checks,
    bundleChecksum: bundle.checksum,
  };
}

export async function canonicalBundle(input: {
  repositoryPath: string;
  repository: Repository;
  deployment: Deployment;
  controllerHash: string;
}) {
  const actionId = canonicalActionId();
  const validation = await validateCanonical({ ...input, actionId });
  if (!validation.ready) {
    throw new Error(
      `canonical live projection is not ready: ${validation.errors.join('; ')}`,
    );
  }
  const replay = await canonicalReplay(input);
  if (replay.source !== 'live_projection') {
    throw new Error('canonical live projection is not available');
  }
  const quote = input.repository.paidQuoteForAction(actionId);
  const action = input.repository.action(actionId);
  const withoutChecksum = {
    schemaId: CANONICAL_BUNDLE_SCHEMA_ID,
    actionId,
    generatedAt: replay.generatedAt,
    evidenceLabels: evidenceLabels(),
    proof: replay.proof,
    receipt: replay.receipt,
    verification: replay.receiptVerification,
    checks: replay.checks,
    paidQuote: quote,
    settlementTransaction: quote?.settlementTx ?? null,
    challengeTransaction: action?.transactions.challenge ?? null,
    resolutionTransaction: action?.transactions.resolve ?? null,
  };
  return {
    ...withoutChecksum,
    checksum: checksum(withoutChecksum),
  };
}
