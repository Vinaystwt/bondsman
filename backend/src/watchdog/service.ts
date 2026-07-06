import type {
  ActionRecord,
  Repository,
  WatchdogCatchRecord,
} from '../db/repositories.js';
import { detectDuplicateActions } from './detection.js';

interface WatchdogServiceOptions {
  repository: Repository;
  watchdogAddress: string;
  delayMs: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  transact: (
    actionId: number,
  ) => Promise<{ challenge: string; resolve: string }>;
  reasoning: (action: ActionRecord) => Promise<string>;
  reconcile?: () => Promise<void>;
}

export interface WatchdogService {
  scanOnce(): Promise<WatchdogCatchRecord[]>;
}

export function createSingleFlight(
  operation: () => Promise<void>,
): () => Promise<void> {
  let active: Promise<void> | undefined;
  return () => {
    if (active) return active;
    active = operation().finally(() => {
      active = undefined;
    });
    return active;
  };
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createWatchdogService(
  options: WatchdogServiceOptions,
): WatchdogService {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;

  return {
    async scanOnce() {
      const caught: WatchdogCatchRecord[] = [];
      const duplicates = detectDuplicateActions(
        options.repository.listActions(),
        now(),
      ).filter(
        (action) => !options.repository.hasWatchdogCatch(action.actionId),
      );
      for (const candidate of duplicates) {
        await sleep(options.delayMs);
        const current = options.repository.action(candidate.actionId);
        if (!current) continue;
        const stillEligible = detectDuplicateActions(
          options.repository.listActions(),
          now(),
        ).some((action) => action.actionId === current.actionId);
        if (!stillEligible) continue;

        const reasoning = await options.reasoning(current);
        const transactions = await options.transact(current.actionId);
        if (options.reconcile) await options.reconcile();
        const record: WatchdogCatchRecord = {
          actionId: current.actionId,
          reward: (BigInt(current.bondPosted) / 2n).toString(),
          reasoning,
          challengeTx: transactions.challenge,
          resolveTx: transactions.resolve,
          timestamp: new Date(now()).toISOString(),
        };
        options.repository.upsertAction({
          ...current,
          status: 'ResolvedSlash',
          challenger: options.watchdogAddress,
          challengerType: 'watchdog',
          challengeSigning: 'watchdog-key',
          transactions: {
            ...current.transactions,
            challenge: transactions.challenge,
            resolve: transactions.resolve,
          },
        });
        options.repository.recordWatchdogCatch(record);
        caught.push(record);
      }
      return caught;
    },
  };
}
