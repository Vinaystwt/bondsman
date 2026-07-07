'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ActionSummary } from '@/lib/types';
import { serial, resolveDisplayStatus } from '@/lib/format';
import Money from '@/components/ui/Money';
import StatusBadge from '@/components/ui/StatusBadge';

type Filter = 'all' | 'challengeable' | 'challenged' | 'slashed' | 'refunded';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'challengeable', label: 'Challengeable' },
  { key: 'challenged', label: 'Challenged' },
  { key: 'slashed', label: 'Slashed' },
  { key: 'refunded', label: 'Refunded' },
];

function matches(a: ActionSummary, f: Filter, now: number): boolean {
  const display = resolveDisplayStatus(a.status, a.windowEnd, a.challenger);
  switch (f) {
    case 'all':
      return true;
    case 'challengeable':
      return display === 'Challengeable';
    case 'challenged':
      return a.status === 'Challenged';
    case 'slashed':
      return a.status === 'ResolvedSlash';
    case 'refunded':
      return a.status === 'ResolvedRefund';
    default:
      return true;
  }
}

export default function DocketList({ actions }: { actions: ActionSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const now = Date.now();
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: actions.length,
      challengeable: 0,
      challenged: 0,
      slashed: 0,
      refunded: 0,
    };
    for (const a of actions) {
      const d = resolveDisplayStatus(a.status, a.windowEnd, a.challenger);
      if (d === 'Challengeable') c.challengeable += 1;
      if (a.status === 'Challenged') c.challenged += 1;
      if (a.status === 'ResolvedSlash') c.slashed += 1;
      if (a.status === 'ResolvedRefund') c.refunded += 1;
    }
    return c;
  }, [actions]);

  const filtered = useMemo(
    () => [...actions]
      .filter((a) => matches(a, filter, now))
      .sort((a, b) => b.actionId - a.actionId),
    [actions, filter, now],
  );

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Filter actions by status"
        className="flex flex-wrap gap-2 border-b border-rule pb-4"
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-rule bg-surface text-muted hover:text-bone'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 font-mono ${active ? 'text-accent' : 'text-muted'}`}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-rule bg-surface px-5 py-8 text-center text-sm text-muted">
          No actions match this filter.
        </p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((a) => (
            <li key={a.actionId}>
              <DocketRow action={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocketRow({ action }: { action: ActionSummary }) {
  const display = resolveDisplayStatus(action.status, action.windowEnd, action.challenger);
  return (
    <Link
      href={`/app/actions/${action.actionId}`}
      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border border-rule bg-surface px-4 py-3 transition-colors hover:border-accent/40"
    >
      <span className="serial w-20 shrink-0 text-[0.62rem] text-muted">
        {serial(action.actionId)}
      </span>
      <div className="min-w-0">
        <span className="block text-sm text-bone group-hover:text-accent">
          <Money atomic={action.amount} />
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          Bond <Money atomic={action.bondPosted} bare /> csprUSD
          {action.challengerType && (
            <>
              {' • '}
              <span className="text-muted">
                {action.challengerType === 'watchdog' && 'Caught by watchdog'}
                {action.challengerType === 'manual' && 'Caught by backend key'}
                {action.challengerType === 'external-wallet' && 'Caught by wallet'}
              </span>
            </>
          )}
        </span>
      </div>
      <StatusBadge status={display} />
    </Link>
  );
}
