import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join, resolve } from 'node:path';
import type { AgentDecision } from '../agent/decision.js';
import { blake2b256 } from '../agent/hashing.js';
import { persistAgentRun } from '../agent/runner.js';
import {
  type ChainActionView,
} from '../casper/actions.js';
import {
  bytesArgument,
  callContract,
  isRateLimitedError,
  readContract,
} from '../casper/odra-cli.js';
import { activeContracts, v2Enabled } from '../casper/contracts.js';
import {
  fundToTarget,
  transferableTopUp,
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
const DEMO_TRANSFER_GAS_RESERVE_MOTES = 50_000_000_000n;
const DEMO_OWNER_GAS_RESERVE_MOTES = 50_000_000_000n;
const MAX_UNPROJECTED_ACTION_PROBES = 200;

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
  const startedAt = Date.now();
  log({
    event: 'demo_arm_step_start',
    step,
    signerRole: signer.role,
    signerAccount: signer.account,
  });
  try {
    const result = await operation();
    log({
      event: 'demo_arm_step_end',
      step,
      signerRole: signer.role,
      signerAccount: signer.account,
      durationMs: Date.now() - startedAt,
      ...(typeof result === 'string' && /^[0-9a-f]{64}$/.test(result)
        ? { transactionHash: result }
        : {}),
    });
    return result;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : String(error);
    log({
      event: 'demo_arm_step_failed',
      step,
      signerRole: signer.role,
      signerAccount: signer.account,
      durationMs: Date.now() - startedAt,
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
  matchesAction: (action: ChainActionView) => Promise<boolean> = async () => true,
): Promise<ChainActionView | undefined> {
  for (const action of [...actions].reverse()) {
    if (
      action.invoiceId < 1_000_000_000_000 ||
      !['Initiated', 'Bonded'].includes(action.status)
    ) {
      continue;
    }
    if (!(await matchesAction(action))) continue;
    if (!(await isInvoicePaid(action.invoiceId))) return action;
  }
  return undefined;
}

export interface DemoArmService {
  arm(options: {
    reservedForManual: boolean;
  }): Promise<NonNullable<ReturnType<typeof actionDetail>>>;
  submitPaidAction(options: {
    quoteHash: string;
    faultClass: 'duplicate_claim' | 'delivery_contradiction';
    amount: string;
    buyerPublicKey?: string;
    eventType?: 'delivery_rejected' | 'goods_not_received';
  }): Promise<NonNullable<ReturnType<typeof actionDetail>> & {
    attestation?: {
      actionId: number;
      invoiceId: number;
      eventType: 'delivery_rejected' | 'goods_not_received';
      occurredAt: number;
      nonce: string;
      buyerPublicKey: string;
    };
  }>;
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

async function pollExecutedReadiness(
  getAction: () => Promise<RawAction>,
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
    const action = await getAction();
    if (
      action.status === 'Executed' &&
      action.challenger === 'None' &&
      Number(action.window_end) - now() >= FIFTEEN_MINUTES_MS
    ) {
      return action;
    }
    if (attempt + 1 < (options.attempts ?? 15)) {
      await sleep(2_000);
    }
  }
  throw new Error(
    'paid action did not become executable before readiness timeout',
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

export function projectedActionViews(
  repository: Repository,
): ChainActionView[] {
  return repository.listActions().map((action) => ({
    actionId: action.actionId,
    invoiceId: action.invoiceId,
    windowEnd: action.windowEnd,
    status: action.status,
  }));
}

export async function resolveActionCursor(
  projected: ChainActionView[],
  readAction: (actionId: number) => Promise<RawAction>,
): Promise<{ actions: ChainActionView[]; nextActionId: number }> {
  const actions = [...projected];
  let actionId = Math.max(-1, ...actions.map((action) => action.actionId)) + 1;
  for (
    let attempt = 0;
    attempt < MAX_UNPROJECTED_ACTION_PROBES;
    attempt += 1
  ) {
    try {
      const action = await readAction(actionId);
      actions.push({
        actionId,
        invoiceId: Number(action.invoice_id),
        windowEnd: Number(action.window_end),
        status: action.status,
      });
      actionId += 1;
    } catch (error) {
      if (isTransientRpcError(error)) throw error;
      return { actions, nextActionId: actionId };
    }
  }
  throw new Error(
    'action cursor is more than three actions ahead of the local projection',
  );
}

export function isTransientRpcError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    isRateLimitedError(error) ||
    [
      'Timeout waiting for transaction',
      'failed to get response',
      'error sending request',
    ].some((message) => error.message.includes(message))
  );
}

export function isInsufficientFundsError(error: unknown): boolean {
  return error instanceof Error &&
    error.message.includes('Insufficient funds');
}

class DemoFundingUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
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
      throw new DemoFundingUnavailableError(
        'demo CSPR funding is temporarily unavailable after one top-up retry',
        error,
      );
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
  _reconcile?: () => Promise<void>,
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
    let agentBalance: bigint;
    let deployerBalance: bigint;
    try {
      agentBalance = await accountBalanceMotes(rpc, agent.publicKey);
      deployerBalance = await accountBalanceMotes(rpc, deployer.publicKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error({
        event: 'demo_funding_rpc_unavailable',
        agent: agent.publicKey.toHex(),
        deployer: deployer.publicKey.toHex(),
        reason,
      });
      throw new Error(`demo CSPR balance check failed: ${reason}`, {
        cause: error,
      });
    }
    const topUpMotes = transferableTopUp(
      agentBalance,
      DEMO_GAS_TARGET_MOTES,
    );
    const deployerRequiredMotes =
      topUpMotes +
      DEMO_TRANSFER_GAS_RESERVE_MOTES +
      DEMO_OWNER_GAS_RESERVE_MOTES;
    console.log({
      event: 'demo_funding_check',
      asset: 'CSPR',
      agent: agent.publicKey.toHex(),
      agentBalanceMotes: agentBalance.toString(),
      agentTargetMotes: DEMO_GAS_TARGET_MOTES.toString(),
      deployer: deployer.publicKey.toHex(),
      deployerBalanceMotes: deployerBalance.toString(),
      deployerRequiredMotes: deployerRequiredMotes.toString(),
    });
    if (deployerBalance < deployerRequiredMotes) {
      const shortfall = deployerRequiredMotes - deployerBalance;
      console.error({
        event: 'demo_funding_insufficient',
        asset: 'CSPR',
        account: deployer.publicKey.toHex(),
        balanceMotes: deployerBalance.toString(),
        requiredMotes: deployerRequiredMotes.toString(),
        shortfallMotes: shortfall.toString(),
        agent: agent.publicKey.toHex(),
        agentTopUpMotes: topUpMotes.toString(),
      });
      throw new DemoFundingUnavailableError(
        `demo CSPR funding unavailable: deployer ${deployer.publicKey.toHex()} has ${deployerBalance.toString()} motes but needs ${deployerRequiredMotes.toString()} motes; shortfall ${shortfall.toString()} motes to fund agent ${agent.publicKey.toHex()} and submit one demo invoice`,
      );
    }
    if (topUpMotes > 0n) {
      await fundToTarget(
        rpc,
        deployer,
        agent.publicKey,
        DEMO_GAS_TARGET_MOTES,
      );
      agentBalance = await accountBalanceMotes(rpc, agent.publicKey);
      if (agentBalance < DEMO_GAS_TARGET_MOTES) {
        throw new DemoFundingUnavailableError(
          `demo CSPR funding unavailable: agent ${agent.publicKey.toHex()} remains at ${agentBalance.toString()} motes after top-up; target ${DEMO_GAS_TARGET_MOTES.toString()} motes`,
        );
      }
    }
  };

  const armOnce = async (options: {
    reservedForManual: boolean;
    requestedInvoiceId: number;
    faultClass: 'duplicate_claim' | 'delivery_contradiction';
    amount?: string;
    buyerPublicKey?: string;
    eventType?: 'delivery_rejected' | 'goods_not_received';
  }) => {
    const { reservedForManual, requestedInvoiceId, faultClass } = options;
    if (faultClass === 'delivery_contradiction' && !v2Enabled(deployment)) {
      throw new Error('delivery contradiction actions require controller V2');
    }
    const deployerPath = resolve(config.deployerSecretKeyPath);
    const agentPath = join(repositoryPath, '.keys/agent.pem');
    const contracts = activeContracts(deployment);
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

    const readRawAction = async (actionId: number) =>
      JSON.parse(
        await readContract<string>({
          repository: repositoryPath,
          config,
          signerPath: agentPath,
          contract: contracts.controller,
          entrypoint: 'get_action',
          arguments: ['--action_id', String(actionId)],
        }),
      ) as RawAction;
    const cursor = await resolveActionCursor(
      projectedActionViews(repository),
      readRawAction,
    );
    const collision = demoInvoices[0]!;
    const pending = faultClass === 'duplicate_claim'
      ? await selectResumablePending(
          cursor.actions,
          async (candidateInvoiceId) => {
            const serialized = await readContract<string>({
              repository: repositoryPath,
              config,
              signerPath: deployerPath,
              contract: contracts.pool,
              entrypoint: 'get_invoice',
              arguments: [
                '--invoice_id',
                String(candidateInvoiceId),
              ],
            });
            const candidate = JSON.parse(serialized) as RawInvoice;
            return candidate.paid === true || candidate.paid === 'true';
          },
          async (candidateAction) => {
            const candidate = await readRawAction(candidateAction.actionId);
            return bytesHex(candidate.claim_hash) === collision.claimHash;
          },
        )
      : undefined;
    const invoiceId = pending?.invoiceId ?? requestedInvoiceId;
    const deliveryBuyerPublicKey = options.buyerPublicKey
      ? Buffer.from(options.buyerPublicKey, 'base64')
      : undefined;
    if (
      faultClass === 'delivery_contradiction' &&
      deliveryBuyerPublicKey?.length !== 32
    ) {
      throw new Error('delivery contradiction requires a 32-byte buyer public key');
    }
    const invoice: SeedInvoice = faultClass === 'duplicate_claim'
      ? {
          ...collision,
          id: invoiceId,
          vendor:
            `account-hash-${deployment.accounts.challenger.accountHash}`,
        }
      : {
          id: invoiceId,
          invoiceNumber: `DLV-${invoiceId}`,
          debtor: 'Globex Manufacturing',
          amount: options.amount ?? collision.amount,
          vendor:
            `account-hash-${deployment.accounts.challenger.accountHash}`,
          dueDate: '2020-01-01',
          delivered: true,
          claimHash: randomBytes(32).toString('hex'),
        };
    if (!pending) {
      let invoiceExists = true;
      try {
        await readContract({
          repository: repositoryPath,
          config,
          signerPath: deployerPath,
          contract: contracts.pool,
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
            contracts.pool,
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
              ...(v2Enabled(deployment)
                ? [
                    '--purchase_order_hash',
                    bytesArgument(
                      faultClass === 'delivery_contradiction'
                        ? randomBytes(32)
                        : Buffer.alloc(32),
                    ),
                    '--expected_delivery_deadline',
                    '0',
                    '--buyer_signature_pubkey',
                    bytesArgument(
                      deliveryBuyerPublicKey ?? Buffer.alloc(32),
                    ),
                  ]
                : []),
            ],
          );
        } catch (error) {
          if (!isTransientRpcError(error)) throw error;
          await readContract({
            repository: repositoryPath,
            config,
            signerPath: deployerPath,
            contract: contracts.pool,
            entrypoint: 'get_invoice',
            arguments: ['--invoice_id', String(invoice.id)],
          });
        }
      }
    }

    const decisions = faultClass === 'duplicate_claim'
      ? JSON.parse(
          await readFile(
            join(repositoryPath, '.data/demo-decisions.json'),
            'utf8',
          ),
        ) as { baseline: AgentDecision }
      : {
          baseline: {
            decision: 'approve',
            reasoning:
              'Delivery attested by the agent; buyer delivery evidence remains challengeable during the watchdog window.',
            confidence: 0.91,
          },
        };
    if (decisions.baseline.decision !== 'approve') {
      throw new Error('cached demo decision is not approval');
    }
    const startedAt = Date.now();
    const reasoningHash = blake2b256(
      decisions.baseline.reasoning,
    ).toString('hex');
    const actionId = pending?.actionId ?? cursor.nextActionId;
    const transactions: Record<string, string> = {};
    const getAction = () => readRawAction(actionId);
    if (!pending) {
      try {
        transactions.initiate = await transact(
          'initiate_action',
          agentSigner,
          contracts.controller,
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
            contracts.controller,
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
          contracts.controller,
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
          contracts.controller,
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
      contract: contracts.pool,
      entrypoint: 'is_action_duplicate',
      arguments: ['--action_id', String(actionId)],
    });
    raw = faultClass === 'duplicate_claim'
      ? await pollArmReadiness(getAction, getDuplicate)
      : await pollExecutedReadiness(getAction);
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
      duplicateProven: faultClass === 'duplicate_claim',
      faultClass,
      evidenceRoot: null,
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
    if (faultClass === 'duplicate_claim') {
      raw = await pollArmReadiness(getAction, getDuplicate, {
        attempts: 1,
      });
    } else {
      raw = await pollExecutedReadiness(getAction, {
        attempts: 1,
      });
    }
    const detail = actionDetail(repository, actionId)!;
    if (faultClass !== 'delivery_contradiction') return detail;
    return {
      ...detail,
      attestation: {
        actionId,
        invoiceId: invoice.id,
        eventType: options.eventType ?? 'goods_not_received',
        occurredAt: Date.now() - 5_000,
        nonce: randomBytes(32).toString('hex'),
        buyerPublicKey: options.buyerPublicKey!,
      },
    };
  };

  return {
    arm({ reservedForManual }) {
      const requestedInvoiceId = nextInvoiceId();
      const result = queue.then(() =>
        runFundedDemoAction(
          ensureDemoFunding,
          () => armOnce({
            reservedForManual,
            requestedInvoiceId,
            faultClass: 'duplicate_claim',
          }),
        ),
      );
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    submitPaidAction(options) {
      const requestedInvoiceId = nextInvoiceId();
      const result = queue.then(() =>
        runFundedDemoAction(
          ensureDemoFunding,
          () => armOnce({
            reservedForManual: false,
            requestedInvoiceId,
            faultClass: options.faultClass,
            amount: options.amount,
            ...(options.buyerPublicKey
              ? { buyerPublicKey: options.buyerPublicKey }
              : {}),
            ...(options.eventType
              ? { eventType: options.eventType }
              : {}),
          }),
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
