import type { FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { actionDetail } from './action-detail.js';
import {
  actionBodySchema,
  verifyBodySchema,
} from './schemas.js';
import {
  parseSandboxPayment,
  paymentRequired,
} from '../verify/payment.js';
import { verifyClaimCollision } from '../verify/service.js';

export function registerRoutes(
  server: FastifyInstance,
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
): void {
  server.get('/api/invoices', async () => repository.listInvoices());
  server.get('/api/actions', async () => repository.listActions());
  server.get('/api/actions/:id', async (request, reply) => {
    const actionId = Number(
      (request.params as { id: string }).id,
    );
    const detail = actionDetail(repository, actionId);
    if (!detail) return reply.code(404).send({ error: 'not found' });
    return detail;
  });
  server.get('/api/agents/:address', async (request, reply) => {
    const address = (request.params as { address: string }).address;
    const reputation = repository.reputation(address);
    if (!reputation) {
      return reply.code(404).send({ error: 'not found' });
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
  server.post('/api/challenge', async (request) => {
    const { actionId } = actionBodySchema.parse(request.body);
    return resolution.challengeAndResolve(actionId);
  });
  server.post('/api/resolve', async (request) => {
    const { actionId } = actionBodySchema.parse(request.body);
    return { resolve: await resolution.resolve(actionId) };
  });
  server.post('/api/demo/arm', async () =>
    arm.arm({ reservedForManual: true }),
  );
  server.get('/api/watchdog', async () => {
    const summary = repository.watchdogSummary();
    return {
      ...summary,
      account:
        summary.account ??
        `account-hash-${deployment.accounts.watchdog.accountHash}`,
    };
  });
  server.post('/api/watchdog/demo', async () =>
    arm.arm({ reservedForManual: false }),
  );
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
        .send({ error: 'payment required', payment: requirement });
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
