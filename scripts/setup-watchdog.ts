import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import {
  ensureNamedKey,
  keyMetadata,
  loadPrivateKey,
} from '../backend/src/casper/keys.js';
import {
  fundToTarget,
} from '../backend/src/casper/funding.js';
import {
  accountBalanceMotes,
  createRpcClient,
} from '../backend/src/casper/rpc.js';
import { loadConfig } from '../backend/src/config/env.js';
import {
  deploymentSchema,
  type Deployment,
} from '../backend/src/shared/deployment.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(repository, '.env'), quiet: true });
const WATCHDOG_TARGET_MOTES = 200_000_000_000n;
const DEPLOYER_TRANSFER_TARGET_MOTES = 220_000_000_000n;

async function atomicWrite(
  path: string,
  deployment: Deployment,
): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(deployment, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o644,
  });
  await rename(temporary, path);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const deploymentPath = join(repository, 'deployments/testnet.json');
  const current = JSON.parse(
    await readFile(deploymentPath, 'utf8'),
  ) as Record<string, unknown>;
  const watchdog = await ensureNamedKey(
    join(repository, '.keys'),
    'watchdog',
  );
  const deployer = await loadPrivateKey(
    resolve(config.deployerSecretKeyPath),
  );
  const challenger = await loadPrivateKey(
    join(repository, '.keys/challenger.pem'),
  );
  const rpc = createRpcClient(config);
  const deployerBalance = await accountBalanceMotes(
    rpc,
    deployer.publicKey,
  );
  let deployerTopUp: string | undefined;
  if (deployerBalance < DEPLOYER_TRANSFER_TARGET_MOTES) {
    deployerTopUp = await fundToTarget(
      rpc,
      challenger,
      deployer.publicKey,
      DEPLOYER_TRANSFER_TARGET_MOTES,
    );
  }
  const fundingTransaction = await fundToTarget(
    rpc,
    deployer,
    watchdog.publicKey,
    WATCHDOG_TARGET_MOTES,
  );
  const watchdogBalance = await accountBalanceMotes(
    rpc,
    watchdog.publicKey,
  );
  if (watchdogBalance < WATCHDOG_TARGET_MOTES) {
    throw new Error('watchdog funding transaction did not reach target');
  }
  const deployment = deploymentSchema.parse({
    ...current,
    accounts: {
      ...(current.accounts as Record<string, unknown>),
      watchdog: keyMetadata(watchdog),
    },
  });
  await atomicWrite(deploymentPath, deployment);
  console.log(
    JSON.stringify({
      account: deployment.accounts.watchdog,
      balanceMotes: watchdogBalance.toString(),
      deployerTopUp: deployerTopUp ?? null,
      fundingTransaction: fundingTransaction ?? null,
    }),
  );
}

await main();
