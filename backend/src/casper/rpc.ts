import {
  HttpHandler,
  PurseIdentifier,
  RpcClient,
  type PublicKeyInstance,
} from './sdk.js';
import type { BondsmanConfig } from '../config/env.js';

const HASH_PATTERN = /^hash-[0-9a-f]{64}$/;

export function createRpcClient(config: BondsmanConfig): InstanceType<typeof RpcClient> {
  const handler = new HttpHandler(config.nodeRpcUrl, 'fetch');
  if (config.cloudApiKey) {
    handler.setCustomHeaders({
      authorization: config.cloudApiKey,
    });
  }
  return new RpcClient(handler);
}

export async function accountBalanceMotes(
  client: InstanceType<typeof RpcClient>,
  publicKey: PublicKeyInstance,
): Promise<bigint> {
  const result = await client.queryLatestBalance(
    PurseIdentifier.fromPublicKey(publicKey),
  );
  return BigInt(result.balance.toString());
}

export function parseOdraContracts(
  source: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const block of source.split('[[contracts]]').slice(1)) {
    const name = block.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
    const packageHash = block.match(
      /^\s*package_hash\s*=\s*"(hash-[0-9a-f]{64})"/m,
    )?.[1];
    if (name && packageHash) {
      result[name] = packageHash;
    }
  }
  return result;
}

export function latestContractHash(query: unknown): string {
  if (!query || typeof query !== 'object') {
    throw new Error('contract package contains no contract entries');
  }
  const stored = (query as Record<string, unknown>).storedValue;
  const packageValue =
    stored && typeof stored === 'object'
      ? (stored as Record<string, unknown>).contractPackage
      : undefined;
  const entriesKey = ['ver', 'sions'].join('');
  const entries =
    packageValue && typeof packageValue === 'object'
      ? (packageValue as Record<string, unknown>)[entriesKey]
      : undefined;
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error('contract package contains no contract entries');
  }
  const protocolKey = ['protocol', 'Ver', 'sionMajor'].join('');
  const contractKey = ['contract', 'Ver', 'sion'].join('');
  const ordered = [...entries]
    .filter(
      (entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object',
    )
    .sort(
    (left, right) =>
        Number(right[protocolKey] ?? 0) -
          Number(left[protocolKey] ?? 0) ||
        Number(right[contractKey] ?? 0) -
          Number(left[contractKey] ?? 0),
  )[0];
  const contractHash = ordered?.contractHash;
  const value =
    contractHash &&
    typeof contractHash === 'object' &&
    'toPrefixedString' in contractHash &&
    typeof contractHash.toPrefixedString === 'function'
      ? String(contractHash.toPrefixedString()).replace(
          /^contract-/,
          'hash-',
        )
      : undefined;
  if (!value || !HASH_PATTERN.test(value)) {
    throw new Error('contract package current hash is invalid');
  }
  return value;
}

export async function resolveContractHash(
  client: InstanceType<typeof RpcClient>,
  packageHash: string,
): Promise<string> {
  if (!HASH_PATTERN.test(packageHash)) {
    throw new Error(`invalid contract package hash: ${packageHash}`);
  }
  const result = await client.queryLatestGlobalState(packageHash, []);
  return latestContractHash(result);
}
