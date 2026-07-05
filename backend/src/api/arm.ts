import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AgentDecision } from '../agent/decision.js';
import { blake2b256 } from '../agent/hashing.js';
import { persistAgentRun } from '../agent/runner.js';
import {
  chainActions,
} from '../casper/actions.js';
import {
  bytesArgument,
  callContract,
  readContract,
} from '../casper/odra-cli.js';
import {
  fundToTarget,
  SUBACCOUNT_TARGET_MOTES,
} from '../casper/funding.js';
import {
  loadPrivateKey,
} from '../casper/keys.js';
import { createRpcClient } from '../casper/rpc.js';
import type { BondsmanConfig } from '../config/env.js';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import type { SeedInvoice } from '../shared/invoices.js';
import { demoInvoices } from '../shared/invoices.js';
import { actionDetail } from './action-detail.js';

const TOKEN_UNIT = 1_000_000_000n;
const AGENT_TOKEN_TARGET = 100_000n * TOKEN_UNIT;
const POOL_TOKEN_TARGET = 500_000n * TOKEN_UNIT;
const THIRTY_MINUTES_MS = 1_800_000;

export interface DemoArmService {
  arm(): Promise<NonNullable<ReturnType<typeof actionDetail>>>;
}

export function createInvoiceIdGenerator(
  now: () => number = Date.now,
): () => number {
  let previous = 0;
  return () => {
    const next = Math.max(now(), previous + 1);
    previous = next;
    return next;
  };
}

export function assertChallengeWindow(
  startedAtMs: number,
  windowEndMs: number,
): void {
  if (windowEndMs - startedAtMs < THIRTY_MINUTES_MS) {
    throw new Error('armed action challenge window is under thirty minutes');
  }
}

function bytesHex(value: string): string {
  return Buffer.from(value.match(/\d+/g)?.map(Number) ?? []).toString(
    'hex',
  );
}

interface RawAction {
  agent: string;
  invoice_id: string;
  claim_hash: string;
  amount: string;
  reasoning_hash: string;
  bond_required: string;
  bond_posted: string;
  window_end: string;
  status: string;
  challenger: string;
}

export function isTransientRpcError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return [
    'Timeout waiting for transaction',
    'failed to get response',
    'error sending request',
  ].some((message) => error.message.includes(message));
}

async function ensureTokenTarget(
  repositoryPath: string,
  config: BondsmanConfig,
  deployerPath: string,
  address: string,
  target: bigint,
): Promise<void> {
  const balance = BigInt(
    await readContract<string>({
      repository: repositoryPath,
      config,
      signerPath: deployerPath,
      contract: 'MockCsprUSD',
      entrypoint: 'balance_of',
      arguments: ['--address', address],
    }),
  );
  if (balance >= target) return;
  await callContract({
    repository: repositoryPath,
    config,
    signerPath: deployerPath,
    contract: 'MockCsprUSD',
    entrypoint: 'mint',
    arguments: [
      '--to',
      address,
      '--amount',
      (target - balance).toString(),
    ],
  });
}

export function createDemoArmService(
  repositoryPath: string,
  config: BondsmanConfig,
  deployment: Deployment,
  repository: Repository,
): DemoArmService {
  const nextInvoiceId = createInvoiceIdGenerator();
  let queue: Promise<void> = Promise.resolve();
  let pendingInvoiceId: number | undefined;

  const armOnce = async () => {
    const deployerPath = resolve(config.deployerSecretKeyPath);
    const agentPath = join(repositoryPath, '.keys/agent.pem');
    const challengerPath = join(
      repositoryPath,
      '.keys/challenger.pem',
    );
    const [deployer, agent, challenger] = await Promise.all([
      loadPrivateKey(deployerPath),
      loadPrivateKey(agentPath),
      loadPrivateKey(challengerPath),
    ]);
    const rpc = createRpcClient(config);
    await fundToTarget(
      rpc,
      deployer,
      agent.publicKey,
      SUBACCOUNT_TARGET_MOTES,
    );
    await fundToTarget(
      rpc,
      deployer,
      challenger.publicKey,
      SUBACCOUNT_TARGET_MOTES,
    );
    const agentAddress =
      `account-hash-${deployment.accounts.agent.accountHash}`;
    const poolAddress = deployment.contracts.invoicePool.packageHash;
    await ensureTokenTarget(
      repositoryPath,
      config,
      deployerPath,
      agentAddress,
      AGENT_TOKEN_TARGET,
    );
    await ensureTokenTarget(
      repositoryPath,
      config,
      deployerPath,
      poolAddress,
      POOL_TOKEN_TARGET,
    );

    const chain = await chainActions({
      repository: repositoryPath,
      config,
      deployment,
    });
    const pending = [...chain]
      .reverse()
      .find(
        (action) =>
          action.invoiceId >= 1_000_000_000_000 &&
          ['Initiated', 'Bonded'].includes(action.status),
      );
    const invoiceId =
      pending?.invoiceId ?? pendingInvoiceId ?? nextInvoiceId();
    pendingInvoiceId = invoiceId;
    const collision = demoInvoices[0]!;
    const invoice: SeedInvoice = {
      ...collision,
      id: invoiceId,
      vendor:
        `account-hash-${deployment.accounts.challenger.accountHash}`,
    };
    if (!pending) {
      let invoiceExists = true;
      try {
        await readContract({
          repository: repositoryPath,
          config,
          signerPath: deployerPath,
          contract: 'InvoicePool',
          entrypoint: 'get_invoice',
          arguments: ['--invoice_id', String(invoice.id)],
        });
      } catch (error) {
        if (isTransientRpcError(error)) throw error;
        invoiceExists = false;
      }
      if (!invoiceExists) {
        try {
          await callContract({
            repository: repositoryPath,
            config,
            signerPath: deployerPath,
            contract: 'InvoicePool',
            entrypoint: 'submit_invoice',
            arguments: [
              '--invoice_id',
              String(invoice.id),
              '--amount',
              invoice.amount,
              '--vendor',
              invoice.vendor,
              '--claim_hash',
              bytesArgument(Buffer.from(invoice.claimHash, 'hex')),
            ],
          });
        } catch (error) {
          if (!isTransientRpcError(error)) throw error;
          await readContract({
            repository: repositoryPath,
            config,
            signerPath: deployerPath,
            contract: 'InvoicePool',
            entrypoint: 'get_invoice',
            arguments: ['--invoice_id', String(invoice.id)],
          });
        }
      }
    }

    const decisions = JSON.parse(
      await readFile(
        join(repositoryPath, '.data/demo-decisions.json'),
        'utf8',
      ),
    ) as { baseline: AgentDecision };
    if (decisions.baseline.decision !== 'approve') {
      throw new Error('cached demo decision is not approval');
    }
    const startedAt = Date.now();
    const reasoningHash = blake2b256(
      decisions.baseline.reasoning,
    ).toString('hex');
    const actionId = pending?.actionId ?? chain.length;
    const transactions: Record<string, string> = {};
    const getAction = async () =>
      JSON.parse(
        await readContract<string>({
          repository: repositoryPath,
          config,
          signerPath: agentPath,
          contract: 'BondsmanController',
          entrypoint: 'get_action',
          arguments: ['--action_id', String(actionId)],
        }),
      ) as RawAction;
    if (!pending) {
      try {
        transactions.initiate = await callContract({
          repository: repositoryPath,
          config,
          signerPath: agentPath,
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
            bytesArgument(Buffer.from(reasoningHash, 'hex')),
          ],
        });
      } catch (error) {
        if (!isTransientRpcError(error)) throw error;
        try {
          await getAction();
        } catch (stateError) {
          if (isTransientRpcError(stateError)) throw error;
          transactions.initiate = await callContract({
            repository: repositoryPath,
            config,
            signerPath: agentPath,
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
              bytesArgument(Buffer.from(reasoningHash, 'hex')),
            ],
          });
        }
      }
    }

    let raw = await getAction();
    if (raw.status === 'Initiated') {
      const allowance = BigInt(
        await readContract<string>({
          repository: repositoryPath,
          config,
          signerPath: agentPath,
          contract: 'MockCsprUSD',
          entrypoint: 'allowance',
          arguments: [
            '--owner',
            agentAddress,
            '--spender',
            deployment.contracts.bondVault.packageHash,
          ],
        }),
      );
      if (allowance < BigInt(raw.bond_required)) {
        try {
          transactions.approve = await callContract({
            repository: repositoryPath,
            config,
            signerPath: agentPath,
            contract: 'MockCsprUSD',
            entrypoint: 'approve',
            arguments: [
              '--spender',
              deployment.contracts.bondVault.packageHash,
              '--amount',
              raw.bond_required,
            ],
          });
        } catch (error) {
          if (!isTransientRpcError(error)) throw error;
          const confirmed = BigInt(
            await readContract<string>({
              repository: repositoryPath,
              config,
              signerPath: agentPath,
              contract: 'MockCsprUSD',
              entrypoint: 'allowance',
              arguments: [
                '--owner',
                agentAddress,
                '--spender',
                deployment.contracts.bondVault.packageHash,
              ],
            }),
          );
          if (confirmed < BigInt(raw.bond_required)) throw error;
        }
      }
      try {
        transactions.postBond = await callContract({
          repository: repositoryPath,
          config,
          signerPath: agentPath,
          contract: 'BondsmanController',
          entrypoint: 'post_bond',
          arguments: ['--action_id', String(actionId)],
        });
      } catch (error) {
        if (!isTransientRpcError(error)) throw error;
        const confirmed = await getAction();
        if (!['Bonded', 'Executed'].includes(confirmed.status)) {
          throw error;
        }
      }
      raw = await getAction();
    }
    if (raw.status === 'Bonded') {
      try {
        transactions.execute = await callContract({
          repository: repositoryPath,
          config,
          signerPath: agentPath,
          contract: 'BondsmanController',
          entrypoint: 'execute_action',
          arguments: ['--action_id', String(actionId)],
        });
      } catch (error) {
        if (!isTransientRpcError(error)) throw error;
        const confirmed = await getAction();
        if (confirmed.status !== 'Executed') throw error;
      }
    }
    const duplicate = await readContract<string>({
      repository: repositoryPath,
      config,
      signerPath: agentPath,
      contract: 'InvoicePool',
      entrypoint: 'is_action_duplicate',
      arguments: ['--action_id', String(actionId)],
    });
    if (duplicate !== 'true') {
      throw new Error('armed action is not duplicate');
    }

    raw = await getAction();
    const windowEnd = Number(raw.window_end);
    assertChallengeWindow(startedAt, windowEnd);
    if (raw.status !== 'Executed') {
      throw new Error('armed action is not executed');
    }
    repository.upsertInvoice({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      debtor: invoice.debtor,
      amount: invoice.amount,
      vendor: invoice.vendor,
      dueDate: invoice.dueDate,
      delivered: invoice.delivered,
      claimHash: invoice.claimHash,
      paid: true,
    });
    repository.upsertAction({
      actionId,
      invoiceId: Number(raw.invoice_id),
      agent: agentAddress,
      amount: raw.amount,
      claimHash: bytesHex(raw.claim_hash),
      reasoning: decisions.baseline.reasoning,
      reasoningHash: bytesHex(raw.reasoning_hash),
      bondRequired: raw.bond_required,
      bondPosted: raw.bond_posted,
      windowEnd,
      status: raw.status,
      challenger: null,
      challengerType: null,
      reservedForManual: true,
      transactions,
    });
    await persistAgentRun(repositoryPath, {
      invoiceId: invoice.id,
      actionId,
      decision: 'approve',
      reasoning: decisions.baseline.reasoning,
      reasoningHash,
      confidence: decisions.baseline.confidence,
      transactions,
    });
    pendingInvoiceId = undefined;
    return actionDetail(repository, actionId)!;
  };

  return {
    arm() {
      const result = queue.then(armOnce);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
