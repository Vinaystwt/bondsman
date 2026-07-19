import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { deploymentSchema } from '../shared/deployment.js';
import { applyActiveControllerVersion } from '../shared/active-deployment.js';
import { deploymentDatabasePath, openDatabase } from '../db/database.js';
import { Repository } from '../db/repositories.js';
import { runIntegrator } from './service.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
loadDotenv({ path: join(root, '.env'), quiet: true });
const deployment = applyActiveControllerVersion(deploymentSchema.parse(JSON.parse(await readFile(join(root, 'deployments/testnet.json'), 'utf8'))));
const repository = new Repository(openDatabase(deploymentDatabasePath(join(root, '.data'), deployment.contracts.controller.contractHash)));
const result = await runIntegrator({
  baseUrl: process.env.BONDSMAN_BASE_URL ?? 'https://bondsman-backend-production.up.railway.app',
  deployment, repository, repositoryPath: root,
});
console.log(JSON.stringify(result, null, 2));
