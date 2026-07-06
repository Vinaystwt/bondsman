'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi } from '@/lib/api';
import type { ActionDetail, ActionSummary, Watchdog } from '@/lib/types';
import { BackendDown, SkeletonPanel } from '@/components/ui/States';
import { Label } from '@/components/ui/Primitives';
import ManualChallenge from './ManualChallenge';
import WatchdogEconomy from './WatchdogEconomy';

function challengeable(a: ActionSummary) {
  return a.status === 'Executed' || a.status === 'Bonded' || a.status === 'Challenged';
}

export default function ArenaClient({ heading }: { heading?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'down'>('loading');
  const [armed, setArmed] = useState<ActionDetail | null>(null);
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

  const load = useCallback(async () => {
    try {
      const actions = await clientApi.actions();
      setStatus('ready');
      // Prefer an already reserved, still open action; otherwise arm a fresh one.
      const reserved = actions.find((a) => a.reservedForManual && challengeable(a));
      try {
        const detail = reserved
          ? await clientApi.action(reserved.actionId)
          : await clientApi.arm();
        setArmed(detail);
      } catch {
        setArmError('Could not arm a challengeable payout. The backend may be busy.');
      }
      refresh();
    } catch {
      setStatus('down');
    }
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
            wrong, anyone can challenge it and the contract takes the bond. Do it
            yourself in one click, or watch two agents settle it without a human.
          </p>
        </header>
      )}

      {/* Manual path */}
      <section aria-label="Challenge a payout" className="max-w-3xl">
        <div className="mb-4">
          <Label>Challenge it yourself</Label>
          <p className="mt-1 text-sm text-muted">
            No wallet, no account, no setup. One click slashes a real bond on Casper testnet.
          </p>
        </div>
        {status === 'loading' && <SkeletonPanel rows={3} />}
        {status === 'ready' && armed && (
          <ManualChallenge initial={armed} onResolved={refresh} />
        )}
        {status === 'ready' && !armed && armError && (
          <div className="rounded-md border border-slash/30 bg-slash/5 px-5 py-4 text-sm text-bone">
            {armError}
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
