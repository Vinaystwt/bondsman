import type { Deployment } from '../shared/deployment.js';

export interface FaultVerifierSpec {
  id: 'duplicate_claim' | 'delivery_contradiction';
  title: string;
  onChain: boolean;
  schema: Record<string, unknown>;
  example: Record<string, unknown>;
  limitation?: string;
}

const verifiers: FaultVerifierSpec[] = [
  {
    id: 'duplicate_claim',
    title: 'Duplicate claim verifier',
    onChain: true,
    schema: {
      required: ['actionId'],
      verification: 'The InvoicePool paid-claim registry contains the action claim hash.',
    },
    example: { actionId: 42, claimHash: 'blake2b-256 debtor plus invoice number' },
  },
  {
    id: 'delivery_contradiction',
    title: 'Delivery contradiction verifier',
    onChain: false,
    schema: {
      required: ['invoiceId', 'actionId', 'eventType', 'occurredAt', 'buyerPublicKey', 'signature'],
      eventTypes: ['delivery_rejected', 'goods_not_received'],
      signedPayload: 'Binary verifier payload: actionId u64 LE, invoiceId u64 LE, occurredAt u64 LE, nonce bytes32.',
      evidence: 'The on-chain verifier receives the 56-byte signed payload plus a 64-byte Ed25519 signature.',
      buyerPublicKey: 'Base64 SPKI Ed25519 public key or base64 raw 32-byte Ed25519 public key.',
      replayProtection: 'Evidence root may bind to one action only.',
    },
    example: {
      invoiceId: 7,
      actionId: 42,
      eventType: 'goods_not_received',
      occurredAt: 1785000000000,
      nonce: '64 hex characters, or an arbitrary nonce hashed to bytes32',
    },
    limitation: 'The current controller suite cannot accept this fault class. A parallel controller suite is required before it may trigger a slash.',
  },
];

export function listVerifiers(deployment?: Deployment): FaultVerifierSpec[] {
  if (deployment?.current !== 'v2') return verifiers;
  return verifiers.map((candidate) => {
    if (candidate.id !== 'delivery_contradiction') return candidate;
    const { limitation: _limitation, ...rest } = candidate;
    return { ...rest, onChain: true };
  });
}

export function verifier(
  id: string,
  deployment?: Deployment,
): FaultVerifierSpec | undefined {
  return listVerifiers(deployment).find(
    (candidate) => candidate.id === id,
  );
}
