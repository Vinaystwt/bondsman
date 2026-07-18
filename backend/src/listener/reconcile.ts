import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import type { Deployment } from '../shared/deployment.js';
import {
  callContract,
  readContract,
  readEvents,
} from '../casper/odra-cli.js';
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
  }[type] as string | undefined;
  return key ? transactions?.[key] ?? null : null;
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
    'MockCsprUSD',
    'BondVault',
    'BondsmanController',
    'InvoicePool',
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
      reserveChanged = reserveChanged || contract === 'InvoicePool';
    }
  }

  for (const actionId of actionIds) {
    const serialized = await readContract<string>({
      repository: options.repositoryPath,
      config: options.config,
      signerPath,
      contract: 'BondsmanController',
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
        contract: 'InvoicePool',
        entrypoint: 'is_action_duplicate',
        arguments: ['--action_id', String(actionId)],
      })) === 'true';
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
    const reputationJson = await readContract<string>({
      repository: options.repositoryPath,
      config: options.config,
      signerPath,
      contract: 'BondsmanController',
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
      contract: 'InvoicePool',
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
  const signerPath = join(options.repositoryPath, '.keys/agent.pem');
  for (const actionId of options.repository.expiredCleanActions(
    Date.now(),
  )) {
    hashes.push(
      await callContract({
        repository: options.repositoryPath,
        config: options.config,
        signerPath,
        contract: 'BondsmanController',
        entrypoint: 'resolve_action',
        arguments: ['--action_id', String(actionId)],
      }),
    );
  }
  if (hashes.length) await reconcileChain(options);
  return hashes;
}
