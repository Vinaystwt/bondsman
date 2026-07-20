import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeAssurance,
  assuranceModelHealth,
  parseModelAnalysisText,
  resetAssuranceModelHealthForTests,
  type AssuranceInput,
  type TextModelClient,
} from '../../src/assurance/service.js';
import type { Deployment } from '../../src/shared/deployment.js';

const hash = `hash-${'1'.repeat(64)}`;
const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  current: 'v2',
  contracts: {
    mockCsprUsd: { packageHash: hash, contractHash: hash },
    bondVault: { packageHash: hash, contractHash: hash },
    controller: { packageHash: hash, contractHash: hash },
    invoicePool: { packageHash: hash, contractHash: hash },
    controllerV1: { packageHash: hash, contractHash: hash },
    controllerV2: { packageHash: hash, contractHash: hash },
    bondVaultV2: { packageHash: hash, contractHash: hash },
    invoicePoolV2: { packageHash: hash, contractHash: hash },
  },
  versions: {
    v2: {
      mockCsprUsd: { packageHash: hash, contractHash: hash },
      bondVault: { packageHash: hash, contractHash: hash },
      controller: { packageHash: hash, contractHash: hash },
      invoicePool: { packageHash: hash, contractHash: hash },
      verifiers: {
        duplicateClaim: { packageHash: hash, contractHash: hash },
        deliveryContradiction: { packageHash: hash, contractHash: hash },
      },
    },
  },
  accounts: {
    deployer: { publicKey: `01${'2'.repeat(64)}`, accountHash: '3'.repeat(64) },
    agent: { publicKey: `01${'2'.repeat(64)}`, accountHash: '3'.repeat(64) },
    challenger: { publicKey: `01${'2'.repeat(64)}`, accountHash: '3'.repeat(64) },
    watchdog: { publicKey: `01${'4'.repeat(64)}`, accountHash: '5'.repeat(64) },
  },
} as Deployment;

const scenario: AssuranceInput = {
  templateId: 'invoice_delivery',
  description: 'Release supplier payment while preserving buyer-signed non-delivery evidence for the challenge window.',
  amount: '50000000000000',
  agentConfidence: 0.91,
  counterpartyStatus: 'new',
  evidenceSource: 'signed_delivery_attestation',
  maxLossBps: 200,
  urgency: 'normal',
};

const validModel = {
  summary: 'Buyer non-delivery evidence remains challengeable during the payment window.',
  riskFactors: [
    {
      code: 'NEW_COUNTERPARTY',
      severity: 'medium',
      explanation: 'The counterparty is new and should remain bonded through the challenge window.',
    },
  ],
  confidence: 0.87,
  recommendedDecision: 'bonded_execution',
};

const validJson = JSON.stringify(validModel);
const env = {
  ANTHROPIC_API_KEY: 'test-key',
  ASSURANCE_STUDIO_ENABLED: 'true',
  ASSURANCE_MODEL: 'test-model',
} as NodeJS.ProcessEnv;

describe('Assurance Studio model reliability', () => {
  beforeEach(() => {
    resetAssuranceModelHealthForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['raw valid JSON', validJson],
    ['whitespace-surrounded JSON', `\n  ${validJson}  \n`],
    ['json fenced JSON', `\`\`\`json\n${validJson}\n\`\`\``],
    ['generic fenced JSON', `\`\`\`\n${validJson}\n\`\`\``],
  ])('parses %s', (_name, text) => {
    expect(parseModelAnalysisText(text)).toEqual(validModel);
  });

  it('rejects invalid JSON, unknown fields, and schema-invalid JSON', () => {
    expect(() => parseModelAnalysisText('{')).toThrow('model response is not valid JSON');
    expect(() =>
      parseModelAnalysisText(JSON.stringify({ ...validModel, extra: true })),
    ).toThrow('model response does not match schema');
    expect(() =>
      parseModelAnalysisText(JSON.stringify({ ...validModel, confidence: 2 })),
    ).toThrow('model response does not match schema');
  });

  it('uses one successful repair retry and keeps deterministic policy authority', async () => {
    const modelClient = vi.fn<TextModelClient>()
      .mockResolvedValueOnce('```json\n{"summary":"bad shape"}\n```')
      .mockResolvedValueOnce(validJson);
    const result = await analyzeAssurance(scenario, {
      deployment,
      env,
      modelClient,
    });

    expect(modelClient).toHaveBeenCalledTimes(2);
    expect(modelClient.mock.calls[1]?.[0]).toMatchObject({ repair: true });
    expect(result.modelAnalysis).toMatchObject({
      source: 'live_model',
      modelAvailable: true,
      model: 'test-model',
      failureCode: null,
    });
    expect(result.policy).toMatchObject({
      authority: 'deterministic_policy',
      riskTier: 'high',
      estimatedBond: '2800000000000',
      bondBasisPoints: 560,
      faultClass: 'delivery_contradiction',
      verifier: 'delivery-contradiction-v2',
    });
    expect(result.boundaries).toMatchObject({
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
    });
    expect(assuranceModelHealth(env)).toMatchObject({
      configured: true,
      operational: true,
      status: 'available',
      lastFailureCode: null,
    });
  });

  it('falls back after two failed parse attempts and marks the model unavailable', async () => {
    const modelClient = vi.fn<TextModelClient>()
      .mockResolvedValueOnce('```json\n{"summary":"bad shape"}\n```')
      .mockResolvedValueOnce('still not json');
    const result = await analyzeAssurance(scenario, {
      deployment,
      env,
      modelClient,
    });

    expect(modelClient).toHaveBeenCalledTimes(2);
    expect(result.modelAnalysis).toMatchObject({
      source: 'deterministic_fallback',
      modelAvailable: false,
      model: null,
      failureCode: 'MODEL_PARSE_FAILED',
    });
    expect(result.policy).toMatchObject({
      riskTier: 'high',
      estimatedBond: '2800000000000',
      bondBasisPoints: 560,
      faultClass: 'delivery_contradiction',
      verifier: 'delivery-contradiction-v2',
    });
    expect(assuranceModelHealth(env)).toMatchObject({
      configured: true,
      operational: false,
      status: 'unavailable',
      lastFailureCode: 'MODEL_PARSE_FAILED',
    });
  });

  it('falls back on timeout without an unlimited retry loop', async () => {
    const modelClient = vi.fn<TextModelClient>().mockRejectedValue(new Error('model timeout'));
    const result = await analyzeAssurance(scenario, {
      deployment,
      env,
      modelClient,
    });

    expect(modelClient).toHaveBeenCalledTimes(1);
    expect(result.modelAnalysis).toMatchObject({
      source: 'deterministic_fallback',
      modelAvailable: false,
      failureCode: 'MODEL_TIMEOUT',
    });
    expect(assuranceModelHealth(env)).toMatchObject({
      configured: true,
      operational: false,
      status: 'unavailable',
      lastFailureCode: 'MODEL_TIMEOUT',
    });
  });

  it('does not treat a configured key as available before a live success', () => {
    expect(assuranceModelHealth(env)).toMatchObject({
      configured: true,
      operational: false,
      status: 'configured_unverified',
      lastCheckedAt: null,
      lastSuccessAt: null,
    });
  });

  it('keeps Assurance Studio ready during no-key fallback', async () => {
    const result = await analyzeAssurance(scenario, {
      deployment,
      env: { ASSURANCE_STUDIO_ENABLED: 'true' } as NodeJS.ProcessEnv,
      modelClient: vi.fn<TextModelClient>(),
    });

    expect(result.modelAnalysis).toMatchObject({
      source: 'deterministic_fallback',
      modelAvailable: false,
      model: null,
      failureCode: null,
    });
    expect(result.manifest).toMatchObject({
      implementationStatus: 'executable_now',
      faultClass: 'delivery_contradiction',
      verifier: 'delivery-contradiction-v2',
    });
    expect(result.policy).toMatchObject({
      estimatedBond: '2800000000000',
      bondBasisPoints: 560,
    });
  });
});
