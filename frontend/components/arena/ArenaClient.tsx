'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi, ApiError, BackendUnreachable } from '@/lib/api';
import type { ActionDetail, Watchdog } from '@/lib/types';
import { BackendDown, SkeletonPanel } from '@/components/ui/States';
import { Label } from '@/components/ui/Primitives';
import ManualChallenge from './ManualChallenge';
import WatchdogEconomy from './WatchdogEconomy';

export default function ArenaClient({ heading }: { heading?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'down'>('loading');
  const [armed, setArmed] = useState<ActionDetail | null>(null);
  const [arming, setArming] = useState(false);
  const [armError, setArmError] = useState('');
  const [watchdog, setWatchdog] = useState<Watchdog | null>(null);

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
      const detail = await clientApi.arm();
      setArmed(detail);
    } catch (err) {
      if (err instanceof ApiError) {
        setArmError(err.message);
      } else if (err instanceof BackendUnreachable) {
        setArmError(
          'The fresh case request is still submitting real Casper testnet transactions. Refresh in a moment or run npm run demo:prearm before a demo.',
        );
      } else {
        setArmError('Could not prepare a challengeable payout.');
      }
    } finally {
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

    // Load a ready, pre-armed case. Any listing error becomes a soft arm error,
    // not a full page-down.
    try {
      const ready = await clientApi.demoReady();
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

      {/* Challenge path */}
      <section aria-label="Challenge a payout" className="max-w-3xl">
        <div className="mb-4">
          <Label>Challenge a Payout</Label>
          <p className="mt-1 text-sm text-muted">
            Use the funded demo key for a reliable challenge-to-slash flow.
            Wallet-signed challenges remain available as an experimental testnet path.
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
              Preparing a fresh payout on Casper testnet. This can take around two minutes.
            </p>
            <p className="mt-2 text-xs text-muted">
              The approver agent submits invoice, action, allowance, bond, and
              execution transactions before the case is ready to challenge.
            </p>
          </div>
        )}
      </section>

      {/* Autonomous path */}
      <section aria-label="The two-agent economy" className="max-w-3xl">
        <WatchdogEconomy initialWatchdog={watchdog} onResolved={refresh} />
      </section>
    </div>
  );
}
