import { randomBytes, sign, generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import casperSdk from 'casper-js-sdk';
import { blake2b256 } from '../backend/src/agent/hashing.js';
import { loadConfig, publicFallbackConfig } from '../backend/src/config/env.js';
import { loadPrivateKey } from '../backend/src/casper/keys.js';
import {
  getTransaction,
  transactionFinality,
} from '../backend/src/casper/transactions.js';
import { deploymentSchema } from '../backend/src/shared/deployment.js';

const {
  Args,
  CLTypeUInt8,
  CLValue,
  ContractCallBuilder,
  HttpHandler,
  Key,
  RpcClient,
} = casperSdk;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const amount = 50_000n * 1_000_000_000n;
const bond = BigInt(
  process.env.V2_DELIVERY_BOND_REQUIRED ??
    String(amount * 500n / 10_000n),
);

function stripHash(value: string): string {
  return value.replace(/^hash-/, '');
}

function address(value: string) {
  return CLValue.newCLKey(Key.newKey(value));
}

function u64(value: bigint | number | string) {
  return CLValue.newCLUint64(String(value));
}

function u256(value: bigint | number | string) {
  return CLValue.newCLUInt256(String(value));
}

function bytes(values: Uint8Array | Buffer) {
  const list = CLValue.newCLList(CLTypeUInt8);
  const children = (list as unknown as {
    list: { elements: unknown[] };
  }).list.elements;
  for (const value of values) children.push(CLValue.newCLUint8(value));
  return list;
}

function u64le(value: bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function evidence(actionId: number, invoiceId: number, occurredAt: number) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicDer = publicKey.export({ format: 'der', type: 'spki' });
  const buyerPublicKey = Buffer.from(publicDer).subarray(-32);
  const prefix = Buffer.concat([
    u64le(BigInt(actionId)),
    u64le(BigInt(invoiceId)),
    u64le(BigInt(occurredAt)),
    randomBytes(32),
  ]);
  const signature = sign(null, prefix, privateKey);
  return {
    buyerPublicKey,
    payload: Buffer.concat([prefix, signature]),
  };
}

async function waitFor(config: ReturnType<typeof publicFallbackConfig>, tx: string) {
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    const raw = await getTransaction(config, tx);
    const finality = transactionFinality(raw, tx);
    if (finality.final) {
      if (!finality.success) throw new Error(finality.error ?? 'transaction failed');
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 5_000));
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
}) {
  const privateKey = await loadPrivateKey(options.signerPath);
  const transaction = new ContractCallBuilder()
    .from(privateKey.publicKey)
    .byPackageHash(stripHash(options.packageHash))
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
  await waitFor(options.config, tx);
  console.log(`${options.entryPoint}: ${tx}`);
  return tx;
}

async function runCase(options: {
  config: ReturnType<typeof publicFallbackConfig>;
  deployment: ReturnType<typeof deploymentSchema.parse>;
  deployerPath: string;
  agentPath: string;
  challengerPath: string;
  actionId: number;
  invoiceId: number;
}) {
  const agentAddress = `account-hash-${options.deployment.accounts.agent.accountHash}`;
  const vendor = `account-hash-${options.deployment.accounts.challenger.accountHash}`;
  const occurredAt = Date.now() - 5_000;
  const proof = evidence(options.actionId, options.invoiceId, occurredAt);
  const claim = randomBytes(32);
  const transactions: Record<string, string> = {};
  transactions.submit = await call({
    config: options.config,
    signerPath: options.deployerPath,
    packageHash: options.deployment.contracts.invoicePool.packageHash,
    entryPoint: 'submit_invoice',
    args: {
      invoice_id: u64(options.invoiceId),
      amount: u256(amount),
      vendor: address(vendor),
      claim_hash: bytes(claim),
      purchase_order_hash: bytes(randomBytes(32)),
      expected_delivery_deadline: u64(0),
      buyer_signature_pubkey: bytes(proof.buyerPublicKey),
    },
  });
  transactions.initiate = await call({
    config: options.config,
    signerPath: options.agentPath,
    packageHash: options.deployment.contracts.controller.packageHash,
    entryPoint: 'initiate_action',
    args: {
      invoice_id: u64(options.invoiceId),
      claim_hash: bytes(claim),
      amount: u256(amount),
      reasoning_hash: bytes(blake2b256('Delivery contradiction V2 verifier run.')),
    },
  });
  transactions.approve = await call({
    config: options.config,
    signerPath: options.agentPath,
    packageHash: options.deployment.contracts.mockCsprUsd.packageHash,
    entryPoint: 'approve',
    args: {
      spender: address(options.deployment.contracts.bondVault.packageHash),
      amount: u256(bond),
    },
  });
  transactions.postBond = await call({
    config: options.config,
    signerPath: options.agentPath,
    packageHash: options.deployment.contracts.controller.packageHash,
    entryPoint: 'post_bond',
    args: { action_id: u64(options.actionId) },
  });
  transactions.execute = await call({
    config: options.config,
    signerPath: options.agentPath,
    packageHash: options.deployment.contracts.controller.packageHash,
    entryPoint: 'execute_action',
    args: { action_id: u64(options.actionId) },
  });
  transactions.challenge = await call({
    config: options.config,
    signerPath: options.challengerPath,
    packageHash: options.deployment.contracts.controller.packageHash,
    entryPoint: 'challenge_action',
    args: {
      action_id: u64(options.actionId),
      fault_class: CLValue.newCLString('delivery_contradiction'),
      evidence: bytes(proof.payload),
    },
  });
  transactions.resolve = await call({
    config: options.config,
    signerPath: options.challengerPath,
    packageHash: options.deployment.contracts.controller.packageHash,
    entryPoint: 'resolve_action',
    args: { action_id: u64(options.actionId) },
  });
  return {
    actionId: options.actionId,
    invoiceId: options.invoiceId,
    occurredAt,
    buyerPublicKey: proof.buyerPublicKey.toString('hex'),
    evidenceLength: proof.payload.length,
    agent: agentAddress,
    transactions,
  };
}

async function main() {
  loadDotenv({ path: join(root, '.env'), quiet: true });
  const config = publicFallbackConfig(loadConfig());
  const deployment = deploymentSchema.parse(
    JSON.parse(await readFile(join(root, 'deployments/testnet.json'), 'utf8')),
  );
  if (deployment.current !== 'v2') {
    throw new Error('deployments/testnet.json is not on V2');
  }
  const startActionId = Number(process.env.V2_DELIVERY_START_ACTION_ID ?? 2);
  const startInvoiceId = Number(process.env.V2_DELIVERY_START_INVOICE_ID ?? Date.now());
  const runCount = Number(process.env.V2_DELIVERY_RUNS ?? 2);
  const deployerPath = resolve(config.deployerSecretKeyPath);
  const agentPath = join(root, '.keys/agent.pem');
  const challengerPath = join(root, '.keys/challenger.pem');
  const runs = [];
  for (let index = 0; index < runCount; index += 1) {
    runs.push(await runCase({
      config,
      deployment,
      deployerPath,
      agentPath,
      challengerPath,
      actionId: startActionId + index,
      invoiceId: startInvoiceId + index,
    }));
  }
  console.log(JSON.stringify({
    controller: deployment.contracts.controller,
    amount: amount.toString(),
    bond: bond.toString(),
    runs,
  }, null, 2));
}

await main();
