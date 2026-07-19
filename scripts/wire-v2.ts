import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import casperSdk from 'casper-js-sdk';
import { loadConfig, publicFallbackConfig } from '../backend/src/config/env.js';
import { loadPrivateKey } from '../backend/src/casper/keys.js';
import {
  createRpcClient,
  parseOdraContracts,
  resolveContractHash,
} from '../backend/src/casper/rpc.js';
import {
  getTransaction,
  transactionFinality,
} from '../backend/src/casper/transactions.js';
import { deploymentSchema, type Deployment } from '../backend/src/shared/deployment.js';

const {
  Args,
  CLValue,
  ContractCallBuilder,
  Key,
  RpcClient,
  HttpHandler,
} = casperSdk;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(root, 'contracts/resources/casper-test-contracts.toml');
const deploymentPath = join(root, 'deployments/testnet.json');
const UNIT = 1_000_000_000n;

function hash(value: string): string {
  return value.replace(/^hash-/, '');
}

function address(value: string) {
  return CLValue.newCLKey(Key.newKey(value));
}

function u256(value: bigint | string) {
  return CLValue.newCLUInt256(String(value));
}

async function waitFor(config: ReturnType<typeof publicFallbackConfig>, tx: string) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const raw = await getTransaction(config, tx);
    const finality = transactionFinality(raw, tx);
    if (finality.final) {
      if (!finality.success) throw new Error(finality.error ?? 'transaction failed');
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
  }
  throw new Error(`timed out waiting for ${tx}`);
}

async function call(options: {
  config: ReturnType<typeof publicFallbackConfig>;
  signerPath: string;
  packageHash: string;
  entryPoint: string;
  args: Record<string, InstanceType<typeof CLValue>>;
  gas?: number;
  allowAlreadyFinalized?: boolean;
}) {
  const privateKey = await loadPrivateKey(options.signerPath);
  const transaction = new ContractCallBuilder()
    .from(privateKey.publicKey)
    .byPackageHash(hash(options.packageHash))
    .entryPoint(options.entryPoint)
    .runtimeArgs(Args.fromMap(options.args))
    .chainName(options.config.chainName)
    .payment(options.gas ?? 50_000_000_000)
    .build();
  transaction.sign(privateKey);
  const client = new RpcClient(new HttpHandler(options.config.nodeRpcUrl, 'fetch'));
  const result = await client.putTransaction(transaction);
  const tx = result.transactionHash.toHex();
  console.log(`${options.entryPoint}: submitted ${tx}`);
  try {
    await waitFor(options.config, tx);
    console.log(`${options.entryPoint}: ${tx}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      options.allowAlreadyFinalized &&
      /ControllerFinalized|PoolFinalized|User error: (7|7007)/i.test(message)
    ) {
      console.log(`${options.entryPoint}: already finalized (${tx})`);
      return tx;
    }
    throw new Error(`${options.entryPoint} failed (${tx}): ${message}`);
  }
  return tx;
}

async function main() {
  loadDotenv({ path: join(root, '.env'), quiet: true });
  const config = publicFallbackConfig(loadConfig());
  const prior = deploymentSchema.parse(
    JSON.parse(await readFile(deploymentPath, 'utf8')),
  );
  const installed = parseOdraContracts(await readFile(registryPath, 'utf8'));
  const rpc = createRpcClient(config);
  const contract = async (name: string) => {
    const packageHash = installed[name];
    if (!packageHash) throw new Error(`missing deployed ${name}`);
    return {
      packageHash,
      contractHash: await resolveContractHash(rpc, packageHash),
    };
  };
  const v2 = {
    mockCsprUsd: prior.contracts.mockCsprUsd,
    bondVault: await contract('BondVaultV2'),
    controller: await contract('BondsmanControllerV2'),
    invoicePool: await contract('InvoicePoolV2'),
    verifiers: {
      duplicateClaim: await contract('DuplicateClaimVerifierV2'),
      deliveryContradiction: await contract('DeliveryContradictionVerifierV2'),
    },
  };
  const signerPath = resolve(config.deployerSecretKeyPath);
  if (process.env.V2_RESUME_MINTS !== 'true') {
    await call({
      config,
      signerPath,
      packageHash: v2.bondVault.packageHash,
      entryPoint: 'set_controller',
      args: { controller: address(v2.controller.packageHash) },
      allowAlreadyFinalized: true,
    });
    await call({
      config,
      signerPath,
      packageHash: v2.controller.packageHash,
      entryPoint: 'set_pool',
      args: { pool: address(v2.invoicePool.packageHash) },
      allowAlreadyFinalized: true,
    });
    await call({
      config,
      signerPath,
      packageHash: v2.invoicePool.packageHash,
      entryPoint: 'set_controller',
      args: { controller: address(v2.controller.packageHash) },
      allowAlreadyFinalized: true,
    });
    await call({
      config,
      signerPath,
      packageHash: v2.controller.packageHash,
      entryPoint: 'register_verifier',
      args: {
        fault_class: CLValue.newCLString('duplicate_claim'),
        verifier: address(v2.verifiers.duplicateClaim.packageHash),
      },
    });
    await call({
      config,
      signerPath,
      packageHash: v2.controller.packageHash,
      entryPoint: 'register_verifier',
      args: {
        fault_class: CLValue.newCLString('delivery_contradiction'),
        verifier: address(v2.verifiers.deliveryContradiction.packageHash),
      },
    });
  } else {
    console.log('resuming after finalized V2 wiring; running token mints only');
  }
  await call({
    config,
    signerPath,
    packageHash: v2.mockCsprUsd.packageHash,
    entryPoint: 'mint',
    args: {
      to: address(`account-hash-${prior.accounts.agent.accountHash}`),
      amount: u256(500_000n * UNIT),
    },
    gas: 50_000_000_000,
  });
  await call({
    config,
    signerPath,
    packageHash: v2.mockCsprUsd.packageHash,
    entryPoint: 'mint',
    args: {
      to: address(v2.invoicePool.packageHash),
      amount: u256(2_000_000n * UNIT),
    },
    gas: 50_000_000_000,
  });
  const v1 = prior.versions?.v1 ?? {
    mockCsprUsd: prior.contracts.mockCsprUsd,
    bondVault: prior.contracts.bondVault,
    controller: prior.contracts.controller,
    invoicePool: prior.contracts.invoicePool,
  };
  const next: Deployment = deploymentSchema.parse({
    ...prior,
    current: 'v2',
    contracts: {
      ...prior.contracts,
      bondVault: v2.bondVault,
      controller: v2.controller,
      invoicePool: v2.invoicePool,
      controllerV1: v1.controller,
      controllerV2: v2.controller,
      bondVaultV2: v2.bondVault,
      invoicePoolV2: v2.invoicePool,
    },
    versions: { v1, v2 },
  });
  const temporary = `${deploymentPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`);
  await rename(temporary, deploymentPath);
  console.log(JSON.stringify(next.versions?.v2, null, 2));
}

await main();
