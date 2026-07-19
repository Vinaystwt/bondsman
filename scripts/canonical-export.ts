import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { deploymentSchema } from '../backend/src/shared/deployment.js';
import { applyActiveControllerVersion } from '../backend/src/shared/active-deployment.js';
import {
  deploymentDatabasePath,
  openDatabase,
} from '../backend/src/db/database.js';
import { Repository } from '../backend/src/db/repositories.js';
import {
  canonicalBundle,
  stableJson,
} from '../backend/src/evidence/replay.js';

const repositoryPath = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(repositoryPath, '.env'), quiet: true });

const deployment = applyActiveControllerVersion(deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repositoryPath, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
));
const dataPath = join(repositoryPath, '.data');
await mkdir(dataPath, { recursive: true });
const database = openDatabase(
  deploymentDatabasePath(dataPath, deployment.contracts.controller.contractHash),
);
const repository = new Repository(database);

try {
  const bundle = await canonicalBundle({
    repositoryPath,
    repository,
    deployment,
    controllerHash: deployment.contracts.controller.contractHash,
  });
  const docsPath = join(repositoryPath, 'docs');
  await mkdir(docsPath, { recursive: true });
  const target = join(docsPath, 'CANONICAL_ACTION_27_BUNDLE.json');
  await writeFile(target, `${stableJson(bundle)}\n`, 'utf8');
  console.log(JSON.stringify({
    success: true,
    actionId: bundle.actionId,
    checksum: bundle.checksum,
    target,
  }, null, 2));
} finally {
  database.close();
}
