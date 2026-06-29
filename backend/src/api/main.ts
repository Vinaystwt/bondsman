import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../config/env.js';
import { deploymentSchema } from '../shared/deployment.js';
import { openDatabase } from '../db/database.js';
import { Repository } from '../db/repositories.js';
import { reconcileChain } from '../listener/reconcile.js';
import { createResolutionService } from './resolution.js';
import { buildServer } from './server.js';

const repositoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadDotenv({ path: join(repositoryPath, '.env'), quiet: true });
const dataDirectory = join(repositoryPath, '.data');
await mkdir(dataDirectory, { recursive: true });
const database = openDatabase(join(dataDirectory, 'bondsman.sqlite'));
const repository = new Repository(database);
const deployment = deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repositoryPath, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
);
const config = loadConfig();
await reconcileChain({
  repositoryPath,
  config,
  deployment,
  repository,
});
const server = buildServer(
  repository,
  deployment,
  createResolutionService(repositoryPath, config),
);
const port = Number(process.env.PORT ?? 3001);
await server.listen({ host: '127.0.0.1', port });
console.log(`Bondsman API listening on http://127.0.0.1:${port}`);
