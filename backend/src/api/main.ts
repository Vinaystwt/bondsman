import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../config/env.js';
import { deploymentSchema } from '../shared/deployment.js';
import { applyActiveControllerVersion } from '../shared/active-deployment.js';
import {
  deploymentDatabasePath,
  openDatabase,
} from '../db/database.js';
import { Repository } from '../db/repositories.js';
import { reconcileChain } from '../listener/reconcile.js';
import { createResolutionService } from './resolution.js';
import { buildServer } from './server.js';
import { createDemoArmService } from './arm.js';
import { createDemoJobService } from './demo-jobs.js';
import { clearLegacyEvidence } from '../evidence/store.js';
import { createWalletChallengeService } from './wallet-challenge.js';
import {
  createDemoReadyPool,
  demoReadyPoolConfig,
} from './ready-pool.js';
import { getTransaction } from '../casper/transactions.js';
import { readContract } from '../casper/odra-cli.js';
import { activeContracts } from '../casper/contracts.js';
import {
  inspectStartupPort,
  startupDiagnostic,
} from './startup.js';
import { createFundingMonitor } from '../ops/funding-monitor.js';

const repositoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadDotenv({ path: join(repositoryPath, '.env'), quiet: true });
const dataDirectory = join(repositoryPath, '.data');
await mkdir(dataDirectory, { recursive: true });
const deployment = applyActiveControllerVersion(deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repositoryPath, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
));
const port = Number(process.env.PORT ?? 3001);
const startupState = await inspectStartupPort(
  port,
  deployment.contracts.controller.contractHash,
);
const diagnostic = startupDiagnostic(startupState);
if (diagnostic) {
  console.log(diagnostic);
  process.exit(startupState.kind === 'own-api' ? 0 : 1);
}
const database = openDatabase(
  deploymentDatabasePath(
    dataDirectory,
    deployment.contracts.controller.contractHash,
  ),
);
const repository = new Repository(database);
const config = loadConfig();
const contracts = activeContracts(deployment);
await clearLegacyEvidence(repositoryPath);
const reconcile = () => reconcileChain({
  repositoryPath,
  config,
  deployment,
  repository,
});
const resolution = createResolutionService(
  repositoryPath,
  config,
  deployment,
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
      contract: contracts.controller,
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
const armService = createDemoArmService(
  repositoryPath,
  config,
  deployment,
  repository,
  reconcile,
);
const jobs = createDemoJobService({
  repository,
  resolution,
  arm: armService,
});
const server = buildServer(
  repository,
  deployment,
  resolution,
  armService,
  walletChallenge,
  jobs,
  repositoryPath,
);
const host = process.env.HOST || '0.0.0.0';
await server.listen({ host, port });
console.log(`Bondsman API listening on http://${host}:${port}`);
createFundingMonitor({
  repositoryPath,
  config,
  deployment,
  repository,
}).start();
createDemoReadyPool({
  config: demoReadyPoolConfig(),
  repository,
  controllerHash: deployment.contracts.controller.contractHash,
  arm: armService,
}).start();
console.log('Initial chain reconciliation running in the background.');
void reconcile().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Initial chain reconciliation failed: ${message}`);
});
