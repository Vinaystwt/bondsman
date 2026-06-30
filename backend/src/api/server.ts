import Fastify, { type FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { ResolutionService } from './resolution.js';
import type { DemoArmService } from './arm.js';
import { registerRoutes } from './routes.js';

export function buildServer(
  repository: Repository,
  deployment: Deployment,
  resolution: ResolutionService,
  arm: DemoArmService,
): FastifyInstance {
  const server = Fastify({ logger: false });
  registerRoutes(server, repository, deployment, resolution, arm);
  return server;
}
