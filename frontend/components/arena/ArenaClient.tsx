'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi, ApiError, BackendUnreachable } from '@/lib/api';
import type { ActionDetail, DemoJob, DemoProofs, SlashProof, Watchdog } from '@/lib/types';
import { BackendDown, SkeletonPanel } from '@/components/ui/States';
import { Label } from '@/components/ui/Primitives';
import { serial, truncateHash, txExplorer } from '@/lib/format';
import CopyHash from '@/components/ui/CopyHash';
import Money from '@/components/ui/Money';
import ManualChallenge from './ManualChallenge';
import WatchdogEconomy from './WatchdogEconomy';

export default function ArenaClient({ heading }: { heading?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'down'>('loading');
  const [armed, setArmed] = useState<ActionDetail | null>(null);
  const [arming, setArming] = useState(false);
  const [armJob, setArmJob] = useState<DemoJob | null>(null);
  const [armError, setArmError] = useState('');
  const [watchdog, setWatchdog] = useState<Watchdog | null>(null);
  const [proofs, setProofs] = useState<DemoProofs | null>(null);

  const refresh = useCallback(async () => {
    try {
      const wd = await clientApi.watchdog();
      setWatchdog(wd);
    } catch {
      /* watchdog optional */
    }
  }, []);

  const arm = useCallback(async () => {
    setArming(true);
    setArmError('');
    try {
      const job = await clientApi.armAsync();
      setArmJob(job);
      const poll = async () => {
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const fresh = await clientApi.job(job.id);
          setArmJob(fresh);
          if (fresh.actionId !== null && fresh.status === 'action_ready') {
            setArmed(await clientApi.action(fresh.actionId));
            setArming(false);
            return;
          }
          if (fresh.status === 'failed') throw new Error(fresh.error ?? 'Fresh case job failed.');
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
        setArming(false);
      };
      void poll().catch((err) => {
        setArmError(err instanceof Error ? err.message : 'Fresh case job could not continue.');
        setArming(false);
      });
    } catch (err) {
      setArmError(err instanceof ApiError ? err.message : 'Could not start a fresh case job.');
      setArming(false);
    }
  }, []);

  const load = useCallback(async () => {
    // Preflight health check. Only "down" if health itself fails.
    try {
      await clientApi.health();
    } catch (err) {
      if (err instanceof BackendUnreachable) {
        setStatus('down');
        return;
      }
    }
    setStatus('ready');

    // Load the ready case and persisted proofs in parallel. Any listing error becomes a soft arm error,
    // not a full page-down.
    try {
      const [ready, latestProofs] = await Promise.all([
        clientApi.demoReady(),
        clientApi.demoProofs().catch(() => null),
      ]);
      if (latestProofs) setProofs(latestProofs);
      if (ready.success) {
        if (ready.best.safeToChallengeNow) {
          setArmed(ready.best);
          refresh();
          return;
        }
        setArmError('A case was found, but it is not safe to challenge now. Run npm run demo:prearm before a demo.');
      } else {
        setArmError(ready.message);
      }
    } catch (err) {
      if (err instanceof ApiError) setArmError(err.message);
      else setArmError('No ready challengeable payout is loaded yet.');
    }
    refresh();
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'down') return <BackendDown />;

  return (
    <div className="space-y-12">
      {heading && (
        <header className="max-w-3xl">
          <Label>Challenge Arena</Label>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
            Catch a wrong payout
          </h1>
          <p className="mt-4 leading-relaxed text-muted">
            Every action below was bonded before it could move money. When one is
            wrong, a challenge proves it and the contract takes the bond. Connect
            your wallet to sign the challenge and earn the reward, or use the demo
            key to see it happen.
          </p>
        </header>
      )}

      <section aria-label="Casper testnet proof" className="max-w-3xl">
        <div className="mb-4">
          <Label>Already proven on Casper Testnet</Label>
          <p className="mt-1 text-sm text-muted">
            Completed slashes remain visible while any fresh testnet transaction waits for finality.
          </p>
        </div>
        {status === 'loading' && <SkeletonPanel rows={3} />}
        {status === 'ready' && proofs && (
          <div className="grid gap-4 sm:grid-cols-2">
            <ProofCard label="Backend demo slash" proof={proofs.latestManualSlash} />
            <ProofCard label="Autonomous watchdog slash" proof={proofs.latestWatchdogSlash} />
          </div>
        )}
        {status === 'ready' && !proofs && (
          <p className="rounded-md border border-rule bg-surface px-5 py-4 text-sm text-muted">
            Loading the latest persisted on-chain proof. The ready challenge case below remains available.
          </p>
        )}
      </section>

      {/* Challenge path */}
      <section aria-label="Challenge a payout" className="max-w-3xl">
        <div className="mb-4">
          <Label>Challenge a Payout</Label>
          <p className="mt-1 text-sm text-muted">
            Recommended judge path: the funded demo key starts a recoverable background job. The current completed proof above stays visible while Casper reaches finality.
          </p>
        </div>
        {status === 'loading' && <SkeletonPanel rows={3} />}
        {status === 'ready' && armed && (
          <ManualChallenge initial={armed} onResolved={refresh} />
        )}
        {status === 'ready' && !armed && !arming && (
          <div className="rounded-md border border-rule bg-surface px-5 py-6">
            <p className="text-sm font-medium text-bone">Case pool warming</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {armError || 'No prepared challenge case is open right now.'}
              {' '}The backend keeps a small pool of already-executed duplicate
              claims ready for the Arena, so a public demo does not depend on
              waiting through a fresh multi-transaction setup flow.
            </p>
            <button
              type="button"
              onClick={load}
              className="mt-4 rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
            >
              Refresh ready cases
            </button>
            <details className="mt-5 rounded-md border border-rule bg-ink px-4 py-3">
              <summary className="cursor-pointer text-sm text-muted">
                Advanced / Admin demo setup
              </summary>
              <button
                type="button"
                onClick={arm}
                className="mt-4 rounded-md border border-accent/40 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
              >
                Admin: Prepare Fresh Case
              </button>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                This submits real Casper testnet transactions and can take
                around two minutes. It is intended for operators, not the
                primary judge path.
              </p>
            </details>
          </div>
        )}
        {status === 'ready' && arming && (
          <div className="rounded-md border border-rule bg-surface px-5 py-6">
            <p className="text-sm text-accent">
              Fresh case job {armJob ? `#${armJob.id.slice(0, 8)}` : ''} is {armJob?.status ?? 'queued'}.
            </p>
            <p className="mt-2 text-xs text-muted">
              The approver agent submits invoice, action, allowance, bond, and execution transactions in the background. You can stay on this page; the ready proof above is unaffected.
            </p>
          </div>
        )}
      </section>

      {/* Autonomous path */}
      <section aria-label="The two-agent economy" className="max-w-3xl">
        <WatchdogEconomy initialWatchdog={watchdog} initialProof={proofs?.latestWatchdogSlash ?? null} onResolved={refresh} />
      </section>
    </div>
  );
}

function ProofCard({ label, proof }: { label: string; proof: SlashProof | null }) {
  if (!proof) {
    return <div className="rounded-lg border border-rule bg-surface p-5 text-sm text-muted">No completed proof is projected yet.</div>;
  }
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
      <Label>{label}</Label>
      <p className="mt-2 text-lg font-medium text-bone">Bond slashed · {serial(proof.actionId)}</p>
      <p className="mt-1 text-sm text-muted">Duplicate payout <Money atomic={proof.amount} /> · bond <Money atomic={proof.bond} /></p>
      <div className="mt-4 space-y-2 border-t border-accent/20 pt-3 text-sm">
        {proof.challengeTx && <ProofTx label="Challenge" hash={proof.challengeTx} />}
        {proof.resolveTx && <ProofTx label="Resolve" hash={proof.resolveTx} />}
      </div>
    </div>
  );
}

function ProofTx({ label, hash }: { label: string; hash: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted">{label}</span><CopyHash value={hash} href={txExplorer(hash)} label={truncateHash(hash)} /></div>;
}
