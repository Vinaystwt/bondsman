import type { FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import { actionBodySchema } from './schemas.js';

function explorer(hash: string): string {
  return `https://testnet.cspr.live/transaction/${hash}`;
}

export function registerRoutes(
  server: FastifyInstance,
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
): void {
  server.get('/api/invoices', async () => repository.listInvoices());
  server.get('/api/actions', async () => repository.listActions());
  server.get('/api/actions/:id', async (request, reply) => {
    const actionId = Number(
      (request.params as { id: string }).id,
    );
    const action = repository.action(actionId);
    if (!action) return reply.code(404).send({ error: 'not found' });
    return {
      ...action,
      events: repository.eventsForAction(actionId).map((event) => ({
        ...event,
        explorerLink: event.transactionHash
          ? explorer(event.transactionHash)
          : null,
      })),
      explorerLinks: Object.fromEntries(
        Object.entries(action.transactions).map(([key, hash]) => [
          key,
          explorer(hash),
        ]),
      ),
    };
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
  server.get('/api/deployments', async () => deployment);
}
