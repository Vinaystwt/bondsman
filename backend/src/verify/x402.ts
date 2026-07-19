import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import { policyFor } from '../policy/engine.js';

const DEFAULT_WCSPR_PACKAGE =
  '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';
const DEFAULT_FACILITATOR_URL = 'https://x402-facilitator.cspr.cloud';
const DEFAULT_QUOTE_PRICE = '100000000';
const TOKEN_UNIT = 1_000_000_000n;

export interface X402PaymentRequirements {
  scheme: 'exact';
  network: 'casper:casper-test';
  payTo: string;
  amount: string;
  asset: string;
  extra: {
    name: string;
    symbol: string;
    version: string;
    decimals: string;
  };
  maxTimeoutSeconds: number;
}

export interface X402PaymentPayload {
  x402Version: number;
  accepted?: {
    scheme: string;
    network: string;
    asset?: string;
    amount?: string;
    payTo?: string;
  };
  payload: unknown;
  resource?: unknown;
}

interface SettleResponse {
  success: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
  errorReason?: string;
  errorMessage?: string;
}

interface PaymentAuthorization {
  from?: unknown;
  to?: unknown;
  value?: unknown;
  validAfter?: unknown;
  validBefore?: unknown;
  nonce?: unknown;
}

function payloadObject(payload: unknown): Record<string, unknown> | undefined {
  return payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : undefined;
}

export function x402Config(deployment: Deployment) {
  const payToHash =
    process.env.X402_PAY_TO_ACCOUNT_HASH?.trim() ||
    deployment.accounts.deployer.accountHash;
  return {
    enabled: (process.env.X402_REAL_ENABLED ?? 'true') !== 'false',
    facilitatorUrl:
      process.env.X402_FACILITATOR_URL?.trim() || DEFAULT_FACILITATOR_URL,
    facilitatorApiKey:
      process.env.X402_FACILITATOR_API_KEY?.trim() ||
      process.env.CSPR_CLOUD_API_KEY?.trim() ||
      '',
    asset:
      process.env.X402_WCSPR_PACKAGE?.trim().replace(/^hash-/, '') ||
      DEFAULT_WCSPR_PACKAGE,
    assetName: process.env.X402_WCSPR_NAME?.trim() || 'Wrapped CSPR',
    assetVersion: process.env.X402_WCSPR_VERSION?.trim() || '1',
    amount: process.env.X402_QUOTE_PRICE?.trim() || DEFAULT_QUOTE_PRICE,
    payTo: `00${payToHash.replace(/^account-hash-/, '')}`,
  };
}

export function quoteRequirements(
  deployment: Deployment,
): X402PaymentRequirements {
  const config = x402Config(deployment);
  return {
    scheme: 'exact',
    network: 'casper:casper-test',
    payTo: config.payTo,
    amount: config.amount,
    asset: config.asset,
    extra: {
      name: config.assetName,
      symbol: 'WCSPR',
      version: config.assetVersion,
      decimals: '9',
    },
    maxTimeoutSeconds: 900,
  };
}

export function paymentRequiredBody(requirements: X402PaymentRequirements) {
  return {
    x402Version: 2,
    accepts: [requirements],
    error: 'payment required',
  };
}

export function encodePaymentRequirements(
  requirements: X402PaymentRequirements,
): string {
  return Buffer.from(JSON.stringify(paymentRequiredBody(requirements))).toString(
    'base64',
  );
}

function paymentHeader(request: FastifyRequest): string | undefined {
  const paymentSignature = request.headers['payment-signature'];
  if (typeof paymentSignature === 'string') return paymentSignature;
  const xPayment = request.headers['x-payment'];
  return typeof xPayment === 'string' ? xPayment : undefined;
}

export function parsePaymentHeader(
  request: FastifyRequest,
  requirements: X402PaymentRequirements,
): X402PaymentPayload | null {
  const header = paymentHeader(request);
  if (!header) return null;
  let parsed: X402PaymentPayload;
  try {
    const source = header.trim().startsWith('{')
      ? header
      : Buffer.from(header, 'base64').toString('utf8');
    parsed = JSON.parse(source) as X402PaymentPayload;
  } catch {
    throw new Error('payment header is not valid base64 JSON');
  }
  return {
    ...parsed,
    accepted: parsed.accepted ?? {
      scheme: requirements.scheme,
      network: requirements.network,
      asset: requirements.asset,
      amount: requirements.amount,
      payTo: requirements.payTo,
    },
  };
}

export function x402Diagnostics(
  paymentPayload: X402PaymentPayload | null,
  requirements: X402PaymentRequirements,
) {
  const payload = payloadObject(paymentPayload?.payload);
  const authorization =
    payloadObject(payload?.authorization) as PaymentAuthorization | undefined;
  return {
    asset: requirements.asset,
    requiredAmount: requirements.amount,
    payer:
      typeof authorization?.from === 'string'
        ? authorization.from
        : null,
    authorizedAmount:
      typeof authorization?.value === 'string'
        ? authorization.value
        : null,
    payTo:
      typeof authorization?.to === 'string'
        ? authorization.to
        : requirements.payTo,
    validBefore:
      typeof authorization?.validBefore === 'string'
        ? authorization.validBefore
        : null,
  };
}

export function x402SettlementFailure(
  settlement: SettleResponse,
): { code: string; reason: string } {
  const message = [
    settlement.errorReason ?? 'settlement_failed',
    settlement.errorMessage,
  ].filter(Boolean).join(': ');
  if (/User error:\s*60001|InsufficientBalance/i.test(message)) {
    return {
      code: 'X402_INSUFFICIENT_WCSPR',
      reason: message ||
        'payer has insufficient WCSPR for the x402 settlement',
    };
  }
  return {
    code: 'X402_SETTLEMENT_FAILED',
    reason: message || 'x402 settlement failed',
  };
}

export function sendPaymentRequired(
  reply: FastifyReply,
  requirements: X402PaymentRequirements,
  reason = 'WCSPR payment is required for this quote',
  code = 'X402_PAYMENT_REQUIRED',
  diagnostics?: Record<string, unknown>,
) {
  return reply
    .code(402)
    .header('PAYMENT-REQUIRED', encodePaymentRequirements(requirements))
    .header('X-Payment-Required', encodePaymentRequirements(requirements))
    .send({
      success: false,
      code,
      message: reason,
      ...(diagnostics ? { diagnostics } : {}),
      payment: paymentRequiredBody(requirements),
    });
}

export async function settleX402Payment(options: {
  deployment: Deployment;
  paymentPayload: X402PaymentPayload;
  paymentRequirements: X402PaymentRequirements;
}): Promise<SettleResponse> {
  const config = x402Config(options.deployment);
  if (!config.enabled) {
    return {
      success: false,
      errorReason: 'x402_disabled',
      errorMessage: 'real x402 settlement is disabled by configuration',
    };
  }
  if (!config.facilitatorApiKey) {
    return {
      success: false,
      errorReason: 'missing_facilitator_key',
      errorMessage: 'CSPR_CLOUD_API_KEY or X402_FACILITATOR_API_KEY is required',
    };
  }
  const response = await fetch(new URL('/settle', config.facilitatorUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: config.facilitatorApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      paymentPayload: options.paymentPayload,
      paymentRequirements: options.paymentRequirements,
    }),
  });
  const text = await response.text();
  let body: SettleResponse;
  try {
    body = JSON.parse(text) as SettleResponse;
  } catch {
    body = {
      success: false,
      errorReason: `http_${response.status}`,
      errorMessage: text.slice(0, 500),
    };
  }
  if (!response.ok) {
    return {
      ...body,
      success: false,
      errorReason: body.errorReason ?? `http_${response.status}`,
      errorMessage: body.errorMessage ?? text.slice(0, 500),
    };
  }
  return body;
}

export function quoteResponse(options: {
  repository: Repository;
  deployment: Deployment;
  amount?: string;
  faultClass?: 'duplicate_claim' | 'delivery_contradiction';
  receipt: {
    amount: string;
    transaction: string;
    payer?: string;
    facilitator: string;
  };
}) {
  const amount = BigInt(options.amount ?? `${50_000n * TOKEN_UNIT}`);
  const faultClass = options.faultClass ?? 'delivery_contradiction';
  const agent = `account-hash-${options.deployment.accounts.agent.accountHash}`;
  const reputationRow = options.repository.reputation(agent);
  const reputation =
    typeof reputationRow?.score === 'number' ? reputationRow.score : -20;
  const policy = policyFor({
    amount: amount.toString(),
    faultClass,
    reputationScore: reputation,
  });
  const requiredBond = BigInt(policy.estimatedBond);
  const quoteExpiry = new Date(Date.now() + 15 * 60_000).toISOString();
  const quoteHash =
    `0x${createHash('blake2b512')
      .update(JSON.stringify({
        amount: amount.toString(),
        agent,
        requiredBond: requiredBond.toString(),
        receipt: options.receipt.transaction,
        faultClass,
      }))
      .digest('hex')
      .slice(0, 64)}`;
  const verifier = policy.verifier;
  const quote = {
    actionType: 'invoice_payout',
    faultClass,
    verifier,
    riskTier: policy.riskTier.toUpperCase(),
    requiredBond: requiredBond.toString(),
    challengeWindow: policy.challengeWindowSeconds,
    agentReputation: reputation,
    policyModule: verifier,
    quoteExpiry,
    quoteHash,
    paymentReceipt: {
      network: 'casper-test',
      asset: 'WCSPR',
      amount: options.receipt.amount,
      transaction: options.receipt.transaction,
      facilitator: options.receipt.facilitator,
      payer: options.receipt.payer ?? null,
      settled: true,
    },
  };
  options.repository.upsertPaidQuote({
    quoteHash,
    actionType: 'invoice_payout',
    faultClass,
    verifier,
    amount: amount.toString(),
    requiredBond: requiredBond.toString(),
    challengeWindow: policy.challengeWindowSeconds,
    quoteExpiry,
    payer: options.receipt.payer ?? null,
    settlementTx: options.receipt.transaction,
    paymentAmount: options.receipt.amount,
    facilitator: options.receipt.facilitator,
    status: 'paid',
    submitPayloadHash: null,
    consumedActionId: null,
    createdAt: Date.now(),
    consumedAt: null,
  });
  return quote;
}
