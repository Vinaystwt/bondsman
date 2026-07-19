import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { ExactCasperScheme } from '@make-software/casper-x402/exact/client';
import { toClientCasperSigner } from '@make-software/casper-x402';
import type { Deployment } from '../shared/deployment.js';
import type { Repository } from '../db/repositories.js';
import { loadPrivateKey } from '../casper/keys.js';
import type { X402PaymentRequirements } from '../verify/x402.js';
import {
  canonicalDeliveryPayload,
  type DeliveryAttestationInput,
} from '../verifiers/delivery-attestation.js';

type Step = { name: string; status: number; detail: string };

export interface IntegratorRun {
  mode: 'real';
  steps: Step[];
  quote: Record<string, unknown> | null;
  transactionHashes: string[];
  receipt: Record<string, unknown> | null;
  limitation: string | null;
}

function decodePaymentRequirements(header: string | null, body: unknown) {
  if (header) {
    const decoded = JSON.parse(
      Buffer.from(header, 'base64').toString('utf8'),
    ) as { accepts?: X402PaymentRequirements[] };
    if (decoded.accepts?.[0]) return decoded.accepts[0];
  }
  const payment =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).payment
      : undefined;
  const accepts =
    payment && typeof payment === 'object'
      ? (payment as Record<string, unknown>).accepts
      : undefined;
  if (Array.isArray(accepts) && accepts[0]) {
    return accepts[0] as X402PaymentRequirements;
  }
  throw new Error('quote endpoint did not return payment requirements');
}

function txsFromAction(action: Record<string, unknown>): string[] {
  const transactions = action.transactions;
  if (!transactions || typeof transactions !== 'object') return [];
  return Object.values(transactions as Record<string, unknown>)
    .filter((value): value is string =>
      typeof value === 'string' && /^[0-9a-f]{64}$/.test(value),
    );
}

export async function runIntegrator(options: {
  baseUrl: string;
  deployment: Deployment;
  repository: Repository;
  repositoryPath?: string;
}): Promise<IntegratorRun> {
  const quoteEndpoint = new URL('/v1/actions/quote', options.baseUrl).toString();
  const steps: Step[] = [
    {
      name: 'discover_agent_card',
      status: 200,
      detail: `${new URL('/.well-known/agent.json', options.baseUrl)}`,
    },
  ];
  const first = await fetch(quoteEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      amount: '50000000000000',
      faultClass: 'delivery_contradiction',
    }),
  });
  const firstBody = await first.json() as Record<string, unknown>;
  steps.push({
    name: 'request_payment_requirements',
    status: first.status,
    detail: first.status === 402
      ? 'Real WCSPR payment requirements returned.'
      : 'Unexpected quote response before payment.',
  });
  const requirements = decodePaymentRequirements(
    first.headers.get('payment-required') ??
      first.headers.get('x-payment-required'),
    firstBody,
  );
  const privateKey = await loadPrivateKey(
    join(options.repositoryPath ?? process.cwd(), '.keys/integrator.pem'),
  );
  const signer = toClientCasperSigner(privateKey);
  const scheme = new ExactCasperScheme(signer);
  const payment = await scheme.createPaymentPayload(2, requirements);
  const paymentPayload = {
    ...payment,
    accepted: {
      scheme: requirements.scheme,
      network: requirements.network,
      asset: requirements.asset,
      amount: requirements.amount,
      payTo: requirements.payTo,
    },
    resource: {
      method: 'POST',
      url: quoteEndpoint,
      description: 'Bondsman bond quote',
    },
  };
  const { publicKey: buyerPublicKey, privateKey: buyerPrivateKey } =
    generateKeyPairSync('ed25519');
  const buyerPublicKeyRaw = Buffer.from(
    buyerPublicKey.export({ format: 'der', type: 'spki' }),
  ).subarray(-32).toString('base64');
  const paymentSignature = Buffer.from(
    JSON.stringify(paymentPayload),
  ).toString('base64');
  const paid = await fetch(quoteEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'payment-signature': paymentSignature,
    },
    body: JSON.stringify({
      amount: '50000000000000',
      faultClass: 'delivery_contradiction',
    }),
  });
  const quote = await paid.json() as Record<string, unknown>;
  steps.push({
    name: 'settle_wcspr_payment',
    status: paid.status,
    detail: paid.ok
      ? 'CSPR.cloud facilitator settled the WCSPR payment.'
      : String(quote.message ?? 'WCSPR payment was not settled.'),
  });
  if (!paid.ok) {
    const result: IntegratorRun = {
      mode: 'real',
      steps,
      quote,
      transactionHashes: [],
      receipt: null,
      limitation: String(
        quote.message ??
          'Integrator needs WCSPR before the quote can be paid.',
      ),
    };
    options.repository.setSystemState('integrator', {
      running: false,
      lastRun: new Date().toISOString(),
      mode: result.mode,
      limitation: result.limitation,
    });
    return result;
  }
  const receipt =
    quote.paymentReceipt && typeof quote.paymentReceipt === 'object'
      ? quote.paymentReceipt as Record<string, unknown>
      : null;
  const submit = await fetch(new URL('/v1/actions/submit', options.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      quoteHash: quote.quoteHash,
      faultClass: 'delivery_contradiction',
      buyerPublicKey: buyerPublicKeyRaw,
      eventType: 'goods_not_received',
    }),
  });
  const action = await submit.json() as Record<string, unknown>;
  steps.push({
    name: 'submit_bonded_action',
    status: submit.status,
    detail: submit.ok
      ? 'Paid quote consumed and delivery contradiction action submitted.'
      : String(action.message ?? 'Bonded action submission failed.'),
  });
  if (!submit.ok) {
    const result: IntegratorRun = {
      mode: 'real',
      steps,
      quote,
      transactionHashes:
        typeof receipt?.transaction === 'string' ? [receipt.transaction] : [],
      receipt,
      limitation: String(action.message ?? 'paid action submission failed'),
    };
    options.repository.setSystemState('integrator', {
      running: false,
      lastRun: new Date().toISOString(),
      mode: result.mode,
      limitation: result.limitation,
    });
    return result;
  }
  const actionBody = action.action && typeof action.action === 'object'
    ? action.action as Record<string, unknown>
    : action;
  const attestationDraft =
    actionBody.attestation && typeof actionBody.attestation === 'object'
      ? actionBody.attestation as Omit<DeliveryAttestationInput, 'signature'>
      : null;
  if (!attestationDraft) {
    throw new Error('paid action response did not include delivery attestation draft');
  }
  const attestationPayload = canonicalDeliveryPayload({
    ...attestationDraft,
    signature: 'placeholder',
  });
  const attestation: DeliveryAttestationInput = {
    ...attestationDraft,
    signature: sign(null, attestationPayload, buyerPrivateKey).toString('base64'),
  };
  const attested = await fetch(new URL('/api/delivery-attestation', options.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(attestation),
  });
  const attestedBody = await attested.json() as Record<string, unknown>;
  steps.push({
    name: 'post_delivery_attestation',
    status: attested.status,
    detail: attested.ok
      ? 'Buyer-signed delivery contradiction evidence posted for watchdog challenge.'
      : String(attestedBody.message ?? 'delivery attestation failed'),
  });
  const settlementTx =
    typeof receipt?.transaction === 'string' ? [receipt.transaction] : [];
  const result: IntegratorRun = {
    mode: 'real',
    steps,
    quote,
    transactionHashes: [...settlementTx, ...txsFromAction(actionBody)],
    receipt,
    limitation: attested.ok
      ? null
      : String(attestedBody.message ?? 'delivery attestation failed'),
  };
  options.repository.setSystemState('integrator', {
    running: false,
    lastRun: new Date().toISOString(),
    mode: result.mode,
    limitation: result.limitation,
  });
  return result;
}
