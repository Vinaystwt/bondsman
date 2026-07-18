import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ActionRecord, Repository } from '../db/repositories.js';

export interface PortableReceipt {
  protocol: 'bondsman';
  version: '1';
  network: 'casper-test';
  actionId: string;
  controller: string;
  actor: string;
  actorRole: 'approver';
  actionType: 'invoice_payout';
  faultClass: string;
  principal: string;
  bond: string;
  outcome: 'SLASHED' | 'REFUNDED';
  faultCode: string | null;
  challenger: string | null;
  challengerType: string | null;
  challengerReward: string;
  reserveCredit: string;
  reputationDelta: number;
  deployHashes: Record<string, string>;
  evidenceRoot: string | null;
  modelReasoningHash: string;
  modelReasoningText: string;
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

export async function issueReceipt(input: {
  repositoryPath: string;
  repository: Repository;
  actionId: number;
  controllerHash: string;
}): Promise<PortableReceipt | undefined> {
  const cached = input.repository.receipt(input.controllerHash, input.actionId);
  if (cached) return cached as PortableReceipt;
  const action = input.repository.action(input.actionId);
  if (!action || action.controllerHash !== input.controllerHash || !terminal(action)) return undefined;
  const { key, publicKey } = await signer(input.repositoryPath);
  const slashed = action.status === 'ResolvedSlash';
  const reward = slashed ? BigInt(action.bondPosted) / 2n : 0n;
  const receipt: PortableReceipt = {
    protocol: 'bondsman', version: '1', network: 'casper-test', actionId: String(action.actionId),
    controller: input.controllerHash, actor: action.agent, actorRole: 'approver', actionType: 'invoice_payout',
    faultClass: action.faultClass ?? 'duplicate_claim', principal: action.amount, bond: action.bondPosted,
    outcome: slashed ? 'SLASHED' : 'REFUNDED',
    faultCode: slashed
      ? action.faultClass === 'delivery_contradiction' ? 'DELIVERY_CONTRADICTION_VERIFIED' : 'DUPLICATE_CLAIM_VERIFIED'
      : null,
    challenger: action.challenger, challengerType: action.challengerType ?? null,
    challengerReward: reward.toString(), reserveCredit: (slashed ? BigInt(action.bondPosted) - reward : 0n).toString(),
    reputationDelta: slashed ? -50 : 10, deployHashes: action.transactions,
    evidenceRoot: action.evidenceRoot ?? null, modelReasoningHash: action.reasoningHash,
    modelReasoningText: action.reasoning, issuedAt: new Date().toISOString(), signerPublicKey: publicKey, signature: '',
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
