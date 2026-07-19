import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Deployment } from '../shared/deployment.js';
import {
  policyFor,
  type FaultClass,
  type ImplementationStatus,
} from '../policy/engine.js';

export const assuranceInputSchema = z.object({
  templateId: z.enum([
    'invoice_delivery',
    'duplicate_invoice_test',
    'treasury_payment',
    'dex_execution',
    'x402_service_delivery',
  ]),
  description: z.string().trim().min(8).max(1_000),
  amount: z.string().regex(/^[1-9]\d*$/),
  agentConfidence: z.number().min(0).max(1),
  counterpartyStatus: z.enum(['new', 'known', 'trusted', 'unknown']),
  evidenceSource: z.enum([
    'signed_delivery_attestation',
    'paid_claim_registry',
    'multisig_approval',
    'oracle_report',
    'execution_receipt',
  ]),
  maxLossBps: z.number().int().min(1).max(10_000),
  urgency: z.enum(['low', 'normal', 'high']),
}).strict();

export type AssuranceInput = z.infer<typeof assuranceInputSchema>;

export interface AssuranceTemplate {
  id: AssuranceInput['templateId'];
  name: string;
  category: 'RWA' | 'DeFi' | 'x402' | 'Treasury';
  description: string;
  implementationStatus: ImplementationStatus;
  executableNow: boolean;
  currentAdapter: string | null;
  supportedFaultClasses: FaultClass[];
  objectiveEvidence: string[];
  casperValue: string;
  requiredFields: string[];
}

export const templates: AssuranceTemplate[] = [
  {
    id: 'invoice_delivery',
    name: 'Invoice or procurement delivery',
    category: 'RWA',
    description: 'Release payment after supplier delivery, with buyer-signed non-delivery evidence available for challenge.',
    implementationStatus: 'executable_now',
    executableNow: true,
    currentAdapter: 'invoice_payout',
    supportedFaultClasses: ['delivery_contradiction'],
    objectiveEvidence: ['buyer-signed delivery attestation'],
    casperValue: 'Turns Casper testnet actions into bonded RWA disbursement evidence.',
    requiredFields: ['amount', 'buyerPublicKey', 'delivery attestation schema'],
  },
  {
    id: 'duplicate_invoice_test',
    name: 'Duplicate invoice deterministic test vector',
    category: 'RWA',
    description: 'Advanced deterministic test vector that slashes an action when a paid invoice claim hash is reused.',
    implementationStatus: 'executable_now',
    executableNow: true,
    currentAdapter: 'invoice_payout',
    supportedFaultClasses: ['duplicate_claim'],
    objectiveEvidence: ['paid claim registry collision'],
    casperValue: 'Demonstrates deterministic verifier settlement against Casper contract state.',
    requiredFields: ['invoice claim hash'],
  },
  {
    id: 'treasury_payment',
    name: 'Treasury payment guardrail',
    category: 'Treasury',
    description: 'Blueprint for bonding an agent before DAO or treasury disbursement.',
    implementationStatus: 'blueprint',
    executableNow: false,
    currentAdapter: null,
    supportedFaultClasses: [],
    objectiveEvidence: ['multisig approval record', 'payment policy receipt'],
    casperValue: 'Would add accountable treasury automation using Casper receipts and verifiers.',
    requiredFields: ['treasury policy', 'approval quorum', 'recipient allowlist'],
  },
  {
    id: 'dex_execution',
    name: 'DEX execution assurance',
    category: 'DeFi',
    description: 'Blueprint for bonding an agent before swap execution with slippage or route constraints.',
    implementationStatus: 'blueprint',
    executableNow: false,
    currentAdapter: null,
    supportedFaultClasses: [],
    objectiveEvidence: ['execution receipt', 'route and slippage oracle'],
    casperValue: 'Would expand agent-originated DeFi transactions with objective post-trade accountability.',
    requiredFields: ['route', 'max slippage', 'execution adapter'],
  },
  {
    id: 'x402_service_delivery',
    name: 'x402 paid-service delivery',
    category: 'x402',
    description: 'Blueprint for bonding a paid service agent after x402 payment but before delivery.',
    implementationStatus: 'blueprint',
    executableNow: false,
    currentAdapter: null,
    supportedFaultClasses: [],
    objectiveEvidence: ['service delivery attestation', 'x402 receipt'],
    casperValue: 'Connects Casper x402 settlement volume to accountable paid-service agents.',
    requiredFields: ['service SLA', 'delivery verifier', 'payer identity'],
  },
];

export function templateById(id: AssuranceInput['templateId']): AssuranceTemplate {
  return templates.find((template) => template.id === id)!;
}

function hashJson(value: unknown): string {
  return `0x${createHash('blake2b512')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 64)}`;
}

function normalizedScenario(input: AssuranceInput) {
  return {
    templateId: input.templateId,
    description: input.description.trim(),
    amount: input.amount,
    agentConfidence: input.agentConfidence,
    counterpartyStatus: input.counterpartyStatus,
    evidenceSource: input.evidenceSource,
    maxLossBps: input.maxLossBps,
    urgency: input.urgency,
  };
}

function deterministicRiskFactors(input: AssuranceInput) {
  return [
    input.counterpartyStatus === 'new'
      ? {
          code: 'NEW_COUNTERPARTY',
          severity: 'medium',
          explanation: 'The counterparty has no established Bondsman history in this scenario.',
        }
      : null,
    input.agentConfidence < 0.8
      ? {
          code: 'LOW_AGENT_CONFIDENCE',
          severity: 'medium',
          explanation: 'The acting agent reports lower confidence and should post a stronger bond.',
        }
      : null,
    input.urgency === 'high'
      ? {
          code: 'HIGH_URGENCY',
          severity: 'low',
          explanation: 'Urgency can compress review time and increases operational risk.',
        }
      : null,
  ].filter((item): item is {
    code: string;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
  } => Boolean(item));
}

const modelSchema = z.object({
  summary: z.string().trim().min(1).max(800),
  riskFactors: z.array(z.object({
    code: z.string().trim().min(1).max(64),
    severity: z.enum(['low', 'medium', 'high']),
    explanation: z.string().trim().min(1).max(400),
  })).max(6),
  confidence: z.number().min(0).max(1),
  recommendedDecision: z.enum(['bonded_execution', 'manual_review', 'decline']),
}).strict();
type ModelAnalysis = z.infer<typeof modelSchema>;

async function liveModelAnalysis(input: AssuranceInput, options: {
  apiKey: string;
  model: string;
  timeoutMs: number;
}) {
  const client = new Anthropic({ apiKey: options.apiKey });
  const prompt = [
    'Return strict JSON only. Do not include chain-of-thought.',
    'Interpret this autonomous finance scenario. Identify concise risk factors.',
    'Do not calculate bonds, decide verifier results, claim integrations, or submit transactions.',
    JSON.stringify(normalizedScenario(input)),
  ].join('\n');
  const response = await Promise.race([
    client.messages.create({
      model: options.model,
      max_tokens: 500,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('model timeout')), options.timeoutMs),
    ),
  ]);
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  return modelSchema.parse(JSON.parse(text));
}

export function modelConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY?.trim()) &&
    env.ASSURANCE_STUDIO_ENABLED !== 'false';
}

export async function analyzeAssurance(input: AssuranceInput, options: {
  deployment: Deployment;
  env?: NodeJS.ProcessEnv;
}) {
  const env = options.env ?? process.env;
  const scenario = normalizedScenario(input);
  const scenarioHash = hashJson(scenario);
  const template = templateById(input.templateId);
  let parsedModel: ModelAnalysis = {
    summary: `${template.name}: Bondsman can design a bonded execution boundary for this scenario.`,
    riskFactors: deterministicRiskFactors(input),
    confidence: Math.max(0.5, Math.min(0.95, input.agentConfidence - 0.03)),
    recommendedDecision: 'bonded_execution' as const,
  };
  let source: 'live_model' | 'deterministic_fallback' = 'deterministic_fallback';
  let modelAvailable = false;
  if (modelConfigured(env)) {
    try {
      parsedModel = await liveModelAnalysis(input, {
        apiKey: env.ANTHROPIC_API_KEY!.trim(),
        model: env.ASSURANCE_MODEL?.trim() ||
          env.AGENT_LLM_MODEL?.trim() ||
          'claude-haiku-4-5-20251001',
        timeoutMs: Number(env.ASSURANCE_MODEL_TIMEOUT_MS ?? 6_000),
      });
      source = 'live_model';
      modelAvailable = true;
    } catch {
      modelAvailable = false;
    }
  }
  const faultClass: FaultClass = template.id === 'duplicate_invoice_test'
    ? 'duplicate_claim'
    : 'delivery_contradiction';
  const executablePolicy = policyFor({
    amount: input.amount,
    faultClass,
    reputationScore: input.counterpartyStatus === 'new' ? -60 : -20,
  });
  const policy = template.executableNow
    ? executablePolicy
    : {
        ...executablePolicy,
        verifier: 'proposed-verifier-required',
        implementationStatus: 'blueprint' as const,
        executableNow: false,
        evidenceRequirements: template.objectiveEvidence,
      };
  const boundaries = {
    submitsTransaction: false,
    makesPayment: false,
    challengesAction: false,
    settlesQuote: false,
    createsTransaction: false,
    createsPaidQuote: false,
    reservesQuote: false,
    persistsAction: false,
    modelCanSlash: false,
    policyEngineCanSubmitTransaction: false,
  };
  const manifest = {
    schemaId: 'bondsman.assurance-manifest.v1',
    scenarioId: scenarioHash,
    scenarioHash,
    template: {
      id: template.id,
      name: template.name,
      implementationStatus: template.implementationStatus,
    },
    actionCategory: template.category,
    amount: { value: input.amount, asset: 'csprUSD', decimals: 9 },
    riskIndicators: parsedModel.riskFactors,
    modelAnalysisHash: hashJson(parsedModel),
    riskTier: policy.riskTier,
    bondPolicy: {
      authority: policy.authority,
      estimatedBond: policy.estimatedBond,
      bondBasisPoints: policy.bondBasisPoints,
    },
    faultClass: policy.faultClass,
    verifier: template.executableNow ? policy.verifier : null,
    proposedVerifier: template.executableNow ? null : policy.verifier,
    challengeWindowSeconds: policy.challengeWindowSeconds,
    evidenceRequirements: policy.evidenceRequirements,
    implementationStatus: template.implementationStatus,
    quoteRequestShape: template.executableNow
      ? { method: 'POST', path: '/v1/actions/quote', amount: input.amount, faultClass }
      : null,
    submitRequirements: template.executableNow
      ? ['paid quote hash', 'payer submit authorization', 'one-use nonce']
      : [],
    expectedReceiptFields: ['actionId', 'controller', 'outcome', 'payment', 'paidQuote', 'reasoningCommitment'],
    casperNetwork: options.deployment.network,
    contractReferences: template.executableNow
      ? {
          controller: options.deployment.contracts.controller.packageHash,
          invoicePool: options.deployment.contracts.invoicePool.packageHash,
        }
      : null,
    boundaries,
  };
  const modelAnalysis = {
    source,
    modelAvailable,
    model: source === 'live_model'
      ? env.ASSURANCE_MODEL?.trim() || env.AGENT_LLM_MODEL?.trim() || 'claude-haiku-4-5-20251001'
      : null,
    ...parsedModel,
  };
  const integrationManifest = {
    ...manifest,
    policyResultHash: hashJson(policy),
    manifestHash: hashJson(manifest),
  };
  return {
    schemaId: 'bondsman.assurance-analysis.v1',
    mode: 'design_only',
    scenarioHash,
    generatedAt: new Date().toISOString(),
    modelAnalysis,
    policy,
    manifest: integrationManifest,
    integrationManifest,
    hashes: {
      normalizedScenario: scenarioHash,
      modelAnalysis: hashJson(modelAnalysis),
      deterministicPolicy: hashJson(policy),
      integrationManifest: hashJson(manifest),
    },
    boundaries,
  };
}
