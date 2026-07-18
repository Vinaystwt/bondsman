import Fastify, { type FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { registerRoutes } from './routes.js';
import { normalizeApiError } from './errors.js';
import type { WalletChallengeService } from './wallet-challenge.js';
import type { DemoJobService } from './demo-jobs.js';
import { registerRemoteMcp } from '../mcp/remote.js';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://bondsman.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function allowedOrigins(): Set<string> {
  const configured = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function isAllowedOrigin(origin: string, allowed: Set<string>): boolean {
  return allowed.has(origin) ||
    /^https:\/\/bondsman-[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

export function buildServer(
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
  walletChallenge: WalletChallengeService,
  jobs: DemoJobService,
  repositoryPath = process.cwd(),
): FastifyInstance {
  const server = Fastify({ logger: false });
  const origins = allowedOrigins();
  server.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    if (origin && isAllowedOrigin(origin, origins)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
      reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'content-type');
    }
    if (request.method === 'OPTIONS') {
      reply.code(origin && !isAllowedOrigin(origin, origins) ? 403 : 204).send();
      return;
    }
    done();
  });
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
    jobs,
    repositoryPath,
  );
  registerRemoteMcp(server, repository, deployment);
  return server;
}
