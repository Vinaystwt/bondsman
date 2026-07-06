import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../config/env.js';
import { deploymentSchema } from '../shared/deployment.js';
import {
  deploymentDatabasePath,
  openDatabase,
} from '../db/database.js';
import { Repository } from '../db/repositories.js';
import { reconcileChain } from '../listener/reconcile.js';
import { createResolutionService } from './resolution.js';
import { buildServer } from './server.js';
import { createDemoArmService } from './arm.js';
import { clearLegacyEvidence } from '../evidence/store.js';
import { createWalletChallengeService } from './wallet-challenge.js';
import { getTransaction } from '../casper/transactions.js';
import { readContract } from '../casper/odra-cli.js';

const repositoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadDotenv({ path: join(repositoryPath, '.env'), quiet: true });
const dataDirectory = join(repositoryPath, '.data');
await mkdir(dataDirectory, { recursive: true });
const deployment = deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repositoryPath, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
);
const database = openDatabase(
  deploymentDatabasePath(
    dataDirectory,
    deployment.contracts.controller.contractHash,
  ),
);
const repository = new Repository(database);
const config = loadConfig();
await clearLegacyEvidence(repositoryPath);
const reconcile = () => reconcileChain({
  repositoryPath,
  config,
  deployment,
  repository,
});
await reconcile();
const resolution = createResolutionService(
  repositoryPath,
  config,
  deployment.contracts.controller.contractHash,
  reconcile,
);
const walletChallenge = createWalletChallengeService({
  deployment,
  repository,
  getTransaction: (hash) => getTransaction(config, hash),
  readAction: async (actionId) => {
    const serialized = await readContract<string>({
      repository: repositoryPath,
      config,
      signerPath: join(repositoryPath, '.keys/agent.pem'),
      contract: 'BondsmanController',
      entrypoint: 'get_action',
      arguments: ['--action_id', String(actionId)],
    });
    const action = JSON.parse(serialized) as {
      status: string;
      challenger: string;
      bond_posted: string;
    };
    return {
      status: action.status,
      challenger: action.challenger,
      bondPosted: action.bond_posted,
    };
  },
  resolve: (actionId, evidence) =>
    resolution.resolve(actionId, evidence),
});
const server = buildServer(
  repository,
  deployment,
  resolution,
  createDemoArmService(
    repositoryPath,
    config,
    deployment,
    repository,
    reconcile,
  ),
  walletChallenge,
);
const port = Number(process.env.PORT ?? 3001);
await server.listen({ host: '127.0.0.1', port });
console.log(`Bondsman API listening on http://127.0.0.1:${port}`);
