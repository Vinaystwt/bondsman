'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { clientApi, ApiError, BackendUnreachable } from '@/lib/api';
import type { ActionDetail, DemoJob, SlashProof, Watchdog, WatchdogCatch } from '@/lib/types';
import { serial, truncateHash, txExplorer } from '@/lib/format';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import Diagram from '@/components/Diagram';
import { Label } from '@/components/ui/Primitives';

type Phase = 'idle' | 'running' | 'done' | 'timeout' | 'error';

export default function WatchdogEconomy({
  initialWatchdog,
  initialProof = null,
  onResolved,
}: {
  initialWatchdog: Watchdog | null;
  initialProof?: SlashProof | null;
  onResolved: () => void;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [action, setAction] = useState<ActionDetail | null>(null);
  const [watchdog, setWatchdog] = useState<Watchdog | null>(initialWatchdog);
  const [error, setError] = useState('');
  const [job, setJob] = useState<DemoJob | null>(null);

  // Load the watchdog's live earnings independently of the parent's timing.
  useEffect(() => {
    clientApi.watchdog().then(setWatchdog).catch(() => undefined);
  }, []);

  async function run() {
    setPhase('running');
    setError('');
    try {
      const started = await clientApi.watchdogDemoAsync();
      setJob(started);
      await pollJob(started.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof BackendUnreachable) {
        setError('The watchdog job could not be reached. The completed proof above remains available.');
      } else {
        setError('The watchdog demo could not start.');
      }
      setPhase('error');
    }
  }

  async function pollJob(jobId: string) {
    for (let i = 0; i < 120; i += 1) {
      const fresh = await clientApi.job(jobId);
      setJob(fresh);
      if (fresh.status === 'failed') throw new Error(fresh.error ?? 'Watchdog job failed.');
      if (fresh.actionId !== null && fresh.status === 'action_ready') {
        setAction(await clientApi.action(fresh.actionId));
        await poll(fresh.actionId);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    setPhase('timeout');
  }

  async function refreshProof() {
    try {
      const wd = await clientApi.watchdog();
      setWatchdog(wd);
      setError('');
    } catch {
      setError('Could not refresh the watchdog proof right now.');
    }
  }

  async function poll(actionId: number) {
    for (let i = 0; i < 40; i += 1) {
      try {
        const [fresh, wd] = await Promise.all([
          clientApi.action(actionId),
          clientApi.watchdog().catch(() => null),
        ]);
        setAction(fresh);
        if (wd) setWatchdog(wd);
        if (fresh.status === 'ResolvedSlash') {
          setPhase('done');
          onResolved();
          return;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    setPhase('timeout');
  }

  const thisCatch: WatchdogCatch | undefined = action
    ? watchdog?.recentCatches.find((c) => c.actionId === action.actionId)
    : undefined;
  const latestCatch = watchdog?.recentCatches[0];

  const executed = !!action?.transactions.execute;
  const challenged = !!(action?.transactions.challenge ?? thisCatch?.challengeTx);
  const settled = action?.status === 'ResolvedSlash';

  return (
    <div className="rounded-lg border border-rule bg-surface">
      <div className="border-b border-rule p-6">
        <Label>Autonomous demo</Label>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-bone">
          Watch an approver and a watchdog transact
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          The approver agent (model-driven) approves a duplicate. The watchdog
          (deterministic) detects and challenges it. The contract settles.
          Two on-chain accounts, both signing real transactions.
        </p>
      </div>

      <div className="p-6">
        <Diagram
          name="agent-economy"
          alt="The approver agent approves and pays a duplicate. The deterministic watchdog detects it, challenges, and the contract slashes the bond, paying the watchdog."
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          {watchdog && (
            <div>
              <Label>Watchdog earned to date</Label>
              <p className="mt-1 font-mono text-2xl text-accent tabular">
                <Money atomic={watchdog.totalRewardEarned} />
              </p>
            </div>
          )}
          {phase === 'idle' && (
            <button
              type="button"
              onClick={refreshProof}
              className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
            >
              Refresh latest proof
            </button>
          )}
        </div>

        {phase === 'idle' && initialProof && (
          <LatestWatchdogProof proof={initialProof} />
        )}

        {phase === 'idle' && !initialProof && latestCatch && (
          <LatestWatchdogCatch latestCatch={latestCatch} />
        )}

        {phase === 'idle' && !initialProof && !latestCatch && (
          <div className="mt-5 rounded-md border border-rule bg-ink p-4">
            <p className="text-sm text-bone">No recent autonomous slash is loaded yet.</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              The watchdog service runs in the background. Refresh this proof,
              or use the advanced control below to submit a fresh on-chain case.
            </p>
          </div>
        )}

        {phase === 'idle' && (
          <details className="mt-5 rounded-md border border-rule bg-ink px-4 py-3">
            <summary className="cursor-pointer text-sm text-muted">
              Advanced: Run fresh autonomous case
            </summary>
            <button
              type="button"
              onClick={run}
              className="mt-4 rounded-md border border-accent/40 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
            >
              Run fresh autonomous case
            </button>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              This starts a new arm, challenge, and resolve sequence on Casper
              testnet. It is real, useful for operators, and can take several
              minutes when finality is slow.
            </p>
          </details>
        )}

        {phase === 'running' && (
          <p className="mt-4 text-xs text-muted">
            Fresh autonomous job {job ? `#${job.id.slice(0, 8)} · ${job.status.replaceAll('_', ' ')}` : 'queued'}. The approver setup runs in the background; the watchdog then catches the duplicate on its next scan.
          </p>
        )}

        {phase !== 'idle' && (
          <ol className="mt-6 space-y-3">
            <Step
              done={executed}
              active={phase === 'running' && !executed}
              actor="Approver (model-driven)"
              text="Approves and pays a duplicate invoice."
              hash={action?.transactions.execute}
              reduce={!!reduce}
            />
            <Step
              done={challenged}
              active={phase === 'running' && executed && !challenged}
              actor="Watchdog (deterministic)"
              text="Detects the duplicate and challenges it, unprompted."
              hash={action?.transactions.challenge ?? thisCatch?.challengeTx ?? undefined}
              reduce={!!reduce}
            />
            <Step
              done={settled}
              active={phase === 'running' && challenged && !settled}
              actor="Contract"
              text="Slashes the bond and pays the watchdog."
              hash={action?.transactions.resolve ?? thisCatch?.resolveTx ?? undefined}
              reduce={!!reduce}
            />
          </ol>
        )}

        {phase === 'done' && action && (
          <div className="mt-5 rounded-md border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm text-bone">
              The watchdog caught {serial(action.actionId)} on its own
              {thisCatch ? (
                <>
                  {' '}
                  and earned <Money atomic={thisCatch.reward} />.
                </>
              ) : (
                '.'
              )}
            </p>
            {thisCatch?.reasoning && (
              <blockquote className="mt-2 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-muted">
                “{thisCatch.reasoning}”
              </blockquote>
            )}
          </div>
        )}

        {phase === 'timeout' && action && (
          <div className="mt-5 rounded-md border border-rule bg-surface p-4">
            <p className="text-sm text-bone">
              The fresh autonomous run is still pending on Casper testnet. This
              is recoverable: the submitted transaction is linked below, and the
              watchdog summary will show the slash once finality catches up.
            </p>
            {(action.transactions.challenge ?? action.transactions.resolve) && (
              <a
                href={txExplorer(action.transactions.challenge ?? action.transactions.resolve ?? '')}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
              >
                View on the explorer
              </a>
            )}
            <button
              type="button"
              onClick={refreshProof}
              className="mt-3 block rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
            >
              Check watchdog proof again
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="mt-5 space-y-3">
            <p className="rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm text-bone">{error}</p>
            <button
              type="button"
              onClick={run}
              className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LatestWatchdogProof({ proof }: { proof: SlashProof }) {
  return (
    <div className="mt-5 rounded-md border border-accent/30 bg-accent/5 p-4">
      <p className="text-sm font-medium text-bone">Latest autonomous slash: {serial(proof.actionId)}</p>
      <p className="mt-1 text-sm text-muted">Approver approved a duplicate, the watchdog challenged it, and the contract slashed the bond on Casper Testnet.</p>
      <div className="mt-3 space-y-2 border-t border-accent/20 pt-3">
        {proof.challengeTx && <TxLine label="Challenge" hash={proof.challengeTx} />}
        {proof.resolveTx && <TxLine label="Resolve" hash={proof.resolveTx} />}
      </div>
    </div>
  );
}

function LatestWatchdogCatch({
  latestCatch,
}: {
  latestCatch: WatchdogCatch;
}) {
  return (
    <div className="mt-5 rounded-md border border-accent/30 bg-accent/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-bone">
            Latest autonomous slash: {serial(latestCatch.actionId)}
          </p>
          <p className="mt-1 text-sm text-muted">
            The watchdog challenged a duplicate claim and earned{' '}
            <Money atomic={latestCatch.reward} />.
          </p>
        </div>
        <a
          href={`/app/actions/${latestCatch.actionId}`}
          className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
        >
          View action
        </a>
      </div>
      {latestCatch.reasoning && (
        <blockquote className="mt-3 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-muted">
          “{latestCatch.reasoning}”
        </blockquote>
      )}
      <div className="mt-3 space-y-2 border-t border-rule pt-3">
        {latestCatch.challengeTx && (
          <TxLine label="Challenge" hash={latestCatch.challengeTx} />
        )}
        {latestCatch.resolveTx && (
          <TxLine label="Resolve" hash={latestCatch.resolveTx} />
        )}
      </div>
    </div>
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

function Step({
  done,
  active,
  actor,
  text,
  hash,
  reduce,
}: {
  done: boolean;
  active: boolean;
  actor: string;
  text: string;
  hash?: string;
  reduce: boolean;
}) {
  return (
    <motion.li
      className="flex items-start gap-3 rounded-md border border-rule bg-ink p-3"
      animate={
        active && !reduce
          ? { borderColor: ['#232A27', '#35C281', '#232A27'], transition: { repeat: Infinity, duration: 1.6 } }
          : {}
      }
    >
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
          done ? 'border-accent bg-accent/20 text-accent' : 'border-rule text-muted'
        }`}
        aria-hidden="true"
      >
        {done ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : active ? (
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-bone">
          <span className="font-medium">{actor}.</span> {text}
        </p>
        {hash && (
          <div className="mt-1">
            <CopyHash value={hash} href={txExplorer(hash)} label={`tx ${truncateHash(hash)}`} />
          </div>
        )}
      </div>
    </motion.li>
  );
}
