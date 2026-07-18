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
      signedPayload: 'Canonical JSON: actionId, invoiceId, eventType, occurredAt, nonce.',
      replayProtection: 'Evidence root may bind to one action only.',
    },
    example: {
      invoiceId: 7,
      actionId: 42,
      eventType: 'goods_not_received',
      occurredAt: 1785000000000,
      nonce: 'buyer-event-42',
    },
    limitation: 'The current controller suite cannot accept this fault class. A parallel controller suite is required before it may trigger a slash.',
  },
];

export function listVerifiers(): FaultVerifierSpec[] {
  return verifiers;
}

export function verifier(id: string): FaultVerifierSpec | undefined {
  return verifiers.find((candidate) => candidate.id === id);
}
