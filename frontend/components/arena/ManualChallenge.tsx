'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { clientApi, ApiError } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import { buildChallengeDeploy, attachSignature } from '@/lib/challenge-deploy';
import type { ActionDetail, DemoJob, WalletResolveResult } from '@/lib/types';
import { parseEventData, serial, truncateHash, txExplorer, accountExplorer } from '@/lib/format';
import Seal from '@/components/Seal';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { Label } from '@/components/ui/Primitives';
import Countdown from './Countdown';
import PendingStepper from './PendingStepper';

type Phase =
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitted'
  | 'finalizing'
  | 'resolving'
  | 'success'
  | 'rejected'
  | 'timeout'
  | 'resolve_error'
  | 'error'
  | 'expired'
  | 'backend_submitting'
  | 'backend_pending'
  | 'backend_resolved';

function asAmount(v: unknown): string | null {
  return typeof v === 'string' && /^\d+$/.test(v) ? v : null;
}

function pendingChallengeKey(actionId: number): string {
  return `bondsman.walletChallenge.${actionId}`;
}

function savePendingChallenge(actionId: number, deployHash: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    pendingChallengeKey(actionId),
    JSON.stringify({ deployHash, savedAt: Date.now() }),
  );
}

function loadPendingChallenge(actionId: number): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(pendingChallengeKey(actionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { deployHash?: unknown };
    return typeof parsed.deployHash === 'string'
      ? parsed.deployHash
      : null;
  } catch {
    return null;
  }
}

function clearPendingChallenge(actionId: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(pendingChallengeKey(actionId));
}

function backendJobKey(actionId: number): string {
  return `bondsman.backendChallenge.${actionId}`;
}

// One global pointer to the most recent challenge job so the Arena can
// recover the pending card after a reload, even though the challenged action
// has left the ready pool.
export const ACTIVE_JOB_KEY = 'bondsman.activeChallengeJob';

function saveBackendJob(actionId: number, jobId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(backendJobKey(actionId), jobId);
  window.localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify({ jobId, actionId }));
}

function loadBackendJob(actionId: number): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(backendJobKey(actionId));
}

function clearBackendJob(actionId: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(backendJobKey(actionId));
  window.localStorage.removeItem(ACTIVE_JOB_KEY);
}

export default function ManualChallenge({
  initial,
  onResolved,
}: {
  initial: ActionDetail;
  onResolved: () => void;
}) {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const [action, setAction] = useState<ActionDetail>(initial);
  const [phase, setPhase] = useState<Phase>(() => {
    if (initial.status === 'ResolvedSlash') return 'backend_resolved';
    // A persisted challenge job for this action means the wait is in
    // progress, not that the case expired, even though the on-chain status
    // may already read Challenged.
    if (loadBackendJob(initial.actionId)) return 'backend_pending';
    if (initial.status !== 'Executed' || initial.windowEnd <= Date.now() || initial.challenger)
      return 'expired';
    return 'idle';
  });
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<WalletResolveResult | null>(null);
  const [error, setError] = useState('');
  const [controllerHash, setControllerHash] = useState('');
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase !== 'idle') return;
    if (action.windowEnd <= Date.now()) {
      setPhase('expired');
      return;
    }
    const timer = setTimeout(() => setPhase('expired'), action.windowEnd - Date.now());
    return () => clearTimeout(timer);
  }, [phase, action.windowEnd]);

  useEffect(() => {
    return () => { pollAbort.current?.abort(); };
  }, []);

  useEffect(() => {
    if (phase !== 'idle') return;
    const pendingHash = loadPendingChallenge(action.actionId);
    if (!pendingHash) return;
    if (
      action.status !== 'Executed' ||
      action.windowEnd <= Date.now() ||
      action.challenger
    ) {
      clearPendingChallenge(action.actionId);
      return;
    }
    setDeployHash(pendingHash);
    setPhase('timeout');
  }, [action.actionId, action.challenger, action.status, action.windowEnd, phase]);

  // Backend challenge jobs are persisted by the API and their id survives a
  // refresh. Resume both the pending state and the poll loop.
  const resumedJob = useRef(false);
  useEffect(() => {
    if (resumedJob.current) return;
    if (phase !== 'idle' && phase !== 'backend_pending') return;
    const jobId = loadBackendJob(action.actionId);
    if (!jobId) return;
    resumedJob.current = true;
    setPhase('backend_pending');
    void pollBackendJob(jobId).catch(() => {
      // Job persisted server-side; manual check button recovers it.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.actionId, phase]);

  const walletChallenge = useCallback(async () => {
    if (action.windowEnd <= Date.now()) {
      setPhase('expired');
      return;
    }
    setError('');
    setDeployHash(null);
    setWalletResult(null);

    try {
      setPhase('building');
      const deployments = await clientApi.deployments();
      const pkgHash = deployments.contracts?.controller?.packageHash ?? '';
      setControllerHash(pkgHash);
      if (!pkgHash) throw new Error('Controller contract not found');

      const { deployJson, deployHash: hash } = buildChallengeDeploy(
        wallet.publicKey!,
        pkgHash,
        action.actionId,
      );
      setDeployHash(hash);

      setPhase('signing');
      const signResult = await wallet.sign(JSON.stringify(deployJson));
      if (signResult.cancelled) {
        setPhase('rejected');
        return;
      }

      const signedDeploy = attachSignature(
        deployJson,
        signResult.signatureHex,
        wallet.publicKey!,
      );

      setPhase('submitted');
      const putResult = await clientApi.putDeploy(
        signedDeploy,
        deployments.nodeRpcUrl,
      );
      const finalHash = putResult.deploy_hash || hash;
      setDeployHash(finalHash);
      savePendingChallenge(action.actionId, finalHash);

      setPhase('finalizing');
      const controller = new AbortController();
      pollAbort.current = controller;
      const startTime = Date.now();

      while (!controller.signal.aborted) {
        if (Date.now() - startTime > 300_000) {
          setPhase('timeout');
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
        if (controller.signal.aborted) return;
        try {
          const tx = await clientApi.transactionStatus(finalHash);
          if (tx.final && tx.success) break;
          if (tx.final && !tx.success) {
            setError(tx.error || 'The challenge deploy failed on chain.');
            clearPendingChallenge(action.actionId);
            setPhase('error');
            return;
          }
        } catch {
          // keep polling
        }
      }
      if (controller.signal.aborted) return;

      setPhase('resolving');
      let resolveResult: WalletResolveResult | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          resolveResult = await clientApi.walletResolve(action.actionId, finalHash);
          break;
        } catch (err) {
          if (err instanceof ApiError && err.code === 'CHALLENGE_NOT_FINAL') {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          throw err;
        }
      }

      if (!resolveResult) {
        setPhase('resolve_error');
        return;
      }

      setWalletResult(resolveResult);
      clearPendingChallenge(action.actionId);
      setPhase('success');
      onResolved();
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'The challenge could not be completed.';
      setError(msg);
      setPhase('error');
    }
  }, [action, wallet, onResolved]);

  const retryResolve = useCallback(async () => {
    if (!deployHash) return;
    setPhase('resolving');
    try {
      const result = await clientApi.walletResolve(action.actionId, deployHash);
      setWalletResult(result);
      clearPendingChallenge(action.actionId);
      setPhase('success');
      onResolved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Resolution is still delayed.';
      setError(msg);
      setPhase('resolve_error');
    }
  }, [action.actionId, deployHash, onResolved]);

  const recheckFinality = useCallback(async () => {
    if (!deployHash) return;
    setPhase('finalizing');
    try {
      const tx = await clientApi.transactionStatus(deployHash);
      if (tx.final && tx.success) {
        setPhase('resolving');
        const result = await clientApi.walletResolve(action.actionId, deployHash);
        setWalletResult(result);
        clearPendingChallenge(action.actionId);
        setPhase('success');
        onResolved();
        return;
      }
      if (tx.final && !tx.success) {
        setError(tx.error || 'The challenge deploy failed on chain.');
        clearPendingChallenge(action.actionId);
        setPhase('error');
        return;
      }
    } catch {
      // still not final
    }
    setPhase('timeout');
  }, [action.actionId, deployHash, onResolved]);

  // Backend-signed challenge (fallback path, existing behavior)
  const [backendChallengeTx, setBackendChallengeTx] = useState<string | null>(null);
  const [backendJob, setBackendJob] = useState<DemoJob | null>(null);

  const checkBackendJob = useCallback(async (jobId: string) => {
    const job = await clientApi.job(jobId);
    setBackendJob(job);
    setBackendChallengeTx(job.challengeTx);
    if (job.actionId !== null) {
      const fresh = await clientApi.action(job.actionId);
      setAction(fresh);
      if (fresh.status === 'ResolvedSlash' || job.status === 'resolved') {
        clearBackendJob(action.actionId);
        setPhase('backend_resolved');
        onResolved();
      }
    }
    if (job.status === 'failed') {
      setError(job.error ?? 'The background challenge job failed.');
      setPhase('error');
    }
    return job;
  }, [action.actionId, onResolved]);

  const pollBackendJob = useCallback(async (jobId: string) => {
    // Fast poll for the first five minutes, then slow poll. The job is
    // persisted server-side, so this never flips to a failure state on its
    // own: the wait is chain finality, not a fault.
    for (let i = 0; i < 300; i += 1) {
      try {
        const job = await checkBackendJob(jobId);
        if (['resolved', 'failed'].includes(job.status)) return;
      } catch {
        // Transient fetch error; the job itself is persisted. Keep polling.
      }
      await new Promise((resolve) => setTimeout(resolve, i < 120 ? 2500 : 10_000));
    }
  }, [checkBackendJob]);

  const backendChallenge = useCallback(async () => {
    if (action.windowEnd <= Date.now()) {
      setPhase('expired');
      return;
    }
    setError('');
    try {
      setPhase('backend_submitting');
      const job = await clientApi.challenge(action.actionId);
      setBackendJob(job);
      setBackendChallengeTx(job.challengeTx);
      saveBackendJob(action.actionId, job.id);
      setPhase('backend_pending');
      void pollBackendJob(job.id).catch(() => {
        // Polling stopped; the job is persisted and the manual check button
        // below recovers it. Stay in the pending (progress) state.
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'The challenge could not be submitted.';
      setError(msg);
      setPhase('error');
    }
  }, [action, pollBackendJob]);

  const slash = action.events.find((e) => e.eventType === 'BondSlashed');
  const data = slash ? parseEventData(slash.data) : {};
  const challengerAmount = asAmount(data.challenger_amount);
  const reserveAmount = asAmount(data.pool_amount) ?? asAmount(data.reserve_amount);
  const resolvedSlash = action.status === 'ResolvedSlash';

  const sealState =
    (phase === 'success' || (phase === 'backend_resolved' && resolvedSlash)) ? 'strike' : 'stamp';

  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface">
      <div className="grid gap-6 border-b border-rule p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <motion.div
          className="grid place-items-center"
          animate={
            (phase === 'finalizing' || phase === 'backend_pending' || phase === 'resolving') && !reduce
              ? { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 1.6 } }
              : { scale: 1 }
          }
        >
          <Seal state={sealState} size={116} />
        </motion.div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="serial text-[0.62rem] text-muted">{serial(action.actionId)}</span>
            {phase === 'idle' && <Countdown windowEnd={action.windowEnd} />}
          </div>
          <p className="mt-2 font-mono text-3xl text-bone tabular">
            <Money atomic={action.amount} />
          </p>
          <p className="mt-1 text-sm text-muted">
            Bond at stake <Money atomic={action.bondPosted} />
          </p>
        </div>
      </div>

      <div className="p-6">
        <Label>The agent approved this payout</Label>
        <blockquote className="mt-2 border-l-2 border-rule pl-4 text-sm leading-relaxed text-bone">
          {action.reasoning?.trim()
            ? `“${action.reasoning}”`
            : 'This payout reused a claim that had already been paid. The invoice was paid once before.'}
        </blockquote>

        <p className="mt-4 rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm leading-relaxed text-bone">
          This payout is a duplicate claim. The same invoice was already paid.
          Challenging it will slash the bond.
        </p>

        <AnimatePresence mode="wait">
          {/* IDLE: recommended backend job, wallet path is intentionally secondary */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-4"
            >
              <>
                <button
                  type="button"
                  onClick={backendChallenge}
                  className="w-full rounded-md bg-accent px-5 py-3.5 font-medium text-ink transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Run live challenge
                </button>
                <p className="text-xs text-muted">
                  A funded demo key signs the challenge; the reward goes to that
                  key. The job is persisted, so a reload picks up right here.
                </p>
                <details className="rounded-md border border-rule bg-ink px-4 py-3">
                  <summary className="cursor-pointer text-sm text-muted">Advanced: Wallet-signed challenge beta</summary>
                  <p className="mt-3 text-xs leading-relaxed text-muted">Wallet-signed challenges submit from your Casper wallet and may take longer on testnet. The funded demo key is the recommended judge path.</p>
                  {wallet.connected && wallet.publicKey ? (
                    <>
                  <div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                    Connected as {truncateHash(wallet.publicKey)}
                  </div>
                  <button
                    type="button"
                    onClick={walletChallenge}
                    className="w-full rounded-md border border-rule px-5 py-2.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-bone"
                  >
                    Experimental wallet challenge
                  </button>
                  <p className="text-xs text-muted">
                    Wallet signing costs ~50 CSPR gas.{' '}
                    <a
                      href="https://testnet.cspr.live/tools/faucet"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline decoration-rule underline-offset-2 hover:decoration-accent"
                    >
                      Need testnet gas?
                    </a>
                  </p>
                    </>
                  ) : (
                    <>
                  {wallet.available ? (
                    <button
                      type="button"
                      onClick={wallet.connect}
                      className="w-full rounded-md bg-accent/20 border border-accent/40 px-5 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <WalletIcon />
                        Connect Wallet to Challenge
                      </span>
                    </button>
                  ) : (
                    <a
                      href="https://www.casperwallet.io"
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-accent/20 border border-accent/40 px-5 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
                    >
                      <WalletIcon />
                      Install Casper Wallet to Challenge
                    </a>
                  )}
                    </>
                  )}
                </details>
              </>
            </motion.div>
          )}

          {/* BUILDING */}
          {phase === 'building' && (
            <PhaseBox key="building">
              <StatusLine icon="spinner" text="Preparing the challenge transaction..." />
              <Detail label="Action" value={serial(action.actionId)} />
              {controllerHash && (
                <Detail label="Controller" value={truncateHash(controllerHash)} />
              )}
            </PhaseBox>
          )}

          {/* SIGNING */}
          {phase === 'signing' && (
            <PhaseBox key="signing">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={reduce ? {} : { scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <WalletIcon size={20} />
                </motion.div>
                <p className="text-sm text-accent">Confirm in your Casper Wallet.</p>
              </div>
              <Detail label="Action" value={serial(action.actionId)} />
              <Detail label="Estimated gas" value="~50 CSPR" />
            </PhaseBox>
          )}

          {/* REJECTED */}
          {phase === 'rejected' && (
            <PhaseBox key="rejected">
              <p className="rounded-md border border-rule bg-ink px-4 py-3 text-sm text-muted">
                Challenge cancelled. No transaction was sent and no gas was spent.
              </p>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Back
              </button>
            </PhaseBox>
          )}

          {/* SUBMITTED */}
          {phase === 'submitted' && (
            <PhaseBox key="submitted">
              <StatusLine icon="spinner" text="Challenge broadcast to Casper testnet." />
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
            </PhaseBox>
          )}

          {/* FINALIZING */}
          {phase === 'finalizing' && (
            <PhaseBox key="finalizing">
              <StatusLine
                icon="spinner"
                text="Waiting for block finality. This usually takes 30 to 90 seconds on testnet."
              />
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
            </PhaseBox>
          )}

          {/* TIMEOUT */}
          {phase === 'timeout' && (
            <PhaseBox key="timeout">
              <p className="rounded-md border border-rule bg-ink px-4 py-3 text-sm text-bone">
                Still pending on Casper testnet. Your challenge transaction was
                accepted by the node and is recoverable from this screen; if it
                finalized already, the check below will resolve the slash.
              </p>
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
              <button
                type="button"
                onClick={recheckFinality}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Check status again
              </button>
            </PhaseBox>
          )}

          {/* RESOLVING */}
          {phase === 'resolving' && (
            <PhaseBox key="resolving">
              <StatusLine icon="spinner" text="Resolving on contract..." />
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
            </PhaseBox>
          )}

          {/* RESOLVE_ERROR */}
          {phase === 'resolve_error' && (
            <PhaseBox key="resolve_error">
              <p className="rounded-md border border-rule bg-ink px-4 py-3 text-sm text-bone">
                Your challenge is confirmed on chain, but resolution is delayed.
                The protocol will settle within minutes.
              </p>
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
              <button
                type="button"
                onClick={retryResolve}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Try resolving again
              </button>
            </PhaseBox>
          )}

          {/* SUCCESS (wallet) */}
          {phase === 'success' && walletResult && (
            <motion.div
              key="success"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-4"
            >
              <p className="text-lg font-medium text-slash">Bond slashed.</p>
              <p className="text-sm text-bone">
                You claimed <Money atomic={walletResult.rewardAmount} /> csprUSD.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <SplitCard
                  label="To you, the challenger"
                  amount={walletResult.challengerShare}
                  delay={0.05}
                  reduce={!!reduce}
                />
                <SplitCard
                  label="To the reserve"
                  amount={walletResult.reserveShare}
                  delay={0.15}
                  reduce={!!reduce}
                />
              </div>
              <ChallengerLine
                storedChallenger={walletResult.challenger}
                connectedKey={wallet.publicKey}
              />
              <div className="space-y-2 border-t border-rule pt-3">
                <TxLine label="Challenge" hash={walletResult.challengeDeployHash} />
                <TxLine label="Resolve" hash={walletResult.resolveDeployHash} />
              </div>
              <Link
                href="/app/arena"
                className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
              >
                Find the next case
              </Link>
            </motion.div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <PhaseBox key="error">
              <p className="rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm text-bone">
                {error}
              </p>
              {deployHash && <TxLine label="Deploy" hash={deployHash} />}
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Try again
              </button>
            </PhaseBox>
          )}

          {/* EXPIRED */}
          {phase === 'expired' && (
            <motion.div
              key="expired"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5"
            >
              <p className="rounded-md border border-rule bg-surface px-4 py-3 text-sm text-muted">
                The challenge window for this action has closed.
              </p>
            </motion.div>
          )}

          {/* BACKEND submitting/pending (fallback path) */}
          {(phase === 'backend_submitting' || phase === 'backend_pending') && (
            <motion.div
              key="backend_pending"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5 space-y-4"
            >
              <PendingStepper status={backendJob?.status ?? 'queued'} />
              {backendChallengeTx && <TxLine label="Challenge" hash={backendChallengeTx} />}
              <p className="text-xs text-muted">
                The job survives reloads and restarts. Leave this page and come
                back; the result lands here and in the proof above.
              </p>
              {backendJob && (
                <button
                  type="button"
                  onClick={() => void checkBackendJob(backendJob.id)}
                  className="rounded-md border border-rule px-4 py-2 text-sm text-bone transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  Check status now
                </button>
              )}
            </motion.div>
          )}

          {/* BACKEND resolved (fallback path) */}
          {phase === 'backend_resolved' && (
            <BackendBondSplit
              resolvedSlash={resolvedSlash}
              challengerAmount={challengerAmount}
              reserveAmount={reserveAmount}
              challengeTx={backendChallengeTx ?? action.transactions.challenge ?? null}
              resolveTx={action.transactions.resolve ?? null}
              actionId={action.actionId}
              reduce={!!reduce}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChallengerLine({
  storedChallenger,
  connectedKey,
}: {
  storedChallenger: string;
  connectedKey: string | null;
}) {
  const isYou =
    connectedKey &&
    storedChallenger.toLowerCase().includes(connectedKey.toLowerCase().slice(0, 20));
  return (
    <div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
      {isYou ? (
        <>
          <span className="font-medium text-accent">Challenger: You</span>
          <CopyHash value={storedChallenger} href={accountExplorer(storedChallenger)} label={truncateHash(storedChallenger)} />
        </>
      ) : (
        <>
          <span className="text-muted">Challenger:</span>
          <CopyHash value={storedChallenger} href={accountExplorer(storedChallenger)} label={truncateHash(storedChallenger)} />
        </>
      )}
    </div>
  );
}

function PhaseBox({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-5 space-y-3"
      {...props}
    >
      {children}
    </motion.div>
  );
}

function StatusLine({ icon, text }: { icon: 'spinner'; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-accent">
      {icon === 'spinner' && <Spinner />}
      {text}
    </p>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-muted">
      {label}: <span className="font-mono text-bone">{value}</span>
    </p>
  );
}

function BackendBondSplit({
  resolvedSlash,
  challengerAmount,
  reserveAmount,
  challengeTx,
  resolveTx,
  actionId,
  reduce,
}: {
  resolvedSlash: boolean;
  challengerAmount: string | null;
  reserveAmount: string | null;
  challengeTx: string | null;
  resolveTx: string | null;
  actionId: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      key="backend_resolved"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 space-y-4"
    >
      <p className={`text-lg font-medium ${resolvedSlash ? 'text-slash' : 'text-accent'}`}>
        {resolvedSlash
          ? 'Payout challenged. Bond slashed.'
          : 'The window closed clean. The bond returned in full.'}
      </p>
      {resolvedSlash && (
        <p className="text-sm text-muted">
          Demo Challenge (Backend Key). The reward went to the backend key.
        </p>
      )}

      {resolvedSlash && (challengerAmount || reserveAmount) && (
        <div className="grid grid-cols-2 gap-3">
          <SplitCard label="To the backend key" amount={challengerAmount} delay={0.05} reduce={reduce} />
          <SplitCard label="To the reserve" amount={reserveAmount} delay={0.15} reduce={reduce} />
        </div>
      )}

      <div className="space-y-2 border-t border-rule pt-3">
        {challengeTx && <TxLine label="Challenge" hash={challengeTx} />}
        {resolveTx && <TxLine label="Resolve" hash={resolveTx} />}
      </div>
      <Link
        href={`/app/actions/${actionId}`}
        className="inline-block text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
      >
        See the full action
      </Link>
    </motion.div>
  );
}

function SplitCard({
  label,
  amount,
  delay,
  reduce,
}: {
  label: string;
  amount: string | null;
  delay: number;
  reduce: boolean;
}) {
  if (!amount) return null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-md border border-rule bg-ink px-4 py-3"
    >
      <Label>{label}</Label>
      <p className="mt-1 text-lg text-bone">
        <Money atomic={amount} />
      </p>
    </motion.div>
  );
}

function TxLine({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label} transaction</span>
      <CopyHash value={hash} href={txExplorer(hash)} label={truncateHash(hash)} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
      <rect x="2" y="5" width="20" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
      <path d="M6 5V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
