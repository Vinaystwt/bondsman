import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../backend/src/config/env.js';
import {
  ensureNamedKey,
  ensureSubaccountKeys,
  keyMetadata,
  loadPrivateKey,
} from '../backend/src/casper/keys.js';
import {
  createRpcClient,
  parseOdraContracts,
  resolveContractHash,
} from '../backend/src/casper/rpc.js';
import {
  fundToTarget,
  SUBACCOUNT_TARGET_MOTES,
} from '../backend/src/casper/funding.js';
import {
  deploymentSchema,
  type Deployment,
} from '../backend/src/shared/deployment.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(repository, '.env'), quiet: true });
const odraContractsPath = join(
  repository,
  'contracts/resources/casper-test-contracts.toml',
);
const deploymentPath = join(repository, 'deployments/testnet.json');

const contractNames = {
  mockCsprUsd: 'MockCsprUSD',
  bondVault: 'BondVault',
  controller: 'BondsmanController',
  invoicePool: 'InvoicePool',
} as const;

function runOdraDeploy(environment: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'cargo',
      [
        'run',
        '-p',
        'bondsman_cli',
        '--',
        'deploy',
        '--deploy-mode',
        'override',
      ],
      {
        cwd: join(repository, 'contracts'),
        env: environment,
        stdio: 'inherit',
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Odra deployment exited with code ${code}`));
    });
  });
}

async function atomicWrite(
  path: string,
  deployment: Deployment,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(deployment, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o644,
  });
  await rename(temporary, path);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const deployerPath = resolve(config.deployerSecretKeyPath);
  const deployer = await loadPrivateKey(deployerPath);
  const keys = await ensureSubaccountKeys(join(repository, '.keys'));
  const watchdog = await ensureNamedKey(
    join(repository, '.keys'),
    'watchdog',
  );
  const rpc = createRpcClient(config);

  if (config.usingPublicRpc) {
    console.warn(
      'Using the public Casper testnet RPC; event streaming may be degraded.',
    );
  }

  for (const [name, key] of [
    ['agent', keys.agent],
    ['challenger', keys.challenger],
    ['watchdog', watchdog],
  ] as const) {
    const hash = await fundToTarget(
      rpc,
      deployer,
      key.publicKey,
      SUBACCOUNT_TARGET_MOTES,
    );
    console.log(
      hash
        ? `Funded ${name}: deploy ${hash}`
        : `${name} already meets the CSPR funding target`,
    );
  }

  await runOdraDeploy({
    ...process.env,
    ODRA_CASPER_LIVENET_SECRET_KEY_PATH: deployerPath,
    ODRA_CASPER_LIVENET_NODE_ADDRESS: config.nodeAddress,
    ODRA_CASPER_LIVENET_EVENTS_URL: config.eventsUrl,
    ODRA_CASPER_LIVENET_CHAIN_NAME: config.chainName,
    ODRA_CASPER_LIVENET_KEY_1: join(repository, '.keys/agent.pem'),
    ODRA_CASPER_LIVENET_KEY_2: join(repository, '.keys/challenger.pem'),
    ...(config.cloudApiKey
      ? {
          ODRA_CASPER_LIVENET_CSPR_CLOUD_AUTH_TOKEN:
            config.cloudApiKey,
        }
      : {}),
  });

  const installed = parseOdraContracts(
    await readFile(odraContractsPath, 'utf8'),
  );
  const contracts = Object.fromEntries(
    await Promise.all(
      Object.entries(contractNames).map(async ([key, name]) => {
        const packageHash = installed[name];
        if (!packageHash) {
          throw new Error(`Odra did not record ${name}`);
        }
        return [
          key,
          {
            packageHash,
            contractHash: await resolveContractHash(rpc, packageHash),
          },
        ];
      }),
    ),
  ) as Deployment['contracts'];

  const deployment = deploymentSchema.parse({
    network: config.chainName,
    chainName: config.chainName,
    nodeRpcUrl: config.nodeRpcUrl,
    contracts,
    accounts: {
      deployer: keyMetadata(deployer),
      agent: keyMetadata(keys.agent),
      challenger: keyMetadata(keys.challenger),
      watchdog: keyMetadata(watchdog),
    },
  });
  await atomicWrite(deploymentPath, deployment);

  console.log(`Wrote ${deploymentPath}`);
  for (const [name, contract] of Object.entries(contracts)) {
    if (!contract) continue;
    console.log(`${name}: ${contract.contractHash}`);
    console.log(
      `  https://testnet.cspr.live/contract/${contract.contractHash.replace('hash-', '')}`,
    );
  }
}

await main();
