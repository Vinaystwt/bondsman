import Fastify, { type FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { registerRoutes } from './routes.js';
import type { CurrentBondPolicyReader } from './routes.js';
import type { TextModelClient } from '../assurance/service.js';
import { normalizeApiError } from './errors.js';
import type { WalletChallengeService } from './wallet-challenge.js';
import type { DemoJobService } from './demo-jobs.js';
import { registerRemoteMcp } from '../mcp/remote.js';
import {
  recordApiError,
  recordRequest,
  type RequestLogEntry,
} from '../ops/observability.js';

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
  readCurrentBondPolicy?: CurrentBondPolicyReader,
  assuranceModelClient?: TextModelClient,
): FastifyInstance {
  const server = Fastify({ logger: false });
  const origins = allowedOrigins();
  const requestStarted = new WeakMap<object, number>();
  const mutationHits = new Map<string, { count: number; resetAt: number }>();
  const mutationLimit = Number(process.env.API_MUTATION_RATE_LIMIT_PER_MINUTE ?? 10);
  const isMutatingPath = (method: string, path: string) =>
    method !== 'GET' && (
      path.startsWith('/api/demo/') ||
      path.startsWith('/api/challenge') ||
      path.startsWith('/api/resolve') ||
      path.startsWith('/api/watchdog/demo') ||
      path.startsWith('/api/delivery-attestation') ||
      path.startsWith('/api/receipt/') ||
      path.startsWith('/api/verify') ||
      path.startsWith('/api/labs/') ||
      path.startsWith('/v1/actions/')
    );
  server.addHook('onRequest', (request, reply, done) => {
    requestStarted.set(request, Date.now());
    const origin = request.headers.origin;
    if (origin && isAllowedOrigin(origin, origins)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
      reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      reply.header(
        'Access-Control-Allow-Headers',
        'authorization,content-type,payment-signature,x-payment,idempotency-key,x-idempotency-key',
      );
      reply.header(
        'Access-Control-Expose-Headers',
        'PAYMENT-REQUIRED,PAYMENT-RESPONSE,X-Payment-Required',
      );
    }
    if (request.method === 'OPTIONS') {
      reply.code(origin && !isAllowedOrigin(origin, origins) ? 403 : 204).send();
      return;
    }
    if (isMutatingPath(request.method, request.url)) {
      const key = `${request.ip}:${request.method}:${request.url.split('?')[0]}`;
      const now = Date.now();
      const hit = mutationHits.get(key);
      const current =
        hit && hit.resetAt > now ? hit : { count: 0, resetAt: now + 60_000 };
      current.count += 1;
      mutationHits.set(key, current);
      if (current.count > mutationLimit) {
        reply.code(429).send({
          success: false,
          code: 'RATE_LIMITED',
          message: 'too many mutating requests',
        });
        return;
      }
    }
    done();
  });
  server.addHook('onResponse', (request, reply, done) => {
    recordRequest();
    const durationMs = Date.now() - (requestStarted.get(request) ?? Date.now());
    const body =
      request.body && typeof request.body === 'object'
        ? (request.body as Record<string, unknown>)
        : undefined;
    const entry: RequestLogEntry = {
      event: 'api_request',
      method: request.method,
      path: request.url.split('?')[0] ?? request.url,
      statusCode: reply.statusCode,
      durationMs,
      ...(request.id ? { requestId: request.id } : {}),
      ...(typeof body?.actionId === 'number' ? { actionId: body.actionId } : {}),
    };
    console.log(JSON.stringify(entry));
    done();
  });
  server.setErrorHandler((error, request, reply) => {
    const normalized = normalizeApiError(error);
    recordApiError({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url.split('?')[0] ?? request.url,
      code: normalized.code,
      statusCode: normalized.statusCode,
      message: normalized.message,
      ...(request.id ? { requestId: request.id } : {}),
    });
    return reply.code(normalized.statusCode).send({
      success: false,
      code: normalized.code,
      message: normalized.message,
    });
  });
  server.setNotFoundHandler((request, reply) => {
    recordApiError({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url.split('?')[0] ?? request.url,
      code: 'NOT_FOUND',
      statusCode: 404,
      message: 'route not found',
      ...(request.id ? { requestId: request.id } : {}),
    });
    return reply.code(404).send({
      success: false,
      code: 'NOT_FOUND',
      message: 'route not found',
    });
  });
  registerRoutes(
    server,
    repository,
    deployment,
    resolution,
    arm,
    walletChallenge,
    jobs,
    repositoryPath,
    readCurrentBondPolicy,
    assuranceModelClient,
  );
  registerRemoteMcp(server, repository, deployment);
  return server;
}
