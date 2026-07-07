'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi, ApiError, BackendUnreachable } from '@/lib/api';
import type { ActionDetail, ActionSummary, Watchdog } from '@/lib/types';
import { BackendDown, SkeletonPanel } from '@/components/ui/States';
import { Label } from '@/components/ui/Primitives';
import ManualChallenge from './ManualChallenge';
import WatchdogEconomy from './WatchdogEconomy';

function isChallengeable(a: ActionSummary): boolean {
  return (
    a.status === 'Executed' &&
    a.windowEnd > Date.now() &&
    !a.challenger
  );
}

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
          'The arm request timed out. The Casper testnet may be slow. Try again in a moment.',
        );
      } else {
        setArmError('Could not arm a challengeable payout.');
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

    // Load actions. Any listing error becomes a soft arm error, not a full page-down.
    try {
      const actions = await clientApi.actions();
      const reserved = actions.find((a) => a.reservedForManual && isChallengeable(a));
      if (reserved) {
        try {
          const detail = await clientApi.action(reserved.actionId);
          setArmed(detail);
          refresh();
          return;
        } catch { /* fall through to arm */ }
      }
    } catch (err) {
      if (err instanceof ApiError) setArmError(err.message);
    }

    await arm();
    refresh();
  }, [refresh, arm]);

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
            {armError ? (
              <>
                <p className="text-sm text-bone">{armError}</p>
                <button
                  type="button"
                  onClick={arm}
                  className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
                >
                  Arm a fresh payout
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">No challengeable payout ready.</p>
                <button
                  type="button"
                  onClick={arm}
                  className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
                >
                  Arm a fresh payout
                </button>
              </>
            )}
          </div>
        )}
        {status === 'ready' && arming && (
          <div className="rounded-md border border-rule bg-surface px-5 py-6">
            <p className="text-sm text-accent">
              Arming a fresh payout on Casper testnet. This can take 30 to 60 seconds.
            </p>
            <p className="mt-2 text-xs text-muted">
              The approver agent has to sign a bond and execute a payout before
              this action is ready to challenge.
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
