import { join } from 'node:path';
import { blake2b256 } from '../agent/hashing.js';
import type { BondsmanConfig } from '../config/env.js';
import type { Deployment } from '../shared/deployment.js';
import type { SeedInvoice } from '../shared/invoices.js';
import {
  bytesArgument,
  callContract,
  readContract,
} from './odra-cli.js';

export interface ChainActionView {
  actionId: number;
  invoiceId: number;
  windowEnd: number;
  status: string;
}

export interface BondedTransactions {
  initiate: string;
  approve: string;
  postBond: string;
  execute: string;
}

interface ActionOptions {
  repository: string;
  config: BondsmanConfig;
  deployment: Deployment;
}

interface RawAction {
  invoice_id: string;
  window_end: string;
  status: string;
}

export async function chainActions(
  options: ActionOptions,
): Promise<ChainActionView[]> {
  const result: ChainActionView[] = [];
  const signerPath = join(options.repository, '.keys/agent.pem');
  for (let actionId = 0; actionId < 10_000; actionId += 1) {
    try {
      const serialized = await readContract<string>({
        repository: options.repository,
        config: options.config,
        signerPath,
        contract: 'BondsmanController',
        entrypoint: 'get_action',
        arguments: ['--action_id', String(actionId)],
      });
      const action = JSON.parse(serialized) as RawAction;
      result.push({
        actionId,
        invoiceId: Number(action.invoice_id),
        windowEnd: Number(action.window_end),
        status: action.status,
      });
    } catch {
      return result;
    }
  }
  throw new Error('action scan limit reached');
}

export async function executeBondedInvoice(
  invoice: SeedInvoice,
  reasoning: string,
  options: ActionOptions,
): Promise<{ actionId: number; transactions: BondedTransactions }> {
  const signerPath = join(options.repository, '.keys/agent.pem');
  const actionId = (await chainActions(options)).length;
  const digest = blake2b256(reasoning);
  const initiate = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: 'BondsmanController',
    entrypoint: 'initiate_action',
    arguments: [
      '--invoice_id',
      String(invoice.id),
      '--claim_hash',
      bytesArgument(Buffer.from(invoice.claimHash, 'hex')),
      '--amount',
      invoice.amount,
      '--reasoning_hash',
      bytesArgument(digest),
    ],
  });
  const bond = await readContract<string>({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: 'BondsmanController',
    entrypoint: 'get_bond_required',
    arguments: [
      '--amount',
      invoice.amount,
      '--agent',
      `account-hash-${options.deployment.accounts.agent.accountHash}`,
    ],
  });
  const approve = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: 'MockCsprUSD',
    entrypoint: 'approve',
    arguments: [
      '--spender',
      options.deployment.contracts.bondVault.packageHash,
      '--amount',
      bond,
    ],
  });
  const postBond = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: 'BondsmanController',
    entrypoint: 'post_bond',
    arguments: ['--action_id', String(actionId)],
  });
  const execute = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: 'BondsmanController',
    entrypoint: 'execute_action',
    arguments: ['--action_id', String(actionId)],
  });
  return {
    actionId,
    transactions: { initiate, approve, postBond, execute },
  };
}
