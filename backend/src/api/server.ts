import Fastify, { type FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { registerRoutes } from './routes.js';
import { normalizeApiError } from './errors.js';
import type { WalletChallengeService } from './wallet-challenge.js';

export function buildServer(
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
  walletChallenge: WalletChallengeService,
): FastifyInstance {
  const server = Fastify({ logger: false });
  server.setErrorHandler((error, _request, reply) => {
    const normalized = normalizeApiError(error);
    return reply.code(normalized.statusCode).send({
      success: false,
      code: normalized.code,
      message: normalized.message,
    });
  });
  server.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({
      success: false,
      code: 'NOT_FOUND',
      message: 'route not found',
    }),
  );
  registerRoutes(
    server,
    repository,
    deployment,
    resolution,
    arm,
    walletChallenge,
  );
  return server;
}
