import type { FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { actionDetail } from './action-detail.js';
import {
  actionBodySchema,
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
  x402Config,
} from '../verify/x402.js';
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
import { featuredProofs, proofFor } from '../proofs/service.js';
import { issueReceipt, verifyReceipt, type PortableReceipt } from '../receipts/service.js';
import { runIntegrator } from '../integrator/service.js';
import { spendSnapshot } from '../ops/spend-guard.js';
import { dailyOpsSummary, recentApiErrors } from '../ops/observability.js';
import { createIdempotencyStore } from './idempotency.js';

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

export function registerRoutes(
  server: FastifyInstance,
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
  walletChallenge: WalletChallengeService,
  jobs: DemoJobService,
  repositoryPath = process.cwd(),
): void {
  const startedAt = Date.now();
  const idempotency = createIdempotencyStore();
  const currentController =
    deployment.contracts.controller.contractHash;
  server.get('/api/health', async () => {
    const watchdog = repository.watchdogSummary();
    const spending = spendSnapshot();
    return {
      ok: !spending.tripped,
      version: '0.2.0',
      controller: currentController,
      controllerVersion: deployment.current ?? (deployment.contracts.controllerV2 ? 'v2' : 'v1'),
      activeControllerVersion: deployment.current ?? (deployment.contracts.controllerV2 ? 'v2' : 'v1'),
      spending,
      daily: {
        ...dailyOpsSummary(),
        actions: repository.listActions().filter((action) => action.controllerHash === currentController).length,
        slashes: repository.listActions().filter((action) => action.controllerHash === currentController && action.status === 'ResolvedSlash').length,
        reserve: repository.reserve(),
      },
      watchdog: { running: watchdog.running, lastCatch: watchdog.recentCatches[0]?.timestamp ?? null, totalEarned: watchdog.totalRewardEarned },
      integrator: repository.systemState<{ lastRun?: string }>('integrator')?.value ?? { running: false, lastRun: null },
      listener: repository.systemState('listener')?.value ?? { running: false },
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
  server.get('/api/ops/spend', async () => spendSnapshot());
  server.get('/api/ops/recent-errors', async () => ({
    success: true,
    errors: recentApiErrors(),
  }));
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
    const proof = proofFor(repository, actionId, controller);
    if (!proof) throw new ApiError(404, 'NOT_FOUND', 'completed proof not found');
    return proof;
  });
  server.get('/api/proofs/latest', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10) || 10));
    return repository.listActions().filter((action) => action.controllerHash === currentController && ['ResolvedSlash', 'ResolvedRefund'].includes(action.status))
      .sort((a, b) => b.actionId - a.actionId).slice(0, limit)
      .map((action) => proofFor(repository, action.actionId, currentController));
  });
  server.get('/api/proofs/featured', async () => featuredProofs(repository, currentController));
  server.get('/api/receipt/:id', async (request) => {
    const actionId = Number((request.params as { id: string }).id);
    const receipt = await issueReceipt({ repositoryPath, repository, actionId, controllerHash: currentController });
    if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'completed receipt not found');
    return receipt;
  });
  server.get('/api/receipt/:id/verify', async (request) => {
    const actionId = Number((request.params as { id: string }).id);
    const receipt = await issueReceipt({ repositoryPath, repository, actionId, controllerHash: currentController });
    if (!receipt) throw new ApiError(404, 'NOT_FOUND', 'completed receipt not found');
    return verifyReceipt(receipt);
  });
  server.post('/api/receipt/:id/verify', async (request) => verifyReceipt(request.body as PortableReceipt));
  server.get('/api/demo/ready', async () =>
    demoReadyResponse(repository, currentController),
  );
  server.get('/api/demo/proofs', async () => {
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
      const reason = [
        settlement.errorReason ?? 'settlement_failed',
        settlement.errorMessage,
      ].filter(Boolean).join(': ');
      return sendPaymentRequired(
        reply,
        requirements,
        reason || 'x402 settlement failed',
      );
    }
    const facilitator = new URL(x402Config(deployment).facilitatorUrl).host;
    const amount = quoteAmount(request.body);
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
    });
    reply.header(
      'PAYMENT-RESPONSE',
      Buffer.from(JSON.stringify(quote.paymentReceipt)).toString('base64'),
    );
    return quote;
  });
  server.post('/api/challenge', async (request) => idempotency.run(request, 'challenge', async () => {
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
    const job = jobs.job((request.params as { id: string }).id);
    if (!job) {
      throw new ApiError(404, 'NOT_FOUND', 'demo job not found');
    }
    return job;
  });
  server.post('/api/resolve', async (request) => idempotency.run(request, 'resolve', async () => {
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
  server.post('/api/demo/arm', async (request) => idempotency.run(request, 'demo-arm', async () => armDemo(true)));
  server.post('/api/demo/arm/async', async (request) => idempotency.run(request, 'demo-arm-async', async () => jobs.startArm(true)));
  server.post('/api/demo/run-integrator', async (request) => idempotency.run(request, 'demo-integrator', async () => runIntegrator({
    baseUrl: `${String(request.headers['x-forwarded-proto'] ?? 'https').split(',')[0]}://${request.headers.host ?? request.hostname}`,
    deployment,
    repository,
    repositoryPath,
  })));
  server.get('/api/watchdog', async () => {
    const summary = repository.watchdogSummary();
    return {
      ...summary,
      account:
        summary.account ??
        `account-hash-${deployment.accounts.watchdog.accountHash}`,
    };
  });
  server.post('/api/watchdog/demo', async (request) => idempotency.run(request, 'watchdog-demo', async () => armDemo(false)));
  server.post('/api/watchdog/demo/async', async (request) => idempotency.run(request, 'watchdog-demo-async', async () => jobs.startArm(false)));
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
      { id: 'quote_bonded_action', name: 'Quote a bonded action', description: 'Get a risk priced bond quote for an autonomous financial action.', tags: ['bonding', 'risk', 'autonomous'], examples: ['Quote a bond for a 50,000 invoice payout'] },
      { id: 'submit_bonded_action', name: 'Submit a bonded action', description: 'Post a bond and execute a payout under Bondsman accountability.', tags: ['execution', 'bonding'] },
      { id: 'verify_receipt', name: 'Verify a Bondsman receipt', description: 'Independently verify a signed Bondsman action receipt.', tags: ['verification', 'proof'] },
    ],
  }));
  server.get('/api/deployments', async () => deployment);
}
