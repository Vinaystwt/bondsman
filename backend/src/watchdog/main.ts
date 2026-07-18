import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { callContract } from '../casper/odra-cli.js';
import { loadPrivateKey } from '../casper/keys.js';
import { SignerQueue } from '../casper/signer-queue.js';
import { loadConfig } from '../config/env.js';
import {
  deploymentDatabasePath,
  openDatabase,
} from '../db/database.js';
import { Repository } from '../db/repositories.js';
import { reconcileChain } from '../listener/reconcile.js';
import { deploymentSchema } from '../shared/deployment.js';
import { watchdogReasoning } from './reasoning.js';
import {
  createSingleFlight,
  createWatchdogService,
} from './service.js';
import { mergeActionTransactions } from '../evidence/store.js';

const repositoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadDotenv({ path: join(repositoryPath, '.env'), quiet: true });
const config = loadConfig();
const deployment = deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repositoryPath, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
);
const dataDirectory = join(repositoryPath, '.data');
await mkdir(dataDirectory, { recursive: true });
const repository = new Repository(
  openDatabase(
    deploymentDatabasePath(
      dataDirectory,
      deployment.contracts.controller.contractHash,
    ),
  ),
);
const watchdogPath = join(repositoryPath, '.keys/watchdog.pem');
const watchdog = await loadPrivateKey(watchdogPath);
if (
  watchdog.publicKey.toHex() !== deployment.accounts.watchdog.publicKey
) {
  throw new Error('watchdog key does not match deployment metadata');
}

const watchdogAddress =
  `account-hash-${deployment.accounts.watchdog.accountHash}`;
const reconcile = () =>
  reconcileChain({
    repositoryPath,
    config,
    deployment,
    repository,
  });
const signerQueue = new SignerQueue();
const transact = (actionId: number) =>
  signerQueue.run(async () => {
    const challenge = await callContract({
      repository: repositoryPath,
      config,
      signerPath: watchdogPath,
      contract: 'BondsmanController',
      entrypoint: 'challenge_action',
      arguments: ['--action_id', String(actionId)],
    });
    const resolve = await callContract({
      repository: repositoryPath,
      config,
      signerPath: watchdogPath,
      contract: 'BondsmanController',
      entrypoint: 'resolve_action',
      arguments: ['--action_id', String(actionId)],
    });
    await mergeActionTransactions(
      repositoryPath,
      deployment.contracts.controller.contractHash,
      actionId,
      { challenge, resolve },
    );
    return { challenge, resolve };
  });
const service = createWatchdogService({
  repository,
  watchdogAddress,
  delayMs: Number(process.env.WATCHDOG_DELAY_MS ?? 30_000),
  transact,
  reasoning: watchdogReasoning,
});

async function tick(): Promise<void> {
  repository.setWatchdogHeartbeat(watchdogAddress, Date.now());
  const catches = await service.scanOnce();
  repository.setWatchdogHeartbeat(watchdogAddress, Date.now());
  if (catches.length) console.log(JSON.stringify({ catches }));
  // The listener owns projection freshness. Reconcile only after this worker
  // actually submits a catch so it can attach the resulting transaction data.
  if (catches.length) await reconcile();
  repository.setWatchdogHeartbeat(watchdogAddress, Date.now());
}

const schedule = createSingleFlight(tick);
const run = () => void schedule().catch(console.error);
run();
setInterval(run, Number(process.env.WATCHDOG_POLL_MS ?? 60_000));
