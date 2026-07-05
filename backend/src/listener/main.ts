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
import {
  reconcileChain,
  resolveExpiredClean,
} from './reconcile.js';
import { streamEventWakeups } from './event-stream.js';

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
const options = {
  repositoryPath,
  config: loadConfig(),
  deployment,
  repository,
};

async function tick(): Promise<void> {
  await reconcileChain(options);
  const hashes = await resolveExpiredClean(options);
  console.log(
    JSON.stringify({
      reconciledAt: new Date().toISOString(),
      resolved: hashes,
    }),
  );
}

await tick();
if (!process.argv.includes('--once')) {
  let queue = Promise.resolve();
  let debounce: NodeJS.Timeout | undefined;
  const scheduleTick = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      queue = queue.then(tick).catch(console.error);
    }, 500);
  };
  setInterval(scheduleTick, 20_000);
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  void streamEventWakeups(
    options.config,
    scheduleTick,
    controller.signal,
  ).catch(console.error);
}
