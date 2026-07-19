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
import { demoInvoices } from '../backend/src/shared/invoices.js';

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
const UNIT = 1_000_000_000n;

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
  for (const value of values) {
    children.push(CLValue.newCLUint8(value));
  }
  return list;
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

async function main() {
  loadDotenv({ path: join(root, '.env'), quiet: true });
  const config = publicFallbackConfig(loadConfig());
  const deployment = deploymentSchema.parse(
    JSON.parse(await readFile(join(root, 'deployments/testnet.json'), 'utf8')),
  );
  if (deployment.current !== 'v2') {
    throw new Error('deployments/testnet.json is not on V2');
  }
  const deployerPath = resolve(config.deployerSecretKeyPath);
  const agentPath = join(root, '.keys/agent.pem');
  const challengerPath = join(root, '.keys/challenger.pem');
  const agentAddress = `account-hash-${deployment.accounts.agent.accountHash}`;
  const challengerAddress = `account-hash-${deployment.accounts.challenger.accountHash}`;
  const existingActionId = process.env.V2_EXISTING_DUPLICATE_ACTION_ID;
  if (existingActionId) {
    const actionId = BigInt(existingActionId);
    const transactions: Record<string, string> = {};
    transactions.challengeDuplicate = await call({
      config,
      signerPath: challengerPath,
      packageHash: deployment.contracts.controller.packageHash,
      entryPoint: 'challenge_action',
      args: {
        action_id: u64(actionId),
        fault_class: CLValue.newCLString('duplicate_claim'),
        evidence: bytes(Buffer.from([0])),
      },
    });
    transactions.resolveDuplicate = await call({
      config,
      signerPath: challengerPath,
      packageHash: deployment.contracts.controller.packageHash,
      entryPoint: 'resolve_action',
      args: { action_id: u64(actionId) },
    });
    console.log(JSON.stringify({
      controller: deployment.contracts.controller,
      duplicateActionId: Number(actionId),
      transactions,
    }, null, 2));
    return;
  }
  const now = Date.now();
  const firstInvoiceId = now;
  const duplicateInvoiceId = now + 1;
  const claim = Buffer.from(demoInvoices[0]!.claimHash, 'hex');
  const amount = BigInt(demoInvoices[0]!.amount);
  const bond = amount * 500n / 10_000n;
  const invoiceArgs = (invoiceId: number) => ({
    invoice_id: u64(invoiceId),
    amount: u256(amount),
    vendor: address(challengerAddress),
    claim_hash: bytes(claim),
    purchase_order_hash: bytes(Buffer.alloc(32)),
    expected_delivery_deadline: u64(0),
    buyer_signature_pubkey: bytes(Buffer.alloc(32)),
  });
  const transactions: Record<string, string> = {};
  transactions.submitFirst = await call({
    config,
    signerPath: deployerPath,
    packageHash: deployment.contracts.invoicePool.packageHash,
    entryPoint: 'submit_invoice',
    args: invoiceArgs(firstInvoiceId),
  });
  transactions.initiateFirst = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'initiate_action',
    args: {
      invoice_id: u64(firstInvoiceId),
      claim_hash: bytes(claim),
      amount: u256(amount),
      reasoning_hash: bytes(blake2b256('Baseline duplicate claim seed for V2.')),
    },
  });
  transactions.approveFirst = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.mockCsprUsd.packageHash,
    entryPoint: 'approve',
    args: {
      spender: address(deployment.contracts.bondVault.packageHash),
      amount: u256(bond),
    },
  });
  transactions.postFirst = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'post_bond',
    args: { action_id: u64(0) },
  });
  transactions.executeFirst = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'execute_action',
    args: { action_id: u64(0) },
  });
  transactions.submitDuplicate = await call({
    config,
    signerPath: deployerPath,
    packageHash: deployment.contracts.invoicePool.packageHash,
    entryPoint: 'submit_invoice',
    args: invoiceArgs(duplicateInvoiceId),
  });
  transactions.initiateDuplicate = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'initiate_action',
    args: {
      invoice_id: u64(duplicateInvoiceId),
      claim_hash: bytes(claim),
      amount: u256(amount),
      reasoning_hash: bytes(blake2b256('Duplicate claim seed for V2.')),
    },
  });
  transactions.approveDuplicate = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.mockCsprUsd.packageHash,
    entryPoint: 'approve',
    args: {
      spender: address(deployment.contracts.bondVault.packageHash),
      amount: u256(bond),
    },
  });
  transactions.postDuplicate = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'post_bond',
    args: { action_id: u64(1) },
  });
  transactions.executeDuplicate = await call({
    config,
    signerPath: agentPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'execute_action',
    args: { action_id: u64(1) },
  });
  transactions.challengeDuplicate = await call({
    config,
    signerPath: challengerPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'challenge_action',
    args: {
      action_id: u64(1),
      fault_class: CLValue.newCLString('duplicate_claim'),
      evidence: bytes(Buffer.from([0])),
    },
  });
  transactions.resolveDuplicate = await call({
    config,
    signerPath: challengerPath,
    packageHash: deployment.contracts.controller.packageHash,
    entryPoint: 'resolve_action',
    args: { action_id: u64(1) },
  });
  console.log(JSON.stringify({
    controller: deployment.contracts.controller,
    firstActionId: 0,
    duplicateActionId: 1,
    amount: amount.toString(),
    bond: bond.toString(),
    transactions,
  }, null, 2));
}

await main();
