import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { actionDetail } from './action-detail.js';
import {
  actionBodySchema,
  paidActionSubmitSchema,
  transactionHashSchema,
  verifyBodySchema,
  walletChallengeBodySchema,
} from './schemas.js';
import {
  parseSandboxPayment,
  paymentRequired,
} from '../verify/payment.js';
import {
  parsePaymentHeader,
  quoteRequirements,
  quoteResponse,
  sendPaymentRequired,
  settleX402Payment,
  x402Diagnostics,
  x402Config,
  x402SettlementFailure,
} from '../verify/x402.js';
import { verifySubmitAuthorization } from '../verify/submit-authorization.js';
import { verifyClaimCollision } from '../verify/service.js';
import {
  challengeIneligibilityCode,
  isChallengeEligible,
} from './eligibility.js';
import { ApiError } from './errors.js';
import type { WalletChallengeService } from './wallet-challenge.js';
import { demoReadyResponse } from './demo-ready.js';
import type { DemoJobService } from './demo-jobs.js';
import { deliveryAttestationSchema, verifyDeliveryAttestation } from '../verifiers/delivery-attestation.js';
import { listVerifiers, verifier } from '../verifiers/registry.js';
import { canonicalProof, featuredProofs, proofFor } from '../proofs/service.js';
import { issueReceipt, verifyReceipt, type PortableReceipt } from '../receipts/service.js';
import { runIntegrator } from '../integrator/service.js';
import { spendSnapshot } from '../ops/spend-guard.js';
import { dailyOpsSummary, recentApiErrors } from '../ops/observability.js';
import { createIdempotencyStore } from './idempotency.js';
import type { PaidQuoteRecord } from '../db/repositories.js';
import {
  canonicalActionId,
  canonicalReplay,
  quoteReplayCheck,
  validateCanonical,
} from '../evidence/replay.js';
import {
  assuranceModelHealth,
  analyzeAssurance,
  assuranceInputSchema,
  type TextModelClient,
  templates as assuranceTemplates,
} from '../assurance/service.js';
import {
  publicArenaEnabled,
  publicWalletChallengeEnabled,
  requireOperator,
} from './operator-auth.js';
import { bondEconomicRelation } from '../evidence/bond-economics.js';
import { policyFor } from '../policy/engine.js';

export interface CurrentBondPolicy {
  source: string;
  reputationScore: number | null;
  expectedActualBond: string;
}

export type CurrentBondPolicyReader = (input: {
  amount: string;
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
}) => Promise<CurrentBondPolicy>;

function latestSlashProof(
  repository: Repository,
  controllerHash: string,
  challengerType: 'manual' | 'watchdog',
) {
  const action = repository
    .listActions()
    .filter((candidate) =>
      candidate.controllerHash === controllerHash &&
      candidate.status === 'ResolvedSlash' &&
      candidate.challengerType === challengerType,
    )
    .sort((left, right) => right.actionId - left.actionId)[0];
  if (!action) return null;
  const detail = actionDetail(repository, action.actionId)!;
  return {
    actionId: detail.actionId,
    status: detail.status,
    challenger: detail.challenger,
    challengerType: detail.challengerType,
    bond: detail.bondPosted,
    amount: detail.amount,
    challengeTx: detail.transactions.challenge ?? null,
    resolveTx: detail.transactions.resolve ?? null,
    explorerLinks: detail.explorerLinks,
  };
}

function quoteAmount(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const value = (body as Record<string, unknown>).amount;
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new ApiError(400, 'INVALID_QUOTE_AMOUNT', 'amount must be a positive integer string');
  }
  return value;
}

function quoteFaultClass(body: unknown):
  | 'duplicate_claim'
  | 'delivery_contradiction'
  | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const value = (body as Record<string, unknown>).faultClass;
  if (value === undefined) return undefined;
  if (value !== 'duplicate_claim' && value !== 'delivery_contradiction') {
    throw new ApiError(400, 'INVALID_FAULT_CLASS', 'faultClass is invalid');
  }
  return value;
}

function submitPayloadHash(input: unknown): string {
  return `0x${createHash('blake2b512')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 64)}`;
}

function mutationModesEnabled(): boolean {
  return publicArenaEnabled() || publicWalletChallengeEnabled();
}

function publicCapabilities() {
  return {
    productCategory: 'bonded_execution_assurance',
    proofConsole: {
      enabled: true,
      canonicalActionId: canonicalActionId(),
    },
    assuranceStudio: {
      enabled: process.env.ASSURANCE_STUDIO_ENABLED !== 'false',
      mode: 'design_only',
      liveModelAvailable: assuranceModelHealth().operational,
    },
    liveQuoteProbe: {
      enabled: true,
      createsTransactionWithoutPayment: false,
    },
    paidHttpIntegration: {
      enabled: true,
      quoteSurface: '/v1/actions/quote',
      submitSurface: '/v1/actions/submit',
    },
    receiptVerification: { enabled: true },
    sponsoredLiveRun: { enabled: false },
    publicChallengeArena: { enabled: publicArenaEnabled() },
    externalWalletChallenge: { enabled: publicWalletChallengeEnabled() },
    operatorDemoWrites: { enabled: true, public: false },
    mcp: { mode: 'read_design_and_verification' },
  };
}

function reputationScore(row: Record<string, unknown> | undefined): number | null {
  return typeof row?.score === 'number' ? row.score : null;
}

function projectedBondPolicyReader(
  repository: Repository,
  deployment: Deployment,
): CurrentBondPolicyReader {
  return async ({ amount, faultClass }) => {
    const agent = `account-hash-${deployment.accounts.agent.accountHash}`;
    const reputation = reputationScore(repository.reputation(agent));
    const policy = policyFor({
      amount,
      supportedFaultClass: faultClass,
      reputationScore: reputation,
    });
    return {
      source: 'repository_projection',
      reputationScore: reputation,
      expectedActualBond: policy.estimatedMinimumBond,
    };
  };
}

function snapshotValue(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = snapshot?.[key];
  return typeof value === 'string' ? value : null;
}

async function assertQuotePolicyFresh(input: {
  quote: PaidQuoteRecord;
  readCurrentBondPolicy: CurrentBondPolicyReader;
}) {
  const { quote } = input;
  const snapshot = quote.policySnapshot ?? null;
  const snapshotErrors = [
    snapshot && snapshotValue(snapshot, 'amount') !== quote.amount
      ? 'snapshot amount does not match quote amount'
      : null,
    snapshot && snapshotValue(snapshot, 'faultClass') !== quote.faultClass
      ? 'snapshot fault class does not match quote fault class'
      : null,
    snapshot && snapshotValue(snapshot, 'quotedMinimumBond') !== quote.requiredBond
      ? 'snapshot minimum bond does not match quote requiredBond'
      : null,
  ].filter((error): error is string => Boolean(error));
  if (snapshotErrors.length > 0) {
    throw new ApiError(
      409,
      'QUOTE_POLICY_STALE',
      `quote policy snapshot is inconsistent: ${snapshotErrors.join('; ')}`,
    );
  }
  const current = await input.readCurrentBondPolicy({
    amount: quote.amount,
    faultClass: quote.faultClass,
  });
  const relation = bondEconomicRelation({
    quotedMinimumBond: quote.requiredBond,
    actualPostedBond: current.expectedActualBond,
  });
  if (!relation.minimumSatisfied) {
    throw new ApiError(
      409,
      'QUOTE_POLICY_STALE',
      'current controller policy would post less than the quoted minimum bond',
    );
  }
  return {
    ...current,
    bondEconomics: relation,
  };
}

async function readAssuranceSchema(repositoryPath: string) {
  const candidates = [
    join(repositoryPath, 'spec/bondsman-assurance-manifest-v1.schema.json'),
    join(process.cwd(), 'spec/bondsman-assurance-manifest-v1.schema.json'),
    join(process.cwd(), '../spec/bondsman-assurance-manifest-v1.schema.json'),
  ];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(await readFile(candidate, 'utf8'));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function registerRoutes(
  server: FastifyInstance,
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
  walletChallenge: WalletChallengeService,
  jobs: DemoJobService,
  repositoryPath = process.cwd(),
  readCurrentBondPolicy: CurrentBondPolicyReader =
    projectedBondPolicyReader(repository, deployment),
  assuranceModelClient?: TextModelClient,
): void {
  const startedAt = Date.now();
  const idempotency = createIdempotencyStore();
  const assuranceHits = new Map<string, { count: number; resetAt: number }>();
  const currentController =
    deployment.contracts.controller.contractHash;
  server.get('/api/health', async () => {
    const watchdog = repository.watchdogSummary();
    const spending = spendSnapshot();
    const integratorState =
      repository.systemState<{ running?: boolean; lastRun?: string | null; limitation?: string | null }>('integrator')?.value ??
      { running: false, lastRun: null };
    const canonical = await validateCanonical({
      repositoryPath,
      repository,
      deployment,
      controllerHash: currentController,
      actionId: canonicalActionId(),
    });
    const assuranceModel = assuranceModelHealth();
    const publicExperience = {
      proofConsoleReady: canonical.ready,
      assuranceStudioReady: process.env.ASSURANCE_STUDIO_ENABLED !== 'false',
      assuranceModelConfigured: assuranceModel.configured,
      assuranceModelAvailable: assuranceModel.operational,
      assuranceModelStatus: assuranceModel.status,
      assuranceModelLastCheckedAt: assuranceModel.lastCheckedAt,
      assuranceModelLastSuccessAt: assuranceModel.lastSuccessAt,
      assuranceModelLastFailureCode: assuranceModel.lastFailureCode,
      canonicalActionId: canonical.actionId,
      canonicalProofAvailable: canonical.errors.every((error) =>
        !/action|quote|transaction/i.test(error),
      ) || canonical.ready,
      canonicalReceiptValid: !canonical.errors.includes('receipt verification failed') &&
        !canonical.errors.includes('receipt missing'),
      liveQuoteProbeAvailable: true,
      publicMutationModesEnabled: mutationModesEnabled(),
      ...(canonical.ready ? {} : { canonicalErrors: canonical.errors }),
    };
    return {
      ok: !spending.tripped && canonical.ready && watchdog.running,
      version: '0.2.0',
      controller: currentController,
      controllerVersion: deployment.current ?? (deployment.contracts.controllerV2 ? 'v2' : 'v1'),
      activeControllerVersion: deployment.current ?? (deployment.contracts.controllerV2 ? 'v2' : 'v1'),
      spending,
      publicExperience,
      daily: {
        ...dailyOpsSummary(),
        actions: repository.listActions().filter((action) => action.controllerHash === currentController).length,
        slashes: repository.listActions().filter((action) => action.controllerHash === currentController && action.status === 'ResolvedSlash').length,
        reserve: repository.reserve(),
      },
      watchdog: { running: watchdog.running, lastCatch: watchdog.recentCatches[0]?.timestamp ?? null, totalEarned: watchdog.totalRewardEarned },
      integrator: {
        ...integratorState,
        limitation: integratorState.limitation ?? null,
      },
      listener: repository.systemState('listener')?.value ?? { running: false },
      expiryResolution:
        repository.systemState('listener_expiry_resolution')?.value ?? null,
      readyPool: {
        manualCases: demoReadyResponse(repository, currentController).cases.length,
        watchdogCases: repository.listActions().filter((action) => action.controllerHash === currentController && !action.reservedForManual && action.status === 'Executed').length,
        deliveryCases: repository.listActions().filter((action) => action.controllerHash === currentController && action.faultClass === 'delivery_contradiction' && action.status === 'Executed').length,
      },
      reserves: {
        operationalBalance: repository.reserve(),
        funding: repository.systemState('funding')?.value ?? null,
      },
      uptimeSec: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      deploymentsPath: 'deployments/testnet.json',
    };
  });
  server.get('/api/ops/spend', async (request) => {
    requireOperator(request);
    return spendSnapshot();
  });
  server.get('/api/ops/recent-errors', async (request) => {
    requireOperator(request);
    return {
    success: true,
    errors: recentApiErrors(),
    };
  });
  server.get('/api/public-capabilities', async () => publicCapabilities());
  server.get('/api/assurance/templates', async () => ({
    schemaId: 'bondsman.assurance-templates.v1',
    templates: assuranceTemplates,
  }));
  server.get('/api/assurance/schema', async () =>
    readAssuranceSchema(repositoryPath));
  server.post('/api/assurance/analyze', async (request) => {
    if (process.env.ASSURANCE_STUDIO_ENABLED === 'false') {
      throw new ApiError(503, 'ASSURANCE_STUDIO_DISABLED', 'Assurance Studio is disabled');
    }
    const now = Date.now();
    const key = request.ip;
    const hit = assuranceHits.get(key);
    const current = hit && hit.resetAt > now
      ? hit
      : { count: 0, resetAt: now + 60_000 };
    current.count += 1;
    assuranceHits.set(key, current);
    if (current.count > Number(process.env.ASSURANCE_RATE_LIMIT_PER_MINUTE ?? 20)) {
      throw new ApiError(429, 'ASSURANCE_RATE_LIMITED', 'too many assurance analyses');
    }
    const input = assuranceInputSchema.parse(request.body);
    return analyzeAssurance(input, {
      deployment,
      ...(assuranceModelClient ? { modelClient: assuranceModelClient } : {}),
    });
  });
  server.get('/api/invoices', async () => repository.listInvoices());
  server.get('/api/actions', async () =>
    repository
      .listActions()
      .filter((action) =>
        action.controllerHash === currentController,
      ),
  );
  server.get('/api/actions/:id', async (request, reply) => {
    const actionId = Number(
      (request.params as { id: string }).id,
    );
    const detail = actionDetail(repository, actionId);
    if (!detail) {
      throw new ApiError(404, 'NOT_FOUND', 'action not found');
    }
    return detail;
  });
  server.get('/api/agents/:address', async (request, reply) => {
    const address = (request.params as { address: string }).address;
    const reputation = repository.reputation(address);
    if (!reputation) {
      throw new ApiError(404, 'NOT_FOUND', 'agent not found');
    }
    return {
      ...reputation,
      actions: repository
        .listActions()
        .filter((action) => action.agent === address),
    };
  });
  server.get('/api/reserve', async () => ({
    balance: repository.reserve(),
    slashes: repository.slashEvents(),
  }));
  server.get('/api/coverage', async () => {
    const actions = repository.listActions().filter((action) => action.controllerHash === currentController);
    const openBondedExposure = actions
      .filter((action) => ['Initiated', 'Bonded', 'Executed', 'Challenged'].includes(action.status))
      .reduce((sum, action) => sum + BigInt(action.amount), 0n);
    const slashes = actions.filter((action) => action.status === 'ResolvedSlash');
    const refunds = actions.filter((action) => action.status === 'ResolvedRefund');
    const reserveBalance = BigInt(repository.reserve());
    const maxSingle = actions.reduce((max, action) => BigInt(action.amount) > max ? BigInt(action.amount) : max, 0n);
    return {
      reserveBalance: reserveBalance.toString(), openBondedExposure: openBondedExposure.toString(),
      coverageRatio: openBondedExposure === 0n ? null : Number(reserveBalance * 1000n / openBondedExposure) / 1000,
      cumulativeSlashes: slashes.reduce((sum, action) => sum + BigInt(action.bondPosted), 0n).toString(),
      cumulativeRefunds: refunds.reduce((sum, action) => sum + BigInt(action.bondPosted), 0n).toString(),
      maxSingleActionCoverage: maxSingle.toString(),
      largestPossibleUncoveredLoss: (maxSingle > reserveBalance ? maxSingle - reserveBalance : 0n).toString(),
      explanation: {
        bondCoverageRatio: 'Bond coverage is risk priced and does not represent full payout insurance.',
        reserveRole: 'The reserve tracks the pool share of verified slashes.',
        uncoveredCap: 'A payout above the available reserve and bond can have uncovered exposure.',
      },
    };
  });
  server.get('/api/verifiers', async () => listVerifiers(deployment));
  server.get('/api/verifiers/:faultClass', async (request) => {
    const found = verifier(
      (request.params as { faultClass: string }).faultClass,
      deployment,
    );
    if (!found) throw new ApiError(404, 'NOT_FOUND', 'verifier not found');
    return found;
  });
  server.post('/api/delivery-attestation', async (request) => {
    const input = deliveryAttestationSchema.parse(request.body);
    const action = repository.action(input.actionId);
    if (!action || action.invoiceId !== input.invoiceId) {
      throw new ApiError(409, 'ATTESTATION_MISMATCH', 'attestation does not match the action invoice');
    }
    if (input.occurredAt <= 0 || input.occurredAt > Date.now() + 60_000) {
      throw new ApiError(400, 'ATTESTATION_TIME_INVALID', 'attestation time is invalid');
    }
    const attestation = verifyDeliveryAttestation(input);
    repository.upsertDeliveryAttestation(attestation);
    return { success: true, attestation: { ...attestation, signature: attestation.signature } };
  });
  server.get('/api/proof/:id', async (request) => {
    const actionId = Number((request.params as { id: string }).id);
    const query = request.query as { controller?: string };
    const controller = query.controller === 'v1'
      ? deployment.contracts.controllerV1?.contractHash ?? currentController
      : currentController;
    const proof = proofFor(repository, actionId, controller, deployment);
    if (!proof) throw new ApiError(404, 'NOT_FOUND', 'completed proof not found');
    return proof;
  });
  server.get('/api/proofs/latest', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10) || 10));
    return repository.listActions().filter((action) => action.controllerHash === currentController && ['ResolvedSlash', 'ResolvedRefund'].includes(action.status))
      .sort((a, b) => b.actionId - a.actionId).slice(0, limit)
      .map((action) => proofFor(repository, action.actionId, currentController, deployment));
  });
  server.get('/api/proofs/featured', async () =>
    featuredProofs(repository, currentController, deployment));
  server.get('/api/proofs/canonical', async () => {
    const validation = await validateCanonical({
      repositoryPath,
      repository,
      deployment,
      controllerHash: currentController,
      actionId: canonicalActionId(),
    });
    if (!validation.ready) {
      throw new ApiError(
        503,
        'CANONICAL_NOT_READY',
        `canonical action ${validation.actionId} is not ready: ${validation.errors.join('; ')}`,
      );
    }
    const proof = canonicalProof(repository, currentController, deployment);
    if (!proof) throw new ApiError(404, 'NOT_FOUND', 'canonical proof not found');
    return proof;
  });
  server.get('/api/replay/canonical', async () =>
    canonicalReplay({
      repositoryPath,
      repository,
      deployment,
      controllerHash: currentController,
    }));
  server.post('/api/replay/canonical/quote-check', async () =>
    quoteReplayCheck({ repository, actionId: canonicalActionId() }));
  server.get('/api/receipt/:id', async (request) => {
    const actionId = Number((request.params as { id: string }).id);
    const receipt = await issueReceipt({
      repositoryPath,
      repository,
      actionId,
      controllerHash: currentController,
      deployment,
    });
    if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'completed receipt not found');
    return receipt;
  });
  server.get('/api/receipt/:id/verify', async (request) => {
    const actionId = Number((request.params as { id: string }).id);
    const receipt = await issueReceipt({
      repositoryPath,
      repository,
      actionId,
      controllerHash: currentController,
      deployment,
    });
    if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'completed receipt not found');
    return verifyReceipt(receipt);
  });
  server.post('/api/receipt/:id/verify', async (request) => verifyReceipt(request.body as PortableReceipt));
  server.get('/api/demo/ready', async (request) => {
    requireOperator(request);
    return demoReadyResponse(repository, currentController);
  },
  );
  server.get('/api/demo/proofs', async (request) => {
    requireOperator(request);
    const ready = demoReadyResponse(repository, currentController);
    const actions = repository.listActions();
    let totalSlashes = 0;
    let totalRefunds = 0;
    let totalSlashedBonds = 0n;
    for (const action of actions) {
      if (action.status === 'ResolvedSlash') {
        totalSlashes += 1;
        try {
          totalSlashedBonds += BigInt(action.bondPosted || '0');
        } catch {
          /* skip malformed amounts */
        }
      } else if (action.status === 'ResolvedRefund') {
        totalRefunds += 1;
      }
    }
    return {
      latestManualSlash: latestSlashProof(
        repository,
        currentController,
        'manual',
      ),
      latestWatchdogSlash: latestSlashProof(
        repository,
        currentController,
        'watchdog',
      ),
      readyCases: ready.cases,
      totals: {
        slashes: totalSlashes,
        refunds: totalRefunds,
        slashedBonds: totalSlashedBonds.toString(),
      },
    };
  });
  server.post('/v1/actions/quote', async (request, reply) => {
    const requirements = quoteRequirements(deployment);
    let paymentPayload;
    try {
      paymentPayload = parsePaymentHeader(request, requirements);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return sendPaymentRequired(reply, requirements, reason);
    }
    if (!paymentPayload) {
      return sendPaymentRequired(reply, requirements);
    }
    const settlement = await settleX402Payment({
      deployment,
      paymentPayload,
      paymentRequirements: requirements,
    });
    if (!settlement.success || !settlement.transaction) {
      const failure = x402SettlementFailure(settlement);
      return sendPaymentRequired(
        reply,
        requirements,
        failure.reason,
        failure.code,
        x402Diagnostics(paymentPayload, requirements),
      );
    }
    const facilitator = new URL(x402Config(deployment).facilitatorUrl).host;
    const amount = quoteAmount(request.body);
    const faultClass = quoteFaultClass(request.body);
    const quote = quoteResponse({
      repository,
      deployment,
      receipt: {
        amount: requirements.amount,
        transaction: settlement.transaction,
        facilitator,
        ...(settlement.payer ? { payer: settlement.payer } : {}),
      },
      ...(amount ? { amount } : {}),
      ...(faultClass ? { faultClass } : {}),
    });
    reply.header(
      'PAYMENT-RESPONSE',
      Buffer.from(JSON.stringify(quote.paymentReceipt)).toString('base64'),
    );
    return quote;
  });
  server.post('/v1/actions/submit', async (request) =>
    idempotency.run(request, 'paid-action-submit', async () => {
      const input = paidActionSubmitSchema.parse(request.body);
      const quote = repository.paidQuote(input.quoteHash);
      if (!quote) {
        throw new ApiError(404, 'QUOTE_NOT_FOUND', 'paid quote not found');
      }
      if (quote.status !== 'paid') {
        throw new ApiError(409, 'QUOTE_ALREADY_CONSUMED', 'paid quote is not available');
      }
      if (Date.parse(quote.quoteExpiry) <= Date.now()) {
        throw new ApiError(409, 'QUOTE_EXPIRED', 'paid quote has expired');
      }
      if (quote.faultClass !== input.faultClass) {
        throw new ApiError(409, 'QUOTE_FAULT_CLASS_MISMATCH', 'quote fault class does not match action');
      }
      if (
        input.faultClass === 'delivery_contradiction' &&
        !input.buyerPublicKey
      ) {
        throw new ApiError(400, 'BUYER_PUBLIC_KEY_REQUIRED', 'delivery contradiction requires buyerPublicKey');
      }
      if (!quote.payer) {
        throw new ApiError(409, 'QUOTE_PAYER_MISSING', 'paid quote does not include payer identity');
      }
      const currentPolicy = await assertQuotePolicyFresh({
        quote,
        readCurrentBondPolicy,
      });
      let submitAuth: { payer: string; nonceHash: string };
      try {
        submitAuth = verifySubmitAuthorization({
          authorization: input.submitAuthorization,
          expectedPayer: quote.payer,
          fields: {
            quoteHash: input.quoteHash,
            faultClass: input.faultClass,
            eventType: input.eventType,
            ...(input.buyerPublicKey
              ? { buyerPublicKey: input.buyerPublicKey }
              : {}),
          },
        });
      } catch (error) {
        throw new ApiError(
          401,
          'SUBMIT_AUTHORIZATION_INVALID',
          error instanceof Error
            ? error.message
            : 'submit authorization is invalid',
        );
      }
      if (!repository.useSubmitAuthorizationNonce({
        nonceHash: submitAuth.nonceHash,
        payer: submitAuth.payer,
        quoteHash: input.quoteHash,
      })) {
        throw new ApiError(409, 'SUBMIT_AUTHORIZATION_REPLAY', 'submit authorization nonce has already been used');
      }
      const payloadHash = submitPayloadHash({
        quoteHash: input.quoteHash,
        faultClass: input.faultClass,
        buyerPublicKey: input.buyerPublicKey ?? null,
        eventType: input.eventType,
        submitAuthorizationPublicKey: input.submitAuthorization.publicKey,
        submitAuthorizationNonce: input.submitAuthorization.nonce,
      });
      if (!repository.reservePaidQuote(input.quoteHash, payloadHash)) {
        throw new ApiError(409, 'QUOTE_ALREADY_CONSUMED', 'paid quote is not available');
      }
      try {
        const action = await arm.submitPaidAction({
          quoteHash: input.quoteHash,
          faultClass: input.faultClass,
          amount: quote.amount,
          ...(input.buyerPublicKey
            ? { buyerPublicKey: input.buyerPublicKey }
            : {}),
          eventType: input.eventType,
        });
        repository.consumePaidQuote(input.quoteHash, action.actionId);
        return {
          success: true,
          quoteHash: input.quoteHash,
          quote: {
            actionType: quote.actionType,
            faultClass: quote.faultClass,
            verifier: quote.verifier,
            requiredBond: quote.requiredBond,
            quotedMinimumBond: quote.requiredBond,
            expectedActualBond: currentPolicy.expectedActualBond,
            policySource: currentPolicy.source,
            bondEconomics: currentPolicy.bondEconomics,
            paymentReceipt: {
              network: 'casper-test',
              asset: 'WCSPR',
              amount: quote.paymentAmount,
              transaction: quote.settlementTx,
              facilitator: quote.facilitator,
              payer: quote.payer,
              settled: true,
            },
          },
          action,
        };
      } catch (error) {
        repository.releasePaidQuote(input.quoteHash);
        throw error;
      }
    }));
  server.post('/api/challenge', async (request) => idempotency.run(request, 'challenge', async () => {
    requireOperator(request);
    const { actionId } = actionBodySchema.parse(request.body);
    const action = repository.action(actionId);
    if (!action || !isChallengeEligible(action, currentController)) {
      const code = challengeIneligibilityCode(
        action,
        currentController,
      );
      throw new ApiError(409, code, 'action is not challengeable');
    }
    return jobs.startChallenge(actionId);
  }));
  server.get('/api/jobs/:id', async (request) => {
    requireOperator(request);
    const job = jobs.job((request.params as { id: string }).id);
    if (!job) {
      throw new ApiError(404, 'NOT_FOUND', 'demo job not found');
    }
    return job;
  });
  server.post('/api/resolve', async (request) => idempotency.run(request, 'resolve', async () => {
    requireOperator(request);
    const { actionId } = actionBodySchema.parse(request.body);
    return { resolve: await resolution.resolve(actionId) };
  }));
  server.get('/api/transactions/:hash', async (request) => {
    const hash = transactionHashSchema.parse(
      (request.params as { hash: string }).hash,
    );
    return walletChallenge.transactionStatus(hash);
  });
  server.post('/api/challenge/wallet-resolve', async (request) => idempotency.run(request, 'wallet-resolve', async () => {
    requireOperator(request);
    if (!publicWalletChallengeEnabled()) {
      throw new ApiError(
        403,
        'WALLET_CHALLENGE_DISABLED',
        'external wallet challenge resolution is disabled in production',
      );
    }
    const input = walletChallengeBodySchema.parse(request.body);
    return walletChallenge.resolveWalletChallenge(input);
  }));
  const armDemo = async (reservedForManual: boolean) => {
    try {
      return await arm.arm({ reservedForManual });
    } catch (error) {
      if (
        error instanceof Error &&
        'statusCode' in error &&
        error.statusCode === 503
      ) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : String(error);
      throw new ApiError(500, 'ARM_FAILED', message, { cause: error });
    }
  };
  server.post('/api/demo/arm', async (request) => idempotency.run(request, 'demo-arm', async () => {
    requireOperator(request);
    return armDemo(true);
  }));
  server.post('/api/demo/arm/async', async (request) => idempotency.run(request, 'demo-arm-async', async () => {
    requireOperator(request);
    return jobs.startArm(true);
  }));
  server.post('/api/demo/run-integrator', async (request) => idempotency.run(request, 'demo-integrator', async () => {
    requireOperator(request);
    return runIntegrator({
    baseUrl: `${String(request.headers['x-forwarded-proto'] ?? 'https').split(',')[0]}://${request.headers.host ?? request.hostname}`,
    deployment,
    repository,
    repositoryPath,
    });
  }));
  server.get('/api/watchdog', async () => {
    const summary = repository.watchdogSummary();
    return {
      ...summary,
      account:
        summary.account ??
        `account-hash-${deployment.accounts.watchdog.accountHash}`,
    };
  });
  server.post('/api/watchdog/demo', async (request) => idempotency.run(request, 'watchdog-demo', async () => {
    requireOperator(request);
    return armDemo(false);
  }));
  server.post('/api/watchdog/demo/async', async (request) => idempotency.run(request, 'watchdog-demo-async', async () => {
    requireOperator(request);
    return jobs.startArm(false);
  }));
  const verifySandbox = async (request: any, reply: any) => {
    const amount = process.env.X402_VERIFY_PRICE ?? '1000000';
    const payTo = deployment.accounts.challenger.publicKey;
    const requirement = paymentRequired(payTo, amount);
    let payment;
    try {
      payment = parseSandboxPayment(
        typeof request.headers['x-payment'] === 'string'
          ? request.headers['x-payment']
          : undefined,
        typeof request.headers['x-payment-network'] === 'string'
          ? request.headers['x-payment-network']
          : undefined,
        amount,
      );
    } catch {
      return reply
        .code(402)
        .header('X-Payment-Address', payTo)
        .header('X-Payment-Amount', amount)
        .header('X-Payment-Network', 'casper')
        .header('X-Payment-Simulated', 'true')
        .send({
          success: false,
          code: 'X402_SANDBOX',
          message: 'sandbox payment envelope required',
          payment: requirement,
        });
    }
    const verification = verifyClaimCollision(
      repository,
      verifyBodySchema.parse(request.body),
    );
    return {
      code: 'X402_SANDBOX',
      ...verification,
      payment: {
        mode: 'sandbox',
        simulated: true,
        settled: false,
        network: 'casper',
        amount: payment.amount,
        payer: payment.account,
        transactionHash: null,
      },
    };
  };
  server.post('/api/labs/x402-sandbox', verifySandbox);
  server.post('/api/verify', verifySandbox);
  server.get('/.well-known/agent.json', async () => ({
    name: 'Bondsman Gate',
    description: 'Bonded execution gateway for autonomous financial agents on Casper.',
    url: 'https://bondsman-backend-production.up.railway.app',
    provider: { organization: 'Bondsman', url: 'https://bondsman.vercel.app' },
    version: '1.0.0', capabilities: { streaming: true, pushNotifications: false },
    authentication: { schemes: ['x402'] }, defaultInputModes: ['application/json'], defaultOutputModes: ['application/json'],
    skills: [
      { id: 'design_assurance_policy', name: 'Design assurance policy', description: 'Design-only analysis that produces a portable assurance manifest without submitting transactions.', tags: ['design-only', 'assurance', 'policy'] },
      { id: 'quote_bonded_action', name: 'Quote a bonded action', description: 'x402-paid quote surface for supported bonded action classes.', tags: ['paid-http', 'quote', 'bonding'], examples: ['Quote a bond for a 50,000 invoice payout'] },
      { id: 'submit_bonded_action', name: 'Submit a bonded action', description: 'Production paid-action submission; requires a settled quote and payer submit authorization.', tags: ['paid-http', 'execution', 'operator-sensitive'] },
      { id: 'replay_canonical_proof', name: 'Replay canonical proof', description: 'Read-only replay of canonical Action 27 evidence, receipt, and quote consumption checks.', tags: ['read-only', 'canonical', 'proof'] },
      { id: 'verify_receipt', name: 'Verify a Bondsman receipt', description: 'Independently verify a signed Bondsman action receipt.', tags: ['read-only', 'verification', 'proof'] },
      { id: 'discover_verifiers', name: 'Discover verifiers', description: 'Read supported verifier metadata and implementation status.', tags: ['read-only', 'verifiers'] },
    ],
  }));
  server.get('/api/deployments', async () => deployment);
}
