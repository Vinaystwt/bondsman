import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ActionRecord, Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import {
  actionEconomics,
  deliveryAttestationSection,
  paidQuoteSection,
  paymentSection,
  reasoningCommitment,
} from '../evidence/canonical.js';
import {
  bondEconomicRelation,
  type BondEconomicRelation,
} from '../evidence/bond-economics.js';

const RECEIPT_SCHEMA_ID = 'bondsman.portable-receipt.golden-path.v3';

export interface PortableReceipt {
  protocol: 'bondsman';
  version: '3';
  schemaId: typeof RECEIPT_SCHEMA_ID;
  network: 'casper-test';
  actionId: string;
  controller: string;
  actor: string;
  actorRole: 'approver';
  actionType: 'invoice_payout';
  verifier: string;
  faultClass: string;
  principal: string;
  bond: string;
  outcome: 'SLASHED' | 'REFUNDED';
  faultCode: string | null;
  challenger: string | null;
  challengerType: string | null;
  challengeSigning: string | null;
  watchdogChallengeTransaction: string | null;
  resolveTransaction: string | null;
  economics: {
    challengerReward: string;
    challengerRewardSource: string;
    reserveCredit: string;
    reserveCreditSource: string;
    currentReserveSnapshot: string;
    reputationBefore: number | null;
    reputationDelta: number;
    reputationDeltaSource: string;
    reputationAfter: number | null;
  };
  deployHashes: Record<string, string>;
  reasoningCommitment: ReturnType<typeof reasoningCommitment>;
  deliveryEvidence: ReturnType<typeof deliveryAttestationSection>;
  payment: ReturnType<typeof paymentSection>;
  paidQuote: ReturnType<typeof paidQuoteSection>;
  bondEconomics: BondEconomicRelation;
  issuedAt: string;
  signerPublicKey: string;
  signature: string;
}

function unsigned(receipt: PortableReceipt): Omit<PortableReceipt, 'signature'> {
  const { signature: _signature, ...value } = receipt;
  return value;
}

function canonical(value: Omit<PortableReceipt, 'signature'>): string {
  return JSON.stringify(value);
}

async function signer(repositoryPath: string) {
  const key = createPrivateKey(await readFile(join(repositoryPath, '.keys/receipt-signer.pem')));
  const publicKey = createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64');
  return { key, publicKey };
}

function terminal(action: ActionRecord): boolean {
  return action.status === 'ResolvedSlash' || action.status === 'ResolvedRefund';
}

function isCurrentReceipt(value: unknown): value is PortableReceipt {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).protocol === 'bondsman' &&
    (value as Record<string, unknown>).version === '3' &&
    (value as Record<string, unknown>).schemaId === RECEIPT_SCHEMA_ID,
  );
}

function verifierFor(action: ActionRecord): string {
  return action.faultClass === 'delivery_contradiction'
    ? 'delivery-contradiction-v2'
    : 'duplicate-claim-v2';
}

export async function issueReceipt(input: {
  repositoryPath: string;
  repository: Repository;
  actionId: number;
  controllerHash: string;
  deployment: Deployment;
}): Promise<PortableReceipt | undefined> {
  const cached = input.repository.receipt(input.controllerHash, input.actionId);
  if (isCurrentReceipt(cached)) return cached;
  const action = input.repository.action(input.actionId);
  if (!action || action.controllerHash !== input.controllerHash || !terminal(action)) return undefined;
  const { key, publicKey } = await signer(input.repositoryPath);
  const slashed = action.status === 'ResolvedSlash';
  const paidQuote = input.repository.paidQuoteForAction(action.actionId);
  const attestation = input.repository.deliveryAttestationForAction(action.actionId);
  const economics = actionEconomics(input.repository, action);
  const receipt: PortableReceipt = {
    protocol: 'bondsman',
    version: '3',
    schemaId: RECEIPT_SCHEMA_ID,
    network: 'casper-test',
    actionId: String(action.actionId),
    controller: input.controllerHash,
    actor: action.agent,
    actorRole: 'approver',
    actionType: 'invoice_payout',
    verifier: paidQuote?.verifier ?? verifierFor(action),
    faultClass: action.faultClass ?? 'duplicate_claim',
    principal: action.amount,
    bond: action.bondPosted,
    outcome: slashed ? 'SLASHED' : 'REFUNDED',
    faultCode: slashed
      ? action.faultClass === 'delivery_contradiction' ? 'DELIVERY_CONTRADICTION_VERIFIED' : 'DUPLICATE_CLAIM_VERIFIED'
      : null,
    challenger: action.challenger, challengerType: action.challengerType ?? null,
    challengeSigning: action.challengeSigning ?? null,
    watchdogChallengeTransaction: action.challengerType === 'watchdog'
      ? action.transactions.challenge ?? null
      : null,
    resolveTransaction: action.transactions.resolve ?? null,
    economics: {
      challengerReward: economics.challengerReward,
      challengerRewardSource: economics.challengerRewardSource,
      reserveCredit: economics.reserveCredit,
      reserveCreditSource: economics.reserveCreditSource,
      currentReserveSnapshot: economics.currentReserveSnapshot,
      reputationBefore: economics.reputationBefore,
      reputationDelta: economics.reputationDelta,
      reputationDeltaSource: economics.reputationDeltaSource,
      reputationAfter: economics.reputationAfter,
    },
    deployHashes: action.transactions,
    reasoningCommitment: reasoningCommitment(action),
    deliveryEvidence: deliveryAttestationSection(attestation),
    payment: paymentSection(input.deployment, paidQuote),
    paidQuote: paidQuoteSection(paidQuote, action.bondPosted),
    bondEconomics: bondEconomicRelation({
      quotedMinimumBond: paidQuote?.requiredBond,
      actualPostedBond: action.bondPosted,
    }),
    issuedAt: new Date().toISOString(),
    signerPublicKey: publicKey,
    signature: '',
  };
  receipt.signature = sign(null, Buffer.from(canonical(unsigned(receipt))), key).toString('base64');
  input.repository.cacheReceipt(input.controllerHash, input.actionId, receipt);
  return receipt;
}

export function verifyReceipt(receipt: PortableReceipt): { valid: boolean; reason?: string } {
  try {
    const publicKey = createPublicKey({ key: Buffer.from(receipt.signerPublicKey, 'base64'), type: 'spki', format: 'der' });
    const valid = verify(null, Buffer.from(canonical(unsigned(receipt))), publicKey, Buffer.from(receipt.signature, 'base64'));
    return valid ? { valid } : { valid, reason: 'signature verification failed' };
  } catch {
    return { valid: false, reason: 'receipt key or signature is malformed' };
  }
}
