import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import type { Deployment } from '../shared/deployment.js';
import {
  bytesArgument,
  callContract,
  readContract,
} from '../casper/odra-cli.js';
import { activeContracts } from '../casper/contracts.js';
import { blake2b256, claimHash } from './hashing.js';
import { requestDecision } from './anthropic.js';
import type { DecisionInvoice } from './prompt.js';
import { writeActionEvidence } from '../evidence/store.js';

export interface AgentRun {
  invoiceId: number;
  actionId?: number;
  decision: 'approve' | 'reject';
  reasoning: string;
  reasoningHash: string;
  confidence: number;
  transactions: {
    initiate?: string;
    approve?: string;
    postBond?: string;
    execute?: string;
  };
}

interface RunnerOptions {
  repository: string;
  config: BondsmanConfig;
  deployment: Deployment;
  apiKey: string;
  model: string;
}

async function nextActionId(
  options: RunnerOptions,
  signerPath: string,
): Promise<number> {
  const contracts = activeContracts(options.deployment);
  for (let actionId = 0; actionId < 10_000; actionId += 1) {
    try {
      await readContract({
        repository: options.repository,
        config: options.config,
        signerPath,
        contract: contracts.controller,
        entrypoint: 'get_action',
        arguments: ['--action_id', String(actionId)],
      });
    } catch {
      return actionId;
    }
  }
  throw new Error('unable to find the next action identifier');
}

export async function persistAgentRun(
  repository: string,
  controllerHash: string,
  run: AgentRun,
): Promise<void> {
  await writeActionEvidence(repository, controllerHash, run);
}

export async function runAgent(
  invoice: DecisionInvoice,
  options: RunnerOptions,
): Promise<AgentRun> {
  const signerPath = join(options.repository, '.keys/agent.pem');
  const contracts = activeContracts(options.deployment);
  const decision = await requestDecision(
    invoice,
    options.apiKey,
    options.model,
  );
  const reasoningDigest = blake2b256(decision.reasoning);
  const base: AgentRun = {
    invoiceId: invoice.id,
    decision: decision.decision,
    reasoning: decision.reasoning,
    reasoningHash: reasoningDigest.toString('hex'),
    confidence: decision.confidence,
    transactions: {},
  };
  if (decision.decision === 'reject') {
    await persistAgentRun(
      options.repository,
      options.deployment.contracts.controller.contractHash,
      base,
    );
    return base;
  }

  const actionId = await nextActionId(options, signerPath);
  const amount = invoice.amount;
  const transactions: AgentRun['transactions'] = {};
  transactions.initiate = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: contracts.controller,
    entrypoint: 'initiate_action',
    arguments: [
      '--invoice_id',
      String(invoice.id),
      '--claim_hash',
      bytesArgument(claimHash(invoice.debtor, invoice.invoiceNumber)),
      '--amount',
      amount,
      '--reasoning_hash',
      bytesArgument(reasoningDigest),
    ],
  });
  const bond = await readContract<string>({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: contracts.controller,
    entrypoint: 'get_bond_required',
    arguments: [
      '--amount',
      amount,
      '--agent',
      `account-hash-${options.deployment.accounts.agent.accountHash}`,
    ],
  });
  transactions.approve = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: contracts.token,
    entrypoint: 'approve',
    arguments: [
      '--spender',
      options.deployment.contracts.bondVault.packageHash,
      '--amount',
      bond,
    ],
  });
  transactions.postBond = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: contracts.controller,
    entrypoint: 'post_bond',
    arguments: ['--action_id', String(actionId)],
  });
  transactions.execute = await callContract({
    repository: options.repository,
    config: options.config,
    signerPath,
    contract: contracts.controller,
    entrypoint: 'execute_action',
    arguments: ['--action_id', String(actionId)],
  });
  const run = {
    ...base,
    actionId,
    transactions,
  };
  await persistAgentRun(
    options.repository,
    options.deployment.contracts.controller.contractHash,
    run,
  );
  return run;
}
