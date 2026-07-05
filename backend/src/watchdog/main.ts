import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { callContract } from '../casper/odra-cli.js';
import {
  fundToTarget,
} from '../casper/funding.js';
import { loadPrivateKey } from '../casper/keys.js';
import { createRpcClient } from '../casper/rpc.js';
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
const deployer = await loadPrivateKey(
  resolve(config.deployerSecretKeyPath),
);
await fundToTarget(
  createRpcClient(config),
  deployer,
  watchdog.publicKey,
  100_000_000_000n,
);

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
    return { challenge, resolve };
  });
const service = createWatchdogService({
  repository,
  watchdogAddress,
  delayMs: Number(process.env.WATCHDOG_DELAY_MS ?? 30_000),
  transact,
  reasoning: watchdogReasoning,
  reconcile,
});

async function tick(): Promise<void> {
  repository.setWatchdogHeartbeat(watchdogAddress, Date.now());
  await reconcile();
  const catches = await service.scanOnce();
  repository.setWatchdogHeartbeat(watchdogAddress, Date.now());
  if (catches.length) console.log(JSON.stringify({ catches }));
}

const schedule = createSingleFlight(tick);
const run = () => void schedule().catch(console.error);
run();
setInterval(run, Number(process.env.WATCHDOG_POLL_MS ?? 5_000));
