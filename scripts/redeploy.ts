import { spawn } from 'node:child_process';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../backend/src/config/env.js';
import {
  parseOdraContracts,
  createRpcClient,
  resolveContractHash,
} from '../backend/src/casper/rpc.js';
import {
  deploymentSchema,
  type Deployment,
} from '../backend/src/shared/deployment.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(
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

export function retainTokenContract(
  source: string,
  expectedPackageHash: string,
): string {
  const blocks = source.split('[[contracts]]');
  const token = blocks
    .slice(1)
    .find((block) => /^\s*name\s*=\s*"MockCsprUSD"/m.test(block));
  const packageHash = token?.match(
    /^\s*package_hash\s*=\s*"(hash-[0-9a-f]{64})"/m,
  )?.[1];
  if (!token || packageHash !== expectedPackageHash) {
    throw new Error('token package hash does not match deployment');
  }
  const header = blocks[0]?.trim() ?? '';
  return `${header}\n\n[[contracts]]${token.trimEnd()}\n`;
}

export function prepareRedeployRegistry(
  source: string,
  priorPackages: Record<string, string>,
): string {
  const blocks = source.split('[[contracts]]');
  const header = blocks[0]?.trim() ?? '';
  const kept = blocks.slice(1).filter((block) => {
    const name = block.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
    const packageHash = block.match(
      /^\s*package_hash\s*=\s*"(hash-[0-9a-f]{64})"/m,
    )?.[1];
    if (!name || !packageHash) return false;
    if (name === 'MockCsprUSD') {
      if (packageHash !== priorPackages.MockCsprUSD) {
        throw new Error('token package hash does not match deployment');
      }
      return true;
    }
    return packageHash !== priorPackages[name];
  });
  return [
    header,
    ...kept.map((block) => `[[contracts]]${block.trimEnd()}`),
    '',
  ].join('\n\n');
}

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
        'default',
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
  value: Deployment,
): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o644,
  });
  await rename(temporary, path);
}

export async function redeploy(): Promise<Deployment> {
  loadDotenv({ path: join(repository, '.env'), quiet: true });
  const config = loadConfig();
  const prior = deploymentSchema.parse(
    JSON.parse(await readFile(deploymentPath, 'utf8')),
  );
  const registry = prepareRedeployRegistry(
    await readFile(registryPath, 'utf8'),
    {
      MockCsprUSD: prior.contracts.mockCsprUsd.packageHash,
      BondVault: prior.contracts.bondVault.packageHash,
      BondsmanController: prior.contracts.controller.packageHash,
      InvoicePool: prior.contracts.invoicePool.packageHash,
    },
  );
  await writeFile(registryPath, registry, 'utf8');

  await runOdraDeploy({
    ...process.env,
    ODRA_CASPER_LIVENET_SECRET_KEY_PATH: resolve(
      config.deployerSecretKeyPath,
    ),
    ODRA_CASPER_LIVENET_NODE_ADDRESS: config.nodeAddress,
    ODRA_CASPER_LIVENET_EVENTS_URL: config.eventsUrl,
    ODRA_CASPER_LIVENET_CHAIN_NAME: config.chainName,
    ODRA_CASPER_LIVENET_KEY_1: join(repository, '.keys/agent.pem'),
    ODRA_CASPER_LIVENET_KEY_2: join(
      repository,
      '.keys/challenger.pem',
    ),
    ...(config.cloudApiKey
      ? {
          ODRA_CASPER_LIVENET_CSPR_CLOUD_AUTH_TOKEN:
            config.cloudApiKey,
        }
      : {}),
  });

  const installed = parseOdraContracts(
    await readFile(registryPath, 'utf8'),
  );
  if (
    installed.MockCsprUSD !== prior.contracts.mockCsprUsd.packageHash
  ) {
    throw new Error('redeployment changed the token package hash');
  }
  const rpc = createRpcClient(config);
  const contracts = Object.fromEntries(
    await Promise.all(
      Object.entries(contractNames).map(async ([key, name]) => {
        const packageHash = installed[name];
        if (!packageHash) throw new Error(`Odra did not record ${name}`);
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
    ...prior,
    nodeRpcUrl: config.nodeRpcUrl,
    contracts,
  });
  await atomicWrite(deploymentPath, deployment);
  console.log(JSON.stringify(deployment.contracts, null, 2));
  return deployment;
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await redeploy();
}
