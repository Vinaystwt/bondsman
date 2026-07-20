import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Deployment } from '../shared/deployment.js';
import {
  priceBond,
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
  proposedFaultClass: string | null;
  proposedVerifier: string | null;
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
    proposedFaultClass: null,
    proposedVerifier: null,
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
    proposedFaultClass: null,
    proposedVerifier: null,
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
    proposedFaultClass: 'treasury_policy_violation',
    proposedVerifier: 'treasury-policy-violation-v1-proposed',
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
    proposedFaultClass: 'execution_constraint_violation',
    proposedVerifier: 'execution-constraint-violation-v1-proposed',
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
    proposedFaultClass: 'service_delivery_contradiction',
    proposedVerifier: 'service-delivery-contradiction-v1-proposed',
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

export type AssuranceModelFailureCode =
  | 'MODEL_PARSE_FAILED'
  | 'MODEL_SCHEMA_INVALID'
  | 'MODEL_TIMEOUT'
  | 'MODEL_REQUEST_FAILED';

export type AssuranceModelStatus =
  | 'available'
  | 'unavailable'
  | 'configured_unverified'
  | 'not_configured';

export interface AssuranceModelHealth {
  configured: boolean;
  operational: boolean;
  status: AssuranceModelStatus;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureCode: AssuranceModelFailureCode | null;
}

export type TextModelClient = (input: {
  model: string;
  prompt: string;
  repair: boolean;
  timeoutMs: number;
}) => Promise<string>;

const modelHealthState: AssuranceModelHealth = {
  configured: false,
  operational: false,
  status: 'not_configured',
  lastCheckedAt: null,
  lastSuccessAt: null,
  lastFailureCode: null,
};

function nowIso(): string {
  return new Date().toISOString();
}

function logModelDiagnostic(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...details }));
}

function modelFromEnv(env: NodeJS.ProcessEnv): string {
  return env.ASSURANCE_MODEL?.trim() ||
    env.AGENT_LLM_MODEL?.trim() ||
    'claude-haiku-4-5-20251001';
}

export function resetAssuranceModelHealthForTests(): void {
  modelHealthState.configured = false;
  modelHealthState.operational = false;
  modelHealthState.status = 'not_configured';
  modelHealthState.lastCheckedAt = null;
  modelHealthState.lastSuccessAt = null;
  modelHealthState.lastFailureCode = null;
}

export function assuranceModelHealth(
  env: NodeJS.ProcessEnv = process.env,
): AssuranceModelHealth {
  const configured = modelConfigured(env);
  if (!configured) {
    return {
      configured: false,
      operational: false,
      status: 'not_configured',
      lastCheckedAt: modelHealthState.lastCheckedAt,
      lastSuccessAt: modelHealthState.lastSuccessAt,
      lastFailureCode: modelHealthState.lastFailureCode,
    };
  }
  return {
    configured: true,
    operational: modelHealthState.operational,
    status: modelHealthState.lastCheckedAt === null
      ? 'configured_unverified'
      : modelHealthState.operational
        ? 'available'
        : 'unavailable',
    lastCheckedAt: modelHealthState.lastCheckedAt,
    lastSuccessAt: modelHealthState.lastSuccessAt,
    lastFailureCode: modelHealthState.lastFailureCode,
  };
}

function updateModelSuccess(): void {
  const checkedAt = nowIso();
  modelHealthState.configured = true;
  modelHealthState.operational = true;
  modelHealthState.status = 'available';
  modelHealthState.lastCheckedAt = checkedAt;
  modelHealthState.lastSuccessAt = checkedAt;
  modelHealthState.lastFailureCode = null;
}

function updateModelFailure(code: AssuranceModelFailureCode): void {
  modelHealthState.configured = true;
  modelHealthState.operational = false;
  modelHealthState.status = 'unavailable';
  modelHealthState.lastCheckedAt = nowIso();
  modelHealthState.lastFailureCode = code;
}

function unwrapCompleteFence(trimmed: string): string {
  const match = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*)\r?\n```[ \t]*$/i);
  return match ? match[1]!.trim() : trimmed;
}

export function parseModelAnalysisText(text: string): ModelAnalysis {
  const unwrapped = unwrapCompleteFence(text.trim());
  let parsed: unknown;
  try {
    parsed = JSON.parse(unwrapped);
  } catch {
    throw Object.assign(new Error('model response is not valid JSON'), {
      code: 'MODEL_PARSE_FAILED' as const,
    });
  }
  const result = modelSchema.safeParse(parsed);
  if (!result.success) {
    throw Object.assign(new Error('model response does not match schema'), {
      code: 'MODEL_SCHEMA_INVALID' as const,
    });
  }
  return result.data;
}

function failureCode(error: unknown): AssuranceModelFailureCode {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'MODEL_PARSE_FAILED'
  ) {
    return 'MODEL_PARSE_FAILED';
  }
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'MODEL_SCHEMA_INVALID'
  ) {
    return 'MODEL_SCHEMA_INVALID';
  }
  return error instanceof Error && error.message === 'model timeout'
    ? 'MODEL_TIMEOUT'
    : 'MODEL_REQUEST_FAILED';
}

async function liveModelAnalysis(input: AssuranceInput, options: {
  apiKey: string;
  model: string;
  timeoutMs: number;
  client?: TextModelClient;
}) {
  const anthropic = new Anthropic({ apiKey: options.apiKey });
  const prompt = [
    'Return strict JSON only. Do not include chain-of-thought.',
    'Interpret this autonomous finance scenario. Identify concise risk factors.',
    'Do not calculate bonds, decide verifier results, claim integrations, or submit transactions.',
    'Return exactly one object with top-level keys: summary, riskFactors, confidence, recommendedDecision.',
    'riskFactors must be an array of objects with only: code, severity, explanation.',
    'severity must be one of: low, medium, high.',
    'recommendedDecision must be one of: bonded_execution, manual_review, decline.',
    'Do not include templateId, scenario, policy, bond, verifier, transaction, slash, or extra fields.',
    JSON.stringify(normalizedScenario(input)),
  ].join('\n');
  const client: TextModelClient = options.client ?? (async (request) => {
    const response = await Promise.race([
      anthropic.messages.create({
        model: request.model,
        max_tokens: 500,
        temperature: 0,
        messages: [{ role: 'user', content: request.prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('model timeout')), request.timeoutMs),
      ),
    ]);
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  });
  let lastError: unknown;
  for (const repair of [false, true]) {
    try {
      const text = await client({
        model: options.model,
        prompt: repair
          ? `${prompt}\n\nReturn the same result as one raw JSON object.\nNo Markdown.\nNo code fences.\nNo commentary.`
          : prompt,
        repair,
        timeoutMs: options.timeoutMs,
      });
      return parseModelAnalysisText(text);
    } catch (error) {
      lastError = error;
      const code = failureCode(error);
      logModelDiagnostic(
        code === 'MODEL_PARSE_FAILED'
          ? 'assurance_model_parse_failed'
          : code === 'MODEL_SCHEMA_INVALID'
            ? 'assurance_model_schema_invalid'
            : code === 'MODEL_TIMEOUT'
              ? 'assurance_model_timeout'
              : 'assurance_model_request_failed',
        { model: options.model, attempt: repair ? 'repair' : 'initial' },
      );
      if (code === 'MODEL_TIMEOUT' || code === 'MODEL_REQUEST_FAILED') break;
    }
  }
  throw lastError;
}

export function modelConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY?.trim()) &&
    env.ASSURANCE_STUDIO_ENABLED !== 'false';
}

export async function analyzeAssurance(input: AssuranceInput, options: {
  deployment: Deployment;
  env?: NodeJS.ProcessEnv;
  modelClient?: TextModelClient;
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
  let modelFailureCode: AssuranceModelFailureCode | null = null;
  if (modelConfigured(env)) {
    try {
      const model = modelFromEnv(env);
      parsedModel = await liveModelAnalysis(input, {
        apiKey: env.ANTHROPIC_API_KEY!.trim(),
        model,
        timeoutMs: Number(env.ASSURANCE_MODEL_TIMEOUT_MS ?? 6_000),
        ...(options.modelClient ? { client: options.modelClient } : {}),
      });
      source = 'live_model';
      modelAvailable = true;
      updateModelSuccess();
      logModelDiagnostic('assurance_model_success', { model });
    } catch (error) {
      modelAvailable = false;
      modelFailureCode = failureCode(error);
      updateModelFailure(modelFailureCode);
    }
  } else {
    modelHealthState.configured = false;
    modelHealthState.operational = false;
    modelHealthState.status = 'not_configured';
  }
  const reputationScore = input.counterpartyStatus === 'new' ? -60 : -20;
  const executableFaultClass: FaultClass = template.id === 'duplicate_invoice_test'
    ? 'duplicate_claim'
    : 'delivery_contradiction';
  const executablePolicy = template.executableNow
    ? policyFor({
        amount: input.amount,
        supportedFaultClass: executableFaultClass,
        reputationScore,
      })
    : null;
  const price = priceBond({
    amount: input.amount,
    reputationScore,
  });
  const policy = executablePolicy ?? {
    ...price,
    faultClass: null,
    verifier: null,
    estimatedBond: price.estimatedMinimumBond,
    challengeWindowSeconds: 1800 as const,
    evidenceRequirements: template.objectiveEvidence,
    implementationStatus: 'blueprint' as const,
    executableNow: false,
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
      executableNow: template.executableNow,
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
    faultClass: executablePolicy?.faultClass ?? null,
    verifier: executablePolicy?.verifier ?? null,
    proposedFaultClass: template.executableNow ? null : template.proposedFaultClass,
    proposedVerifier: template.executableNow ? null : template.proposedVerifier,
    challengeWindowSeconds: policy.challengeWindowSeconds,
    evidenceRequirements: policy.evidenceRequirements,
    implementationStatus: template.implementationStatus,
    executableNow: template.executableNow,
    quoteRequestShape: template.executableNow
      ? { method: 'POST', path: '/v1/actions/quote', amount: input.amount, faultClass: executablePolicy!.faultClass }
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
      ? modelFromEnv(env)
      : null,
    failureCode: modelFailureCode,
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
