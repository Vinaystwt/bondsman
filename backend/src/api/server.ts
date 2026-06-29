import Fastify, { type FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import { registerRoutes } from './routes.js';

export function buildServer(
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
): FastifyInstance {
  const server = Fastify({ logger: false });
  registerRoutes(server, repository, deployment, resolution);
  return server;
}
