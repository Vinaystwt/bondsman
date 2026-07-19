import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import type { Deployment } from '../shared/deployment.js';
import {
  callContract,
  readContract,
  readEvents,
} from '../casper/odra-cli.js';
import { activeContracts } from '../casper/contracts.js';
import { claimHash } from '../agent/hashing.js';
import type { DecisionInvoice } from '../agent/prompt.js';
import {
  Repository,
  type ActionRecord,
} from '../db/repositories.js';
import { parseOdraEvent } from './events.js';
import {
  readActionEvidence,
  type ActionEvidence,
} from '../evidence/store.js';

interface ReconcileOptions {
  repositoryPath: string;
  config: BondsmanConfig;
  deployment: Deployment;
  repository: Repository;
}

interface ChainAction {
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
  fault_class?: string;
  evidence_root?: string;
}

function normalizeAddress(value: string): string {
  const account = value.match(/Key::Account\(([0-9a-f]{64})\)/)?.[1];
  if (account) return `account-hash-${account}`;
  const contract = value.match(/Key::Hash\(([0-9a-f]{64})\)/)?.[1];
  if (contract) return `hash-${contract}`;
  return value;
}

function bytesHex(value: string): string {
  const values = value.match(/\d+/g)?.map(Number) ?? [];
  return Buffer.from(values).toString('hex');
}

function evidenceCommitment(faultClass: string, evidenceHex: string): string | null {
  if (!evidenceHex) return null;
  if (faultClass !== 'delivery_contradiction') return `0x${evidenceHex}`;
  return `0x${createHash('blake2b512').update(Buffer.from(evidenceHex, 'hex')).digest('hex').slice(0, 64)}`;
}

async function optionalJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }
    throw error;
  }
}

function transactionForEvent(
  transactions: Record<string, string> | undefined,
  type: string,
): string | null {
  const normalizedType = type.replace(/V2$/, '');
  const key = {
    ActionInitiated: 'initiate',
    BondPosted: 'postBond',
    ActionExecuted: 'execute',
    ActionChallenged: 'challenge',
    ResolvedSlash: 'resolve',
    ResolvedRefund: 'resolve',
    BondLocked: 'postBond',
    BondReleased: 'resolve',
    BondSlashed: 'resolve',
    PayoutApproved: 'execute',
    DuplicateDetected: 'execute',
    ActionInitiatedV2: 'initiate',
    ActionChallengedV2: 'challenge',
    ResolvedSlashV2: 'resolve',
    PayoutApprovedV2: 'execute',
    DuplicateDetectedV2: 'execute',
    ResolvedRefundV2: 'resolve',
  }[type] as string | undefined;
  const normalizedKey = key ?? ({
    ActionInitiated: 'initiate',
    ActionChallenged: 'challenge',
    ResolvedSlash: 'resolve',
    PayoutApproved: 'execute',
    DuplicateDetected: 'execute',
  }[normalizedType] as string | undefined);
  return normalizedKey ? transactions?.[normalizedKey] ?? null : null;
}

async function importPendingInvoice(
  options: ReconcileOptions,
): Promise<void> {
  const pending = await optionalJson<DecisionInvoice>(
    join(options.repositoryPath, '.data/pending-invoice.json'),
  );
  const seeded =
    (await optionalJson<DecisionInvoice[]>(
      join(options.repositoryPath, '.data/seed-invoices.json'),
    )) ?? [];
  for (const invoice of [...(pending ? [pending] : []), ...seeded]) {
    options.repository.upsertInvoice({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      debtor: invoice.debtor,
      amount: invoice.amount,
      vendor: invoice.vendor,
      dueDate: invoice.dueDate,
      delivered: invoice.delivered,
      claimHash: claimHash(
        invoice.debtor,
        invoice.invoiceNumber,
      ).toString('hex'),
      paid: false,
    });
  }
}

export async function reconcileChain(
  options: ReconcileOptions,
): Promise<void> {
  const signerPath = join(options.repositoryPath, '.keys/agent.pem');
  const contracts = activeContracts(options.deployment);
  const controllerHash =
    options.deployment.contracts.controller.contractHash;
  const evidence = new Map<number, ActionEvidence | undefined>();
  const evidenceFor = async (actionId: number) => {
    if (!evidence.has(actionId)) {
      evidence.set(
        actionId,
        await readActionEvidence(
          options.repositoryPath,
          controllerHash,
          actionId,
        ),
      );
    }
    return evidence.get(actionId);
  };
  await importPendingInvoice(options);

  const actionIds = new Set<number>();
  let reserveChanged = false;
  for (const contract of [
    contracts.token,
    contracts.vault,
    contracts.controller,
    contracts.pool,
  ]) {
    const cursor = options.repository.eventCursor(contract);
    const events = await readEvents({
      repository: options.repositoryPath,
      config: options.config,
      signerPath,
      contract,
    });
    for (const event of events) {
      // The CLI returns a bounded recent window. Persisting the highest index
      // means a wakeup only projects new events instead of rebuilding every
      // historical action on each listener tick.
      if (cursor !== undefined && event.index <= cursor) continue;
      const parsed = parseOdraEvent(event.data);
      const actionId = parsed.fields.action_id
        ? Number(parsed.fields.action_id)
        : null;
      if (actionId !== null) actionIds.add(actionId);
      const local =
        actionId === null ? undefined : await evidenceFor(actionId);
      options.repository.upsertEvent({
        contract,
        eventIndex: event.index,
        eventType: parsed.type,
        actionId,
        data: JSON.stringify(parsed.fields),
        transactionHash: transactionForEvent(
          local?.run.transactions,
          parsed.type,
        ),
      });
      options.repository.advanceEventCursor(contract, event.index);
      reserveChanged = reserveChanged || contract === contracts.pool;
    }
  }

  for (const actionId of actionIds) {
    const serialized = await readContract<string>({
      repository: options.repositoryPath,
      config: options.config,
      signerPath,
      contract: contracts.controller,
      entrypoint: 'get_action',
      arguments: ['--action_id', String(actionId)],
    });
    const action = JSON.parse(serialized) as ChainAction;
    const localEvidence = await evidenceFor(actionId);
    const run = localEvidence?.run;
    const projected = options.repository.action(actionId);
    const watchdogCatch = options.repository.watchdogCatch(actionId);
    const challenger =
      action.challenger === 'None'
        ? null
        : normalizeAddress(action.challenger);
    const duplicateProven =
      (await readContract<string>({
        repository: options.repositoryPath,
        config: options.config,
        signerPath,
        contract: contracts.pool,
        entrypoint: 'is_action_duplicate',
        arguments: ['--action_id', String(actionId)],
      })) === 'true';
    const faultClass = action.fault_class === 'delivery_contradiction'
      ? 'delivery_contradiction'
      : 'duplicate_claim';
    const evidenceRoot = action.evidence_root
      ? bytesHex(action.evidence_root)
      : '';
    const record: ActionRecord = {
      actionId,
      invoiceId: Number(action.invoice_id),
      agent: normalizeAddress(action.agent),
      amount: action.amount,
      claimHash: bytesHex(action.claim_hash),
      reasoning: run?.reasoning ?? projected?.reasoning ?? '',
      reasoningHash: bytesHex(action.reasoning_hash),
      bondRequired: action.bond_required,
      bondPosted: action.bond_posted,
      windowEnd: Number(action.window_end),
      status: action.status,
      challenger,
      challengerType:
        challenger === null
          ? null
          : challenger ===
              `account-hash-${options.deployment.accounts.watchdog.accountHash}`
            ? 'watchdog'
            : challenger ===
                `account-hash-${options.deployment.accounts.challenger.accountHash}`
              ? 'manual'
              : 'external-wallet',
      challengeSigning:
        challenger === null
          ? null
          : challenger ===
              `account-hash-${options.deployment.accounts.watchdog.accountHash}`
            ? 'watchdog-key'
            : challenger ===
                `account-hash-${options.deployment.accounts.challenger.accountHash}`
              ? 'backend-key'
              : 'external-wallet',
      controllerHash,
      duplicateProven,
      faultClass,
      evidenceRoot:
        evidenceCommitment(faultClass, evidenceRoot) ??
        projected?.evidenceRoot ??
        null,
      reservedForManual: projected?.reservedForManual ?? false,
      transactions: {
        ...Object.fromEntries(
          Object.entries(run?.transactions ?? {}).filter(
            (entry): entry is [string, string] => !!entry[1],
          ),
        ),
        ...(watchdogCatch
          ? {
              challenge: watchdogCatch.challengeTx,
              resolve: watchdogCatch.resolveTx,
            }
          : {}),
      },
    };
    options.repository.upsertAction(record);
    try {
      const reputationJson = await readContract<string>({
        repository: options.repositoryPath,
        config: options.config,
        signerPath,
        contract: contracts.controller,
        entrypoint: 'get_reputation',
        arguments: ['--agent', record.agent],
      });
      const reputation = JSON.parse(reputationJson) as {
        clean: string;
        slashed: string;
        score: string;
      };
      options.repository.setReputation(
        record.agent,
        Number(reputation.clean),
        Number(reputation.slashed),
        Number(reputation.score),
      );
    } catch (error) {
      if (options.deployment.current !== 'v2') throw error;
      const reason =
        error instanceof Error ? error.message : String(error);
      if (!/get_reputation|unrecognized subcommand|No such entry/i.test(reason)) {
        throw error;
      }
    }
    const invoice = options.repository
      .listInvoices()
      .find((candidate) => candidate.id === record.invoiceId);
    if (invoice) {
      options.repository.upsertInvoice({
        ...invoice,
        paid: !['Initiated', 'Bonded'].includes(record.status),
      });
    }
  }

  if (reserveChanged || options.repository.reserve() === '0') {
    const reserve = await readContract<string>({
      repository: options.repositoryPath,
      config: options.config,
      signerPath,
      contract: contracts.pool,
      entrypoint: 'reserve_balance',
      arguments: [],
    });
    options.repository.setReserve(reserve);
  }
  options.repository.setSystemState('listener', {
    running: true,
    lastReconciledAt: new Date().toISOString(),
    newActionCount: actionIds.size,
  });
}

export async function resolveExpiredClean(
  options: ReconcileOptions,
): Promise<string[]> {
  const hashes: string[] = [];
  const failures: Record<string, string> = {};
  const signerPath = join(options.repositoryPath, '.keys/agent.pem');
  const contracts = activeContracts(options.deployment);
  for (const actionId of options.repository.expiredCleanActions(
    Date.now(),
  )) {
    const local = options.repository.action(actionId);
    if (!local) continue;
    try {
      const serialized = await readContract<string>({
        repository: options.repositoryPath,
        config: options.config,
        signerPath,
        contract: contracts.controller,
        entrypoint: 'get_action',
        arguments: ['--action_id', String(actionId)],
      });
      const chainAction = JSON.parse(serialized) as ChainAction;
      if (
        chainAction.status !== 'Executed' ||
        Number(chainAction.window_end) >= Date.now()
      ) {
        options.repository.upsertAction({
          ...local,
          status: chainAction.status,
          windowEnd: Number(chainAction.window_end),
          challenger: chainAction.challenger === 'None'
            ? null
            : normalizeAddress(chainAction.challenger),
        });
        continue;
      }
    } catch (error) {
      failures[String(actionId)] =
        error instanceof Error ? error.message : String(error);
      continue;
    }
    try {
      hashes.push(await callContract({
        repository: options.repositoryPath,
        config: options.config,
        signerPath,
        contract: contracts.controller,
        entrypoint: 'resolve_action',
        arguments: ['--action_id', String(actionId)],
      }));
    } catch (error) {
      failures[String(actionId)] =
        error instanceof Error ? error.message : String(error);
    }
  }
  if (hashes.length) await reconcileChain(options);
  if (Object.keys(failures).length) {
    options.repository.setSystemState('listener_expiry_resolution', {
      ok: false,
      failedAt: new Date().toISOString(),
      failures,
    });
  } else {
    options.repository.setSystemState('listener_expiry_resolution', {
      ok: true,
      checkedAt: new Date().toISOString(),
    });
  }
  return hashes;
}
