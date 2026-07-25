import type {
  ActionRecord,
  Repository,
  WatchdogCatchRecord,
} from '../db/repositories.js';
import {
  detectDeliveryContradictions,
  detectDuplicateActions,
} from './detection.js';

export interface WatchdogChallengeCandidate {
  action: ActionRecord;
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
  evidence: Buffer;
  evidenceRoot: string | null;
}

interface WatchdogServiceOptions {
  repository: Repository;
  watchdogAddress: string;
  delayMs: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  transact: (
    candidate: WatchdogChallengeCandidate,
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
      const duplicateCandidates = detectDuplicateActions(
        options.repository.listActions(),
        now(),
      )
        .filter(
          (action) =>
            !options.repository.hasWatchdogCatch(action.actionId),
        )
        .map((action): WatchdogChallengeCandidate => ({
          action,
          faultClass: 'duplicate_claim',
          evidence: Buffer.from([0]),
          evidenceRoot: null,
        }));
      const deliveryCandidates = detectDeliveryContradictions(
        options.repository.listActions(),
        (actionId) =>
          options.repository.deliveryAttestationForAction(actionId),
        now(),
      )
        .filter(
          ({ action }) =>
            !options.repository.hasWatchdogCatch(action.actionId),
        )
        .map(
          ({ action, attestation, evidence }): WatchdogChallengeCandidate => ({
            action,
            faultClass: 'delivery_contradiction',
            evidence,
            evidenceRoot: attestation.evidenceRoot,
          }),
        );
      for (const candidate of [
        ...duplicateCandidates,
        ...deliveryCandidates,
      ]) {
        await sleep(options.delayMs);
        const current = options.repository.action(candidate.action.actionId);
        if (!current) continue;
        const stillEligible = candidate.faultClass === 'duplicate_claim'
          ? detectDuplicateActions(
              options.repository.listActions(),
              now(),
            ).some((action) => action.actionId === current.actionId)
          : detectDeliveryContradictions(
              options.repository.listActions(),
              (actionId) =>
                options.repository.deliveryAttestationForAction(actionId),
              now(),
            ).some(({ action }) => action.actionId === current.actionId);
        if (!stillEligible) continue;
        if (
          candidate.evidenceRoot &&
          !options.repository.useDeliveryEvidence(
            candidate.evidenceRoot,
            current.actionId,
          )
        ) {
          continue;
        }

        const candidateAction = {
          ...current,
          faultClass: candidate.faultClass,
          evidenceRoot: candidate.evidenceRoot,
        };
        const reasoning = await options.reasoning(candidateAction);
        let transactions: { challenge: string; resolve: string };
        try {
          transactions = await options.transact({
            ...candidate,
            action: current,
          });
        } catch (error) {
          if (candidate.evidenceRoot) {
            options.repository.releaseDeliveryEvidence(
              candidate.evidenceRoot,
              current.actionId,
            );
          }
          // One candidate that reverts on chain (e.g. already challenged by
          // a race with another watchdog instance, or a stale local
          // projection) must not block every other candidate in this scan.
          // Only successful catches are excluded via hasWatchdogCatch, so
          // re-throwing here would retry — and abort on — this exact
          // candidate forever, starving anything queued after it.
          console.error({
            event: 'watchdog_candidate_failed',
            actionId: current.actionId,
            faultClass: candidate.faultClass,
            reason: error instanceof Error ? error.message : String(error),
          });
          // A revert here often means the local projection is stale, not
          // that this candidate is unresolvable — e.g. another watchdog
          // instance sharing this same on-chain account already
          // challenged it. Reconcile so the next scan sees current chain
          // state instead of retrying (and re-paying gas for) the same
          // already-settled action forever.
          if (options.reconcile) await options.reconcile();
          continue;
        }
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
          ...candidateAction,
          status: 'ResolvedSlash',
          challenger: options.watchdogAddress,
          challengerType: 'watchdog',
          challengeSigning: 'watchdog-key',
          faultClass: candidate.faultClass,
          evidenceRoot: candidate.evidenceRoot,
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
