'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { clientApi, ApiError } from '@/lib/api';
import type { ActionDetail, Watchdog, WatchdogCatch } from '@/lib/types';
import { serial, truncateHash, txExplorer } from '@/lib/format';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import Diagram from '@/components/Diagram';
import { Label } from '@/components/ui/Primitives';

type Phase = 'idle' | 'running' | 'done' | 'timeout' | 'error';

export default function WatchdogEconomy({
  initialWatchdog,
  onResolved,
}: {
  initialWatchdog: Watchdog | null;
  onResolved: () => void;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [action, setAction] = useState<ActionDetail | null>(null);
  const [watchdog, setWatchdog] = useState<Watchdog | null>(initialWatchdog);
  const [error, setError] = useState('');

  // Load the watchdog's live earnings independently of the parent's timing.
  useEffect(() => {
    clientApi.watchdog().then(setWatchdog).catch(() => undefined);
  }, []);

  async function run() {
    setPhase('running');
    setError('');
    try {
      const minted = await clientApi.watchdogDemo();
      setAction(minted);
      await poll(minted.actionId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The watchdog demo could not start.');
      setPhase('error');
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
              onClick={run}
              className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
            >
              Run the autonomous demo
            </button>
          )}
        </div>

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
              Still finalizing on chain. The transaction was submitted but has not resolved yet.
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
