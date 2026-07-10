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
import { verifyClaimCollision } from '../verify/service.js';
import {
  challengeIneligibilityCode,
  isChallengeEligible,
} from './eligibility.js';
import { ApiError } from './errors.js';
import type { WalletChallengeService } from './wallet-challenge.js';
import { demoReadyResponse } from './demo-ready.js';
import type { DemoJobService } from './demo-jobs.js';

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

export function registerRoutes(
  server: FastifyInstance,
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
  walletChallenge: WalletChallengeService,
  jobs: DemoJobService,
): void {
  const startedAt = Date.now();
  const currentController =
    deployment.contracts.controller.contractHash;
  server.get('/api/health', async () => {
    const watchdog = repository.watchdogSummary();
    return {
      ok: true,
      version: '0.1.0',
      controller: currentController,
      watchdog: { running: watchdog.running },
      uptimeSec: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      deploymentsPath: 'deployments/testnet.json',
    };
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
  server.post('/api/challenge', async (request) => {
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
  });
  server.get('/api/jobs/:id', async (request) => {
    const job = jobs.job((request.params as { id: string }).id);
    if (!job) {
      throw new ApiError(404, 'NOT_FOUND', 'demo job not found');
    }
    return job;
  });
  server.post('/api/resolve', async (request) => {
    const { actionId } = actionBodySchema.parse(request.body);
    return { resolve: await resolution.resolve(actionId) };
  });
  server.get('/api/transactions/:hash', async (request) => {
    const hash = transactionHashSchema.parse(
      (request.params as { hash: string }).hash,
    );
    return walletChallenge.transactionStatus(hash);
  });
  server.post('/api/challenge/wallet-resolve', async (request) => {
    const input = walletChallengeBodySchema.parse(request.body);
    return walletChallenge.resolveWalletChallenge(input);
  });
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
  server.post('/api/demo/arm', async () => armDemo(true));
  server.post('/api/demo/arm/async', async () => jobs.startArm(true));
  server.get('/api/watchdog', async () => {
    const summary = repository.watchdogSummary();
    return {
      ...summary,
      account:
        summary.account ??
        `account-hash-${deployment.accounts.watchdog.accountHash}`,
    };
  });
  server.post('/api/watchdog/demo', async () => armDemo(false));
  server.post('/api/watchdog/demo/async', async () => jobs.startArm(false));
  server.post('/api/verify', async (request, reply) => {
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
          code: 'PAYMENT_REQUIRED',
          message: 'sandbox payment envelope required',
          payment: requirement,
        });
    }
    const verification = verifyClaimCollision(
      repository,
      verifyBodySchema.parse(request.body),
    );
    return {
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
  });
  server.get('/api/deployments', async () => deployment);
}
