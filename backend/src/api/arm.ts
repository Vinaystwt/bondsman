import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AgentDecision } from '../agent/decision.js';
import { blake2b256 } from '../agent/hashing.js';
import { persistAgentRun } from '../agent/runner.js';
import {
  chainActions,
  type ChainActionView,
} from '../casper/actions.js';
import {
  bytesArgument,
  callContract,
  readContract,
} from '../casper/odra-cli.js';
import {
  fundToTarget,
} from '../casper/funding.js';
import {
  loadPrivateKey,
} from '../casper/keys.js';
import {
  accountBalanceMotes,
  createRpcClient,
} from '../casper/rpc.js';
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
const FIFTEEN_MINUTES_MS = 900_000;
export const DEMO_GAS_TARGET_MOTES = 300_000_000_000n;

export function demoSignerPlan(
  deployerPath: string,
  agentPath: string,
) {
  return {
    submitInvoice: deployerPath,
    initiate: agentPath,
    approve: agentPath,
    postBond: agentPath,
    execute: agentPath,
  } as const;
}

export interface ArmSigner {
  role: 'deployer/owner' | 'agent';
  account: string;
  path: string;
}

export async function runArmStep<T>(
  step: string,
  signer: ArmSigner,
  operation: () => Promise<T>,
  log: (entry: Record<string, unknown>) => void = console.error,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : String(error);
    log({
      event: 'demo_arm_step_failed',
      step,
      signerRole: signer.role,
      signerAccount: signer.account,
      signerPath: signer.path,
      reason,
    });
    throw new Error(
      `${step} failed; signer=${signer.role} (${signer.account}); reason=${reason}`,
      { cause: error },
    );
  }
}

export async function selectResumablePending(
  actions: ChainActionView[],
  isInvoicePaid: (invoiceId: number) => Promise<boolean>,
): Promise<ChainActionView | undefined> {
  for (const action of [...actions].reverse()) {
    if (
      action.invoiceId < 1_000_000_000_000 ||
      !['Initiated', 'Bonded'].includes(action.status)
    ) {
      continue;
    }
    if (!(await isInvoicePaid(action.invoiceId))) return action;
  }
  return undefined;
}

export interface DemoArmService {
  arm(options: {
    reservedForManual: boolean;
  }): Promise<NonNullable<ReturnType<typeof actionDetail>>>;
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

export async function pollArmReadiness(
  getAction: () => Promise<RawAction>,
  getDuplicate: () => Promise<string>,
  options: {
    now?: () => number;
    sleep?: (milliseconds: number) => Promise<void>;
    attempts?: number;
  } = {},
): Promise<RawAction> {
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; attempt < (options.attempts ?? 15); attempt += 1) {
    const [action, duplicate] = await Promise.all([
      getAction(),
      getDuplicate(),
    ]);
    if (
      action.status === 'Executed' &&
      action.challenger === 'None' &&
      duplicate === 'true' &&
      Number(action.window_end) - now() >= FIFTEEN_MINUTES_MS
    ) {
      return action;
    }
    if (attempt + 1 < (options.attempts ?? 15)) {
      await sleep(2_000);
    }
  }
  throw new Error(
    'armed action did not become challengeable before readiness timeout',
  );
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

interface RawInvoice {
  paid: string | boolean;
}

export function isTransientRpcError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return [
    'Timeout waiting for transaction',
    'failed to get response',
    'error sending request',
  ].some((message) => error.message.includes(message));
}

export function isInsufficientFundsError(error: unknown): boolean {
  return error instanceof Error &&
    error.message.includes('Insufficient funds');
}

class DemoFundingUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(cause: unknown) {
    super('demo funding is temporarily unavailable', { cause });
    this.name = 'DemoFundingUnavailableError';
  }
}

export async function runFundedDemoAction<T>(
  topUp: () => Promise<void>,
  operation: () => Promise<T>,
): Promise<T> {
  const attempt = async () => {
    await topUp();
    return operation();
  };
  try {
    return await attempt();
  } catch (error) {
    if (!isInsufficientFundsError(error)) throw error;
  }
  try {
    return await attempt();
  } catch (error) {
    if (isInsufficientFundsError(error)) {
      throw new DemoFundingUnavailableError(error);
    }
    throw error;
  }
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
  reconcile?: () => Promise<void>,
): DemoArmService {
  const nextInvoiceId = createInvoiceIdGenerator();
  let queue: Promise<void> = Promise.resolve();

  const ensureDemoFunding = async () => {
    const deployer = await loadPrivateKey(
      resolve(config.deployerSecretKeyPath),
    );
    const agent = await loadPrivateKey(
      join(repositoryPath, '.keys/agent.pem'),
    );
    const rpc = createRpcClient(config);
    await fundToTarget(
      rpc,
      deployer,
      agent.publicKey,
      DEMO_GAS_TARGET_MOTES,
    );
    const balance = await accountBalanceMotes(rpc, agent.publicKey);
    if (balance < DEMO_GAS_TARGET_MOTES) {
      throw new Error(
        'Insufficient funds: demo agent top-up did not reach target',
      );
    }
  };

  const armOnce = async (
    reservedForManual: boolean,
    requestedInvoiceId: number,
  ) => {
    const deployerPath = resolve(config.deployerSecretKeyPath);
    const agentPath = join(repositoryPath, '.keys/agent.pem');
    const signers = demoSignerPlan(deployerPath, agentPath);
    const deployerSigner: ArmSigner = {
      role: 'deployer/owner',
      account:
        `account-hash-${deployment.accounts.deployer.accountHash}`,
      path: signers.submitInvoice,
    };
    const agentSigner: ArmSigner = {
      role: 'agent',
      account:
        `account-hash-${deployment.accounts.agent.accountHash}`,
      path: signers.initiate,
    };
    const transact = (
      step: string,
      signer: ArmSigner,
      contract: string,
      entrypoint: string,
      arguments_: string[],
    ) =>
      runArmStep(step, signer, () =>
        callContract({
          repository: repositoryPath,
          config,
          signerPath: signer.path,
          contract,
          entrypoint,
          arguments: arguments_,
        }),
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
    const pending = await selectResumablePending(
      chain,
      async (candidateInvoiceId) => {
        const serialized = await readContract<string>({
          repository: repositoryPath,
          config,
          signerPath: deployerPath,
          contract: 'InvoicePool',
          entrypoint: 'get_invoice',
          arguments: [
            '--invoice_id',
            String(candidateInvoiceId),
          ],
        });
        const candidate = JSON.parse(serialized) as RawInvoice;
        return candidate.paid === true || candidate.paid === 'true';
      },
    );
    const invoiceId = pending?.invoiceId ?? requestedInvoiceId;
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
          await transact(
            'submit_invoice',
            deployerSigner,
            'InvoicePool',
            'submit_invoice',
            [
              '--invoice_id',
              String(invoice.id),
              '--amount',
              invoice.amount,
              '--vendor',
              invoice.vendor,
              '--claim_hash',
              bytesArgument(Buffer.from(invoice.claimHash, 'hex')),
            ],
          );
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
          signerPath: signers.initiate,
          contract: 'BondsmanController',
          entrypoint: 'get_action',
          arguments: ['--action_id', String(actionId)],
        }),
      ) as RawAction;
    if (!pending) {
      try {
        transactions.initiate = await transact(
          'initiate_action',
          agentSigner,
          'BondsmanController',
          'initiate_action',
          [
            '--invoice_id',
            String(invoice.id),
            '--claim_hash',
            bytesArgument(Buffer.from(invoice.claimHash, 'hex')),
            '--amount',
            invoice.amount,
            '--reasoning_hash',
            bytesArgument(Buffer.from(reasoningHash, 'hex')),
          ],
        );
      } catch (error) {
        if (!isTransientRpcError(error)) throw error;
        try {
          await getAction();
        } catch (stateError) {
          if (isTransientRpcError(stateError)) throw error;
          transactions.initiate = await transact(
            'initiate_action',
            agentSigner,
            'BondsmanController',
            'initiate_action',
            [
              '--invoice_id',
              String(invoice.id),
              '--claim_hash',
              bytesArgument(Buffer.from(invoice.claimHash, 'hex')),
              '--amount',
              invoice.amount,
              '--reasoning_hash',
              bytesArgument(Buffer.from(reasoningHash, 'hex')),
            ],
          );
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
          transactions.approve = await transact(
            'approve',
            agentSigner,
            'MockCsprUSD',
            'approve',
            [
              '--spender',
              deployment.contracts.bondVault.packageHash,
              '--amount',
              raw.bond_required,
            ],
          );
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
        transactions.postBond = await transact(
          'post_bond',
          agentSigner,
          'BondsmanController',
          'post_bond',
          ['--action_id', String(actionId)],
        );
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
        transactions.execute = await transact(
          'execute_action',
          agentSigner,
          'BondsmanController',
          'execute_action',
          ['--action_id', String(actionId)],
        );
      } catch (error) {
        if (!isTransientRpcError(error)) throw error;
        const confirmed = await getAction();
        if (confirmed.status !== 'Executed') throw error;
      }
    }
    const getDuplicate = () => readContract<string>({
      repository: repositoryPath,
      config,
      signerPath: agentPath,
      contract: 'InvoicePool',
      entrypoint: 'is_action_duplicate',
      arguments: ['--action_id', String(actionId)],
    });
    raw = await pollArmReadiness(getAction, getDuplicate);
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
      challengeSigning: null,
      controllerHash:
        deployment.contracts.controller.contractHash,
      duplicateProven: true,
      reservedForManual,
      transactions,
    });
    await persistAgentRun(
      repositoryPath,
      deployment.contracts.controller.contractHash,
      {
        invoiceId: invoice.id,
        actionId,
        decision: 'approve',
        reasoning: decisions.baseline.reasoning,
        reasoningHash,
        confidence: decisions.baseline.confidence,
        transactions,
      },
    );
    if (reconcile) await reconcile();
    raw = await pollArmReadiness(getAction, getDuplicate, {
      attempts: 1,
    });
    return actionDetail(repository, actionId)!;
  };

  return {
    arm({ reservedForManual }) {
      const requestedInvoiceId = nextInvoiceId();
      const result = queue.then(() =>
        runFundedDemoAction(
          ensureDemoFunding,
          () => armOnce(reservedForManual, requestedInvoiceId),
        ),
      );
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
