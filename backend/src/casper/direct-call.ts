import casperSdk from 'casper-js-sdk';
import type { BondsmanConfig } from '../config/env.js';
import { publicFallbackConfig } from '../config/env.js';
import { loadPrivateKey } from './keys.js';
import { getTransaction, transactionFinality } from './transactions.js';
import { assertSpendAllowed, recordSpend } from '../ops/spend-guard.js';

const {
  Args,
  CLTypeUInt8,
  CLValue,
  ContractCallBuilder,
  HttpHandler,
  Key,
  RpcClient,
} = casperSdk;

export function directAddress(value: string) {
  return CLValue.newCLKey(Key.newKey(value));
}

export function directU64(value: bigint | number | string) {
  return CLValue.newCLUint64(String(value));
}

export function directString(value: string) {
  return CLValue.newCLString(value);
}

export function directBytes(values: Uint8Array | Buffer) {
  const list = CLValue.newCLList(CLTypeUInt8);
  const children = (list as unknown as {
    list: { elements: unknown[] };
  }).list.elements;
  for (const value of values) children.push(CLValue.newCLUint8(value));
  return list;
}

async function waitFor(config: BondsmanConfig, hash: string) {
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    const raw = await getTransaction(config, hash);
    const finality = transactionFinality(raw, hash);
    if (finality.final) {
      if (!finality.success) {
        throw new Error(finality.error ?? 'transaction failed');
      }
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 5_000));
  }
  throw new Error(`timed out waiting for ${hash}`);
}

export async function directCallContract(options: {
  config: BondsmanConfig;
  signerPath: string;
  packageHash: string;
  entryPoint: string;
  args: Record<string, InstanceType<typeof CLValue>>;
  gas?: number;
}): Promise<string> {
  assertSpendAllowed({
    signerPath: options.signerPath,
    gas: options.gas ?? 50_000_000_000,
  });
  const privateKey = await loadPrivateKey(options.signerPath);
  const transaction = new ContractCallBuilder()
    .from(privateKey.publicKey)
    .byPackageHash(options.packageHash.replace(/^hash-/, ''))
    .entryPoint(options.entryPoint)
    .runtimeArgs(Args.fromMap(options.args))
    .chainName(options.config.chainName)
    .payment(options.gas ?? 50_000_000_000)
    .build();
  transaction.sign(privateKey);
  const submit = async (config: BondsmanConfig) => {
  const handler = new HttpHandler(config.nodeRpcUrl, 'fetch');
  if (config.cloudApiKey) {
    handler.setCustomHeaders({
      Authorization: config.cloudApiKey,
    });
  }
  const client = new RpcClient(handler);
  const result = await client.putTransaction(transaction);
  const hash = result.transactionHash.toHex();
  await waitFor(config, hash);
  return hash;
  };
  try {
    const hash = await submit(options.config);
    recordSpend({
      signerPath: options.signerPath,
      gas: options.gas ?? 50_000_000_000,
      transactionHash: hash,
    });
    return hash;
  } catch (error) {
    if (!options.config.cloudApiKey) throw error;
    const reason = error instanceof Error ? error.message : String(error);
    if (!/\b(401|403|429)\b|Unauthorized|Too Many Requests|rate.?limit/i.test(reason)) {
      throw error;
    }
    const hash = await submit(publicFallbackConfig(options.config));
    recordSpend({
      signerPath: options.signerPath,
      gas: options.gas ?? 50_000_000_000,
      transactionHash: hash,
    });
    return hash;
  }
}
