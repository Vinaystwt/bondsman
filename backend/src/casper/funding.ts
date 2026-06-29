import type { Deploy as DeployType } from 'casper-js-sdk';
import { buildTransferDeploy } from './transfers.js';
import {
  type PrivateKeyInstance,
  type PublicKeyInstance,
  RpcClient,
} from './sdk.js';
import { accountBalanceMotes } from './rpc.js';

export const SUBACCOUNT_TARGET_MOTES = 750_000_000_000n;

export function fundingShortfall(
  current: bigint,
  target: bigint,
): bigint {
  return current < target ? target - current : 0n;
}

export function isMissingPurse(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    statusCode?: unknown;
    message?: unknown;
  };
  return (
    candidate.statusCode === -32026 ||
    String(candidate.message).includes('Purse not found')
  );
}

function deployHash(result: { deployHash: { toHex(): string } }): string {
  return result.deployHash.toHex();
}

export async function submitDeploy(
  client: InstanceType<typeof RpcClient>,
  deploy: DeployType,
): Promise<string> {
  const submitted = await client.putDeploy(deploy);
  const hash = deployHash(submitted);
  await client.waitForDeploy(deploy, 900_000);
  return hash;
}

export async function fundToTarget(
  client: InstanceType<typeof RpcClient>,
  deployer: PrivateKeyInstance,
  recipient: PublicKeyInstance,
  targetMotes: bigint = SUBACCOUNT_TARGET_MOTES,
): Promise<string | undefined> {
  let balance: bigint;
  try {
    balance = await accountBalanceMotes(client, recipient);
  } catch (error) {
    if (!isMissingPurse(error)) throw error;
    balance = 0n;
  }
  const amount = fundingShortfall(balance, targetMotes);
  if (amount === 0n) {
    return undefined;
  }
  return submitDeploy(
    client,
    buildTransferDeploy(deployer, recipient, amount.toString()),
  );
}
