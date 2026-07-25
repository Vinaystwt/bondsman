'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientApi, ApiError, BackendUnreachable } from '@/lib/api';
import type { ActionDetail, ActionSummary } from '@/lib/types';
import { serial, truncateHash } from '@/lib/format';
import { Label } from '@/components/ui/Primitives';

type Kind = 'bond' | 'slash' | 'refund' | 'execute';

interface Row {
  key: string;
  actionId: number;
  kind: Kind;
  headline: string;
  txHash: string | null;
  explorerLink: string | null;
  eventIndex: number;
}

const KIND_TONE: Record<Kind, string> = {
  bond: 'text-accent',
  slash: 'text-slash',
  refund: 'text-accent',
  execute: 'text-bone',
};

const KIND_LABEL: Record<Kind, string> = {
  bond: 'Bond posted',
  slash: 'Bond slashed',
  refund: 'Bond returned',
  execute: 'Payout executed',
};

export default function Ticker({ limit = 8 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'down' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const actions = await clientApi.actions();
        const recent = [...actions]
          .sort((a, b) => b.actionId - a.actionId)
          .slice(0, 10);
        const details = await Promise.allSettled(
          recent.map((a) => clientApi.action(a.actionId)),
        );
        const gathered: Row[] = [];
        for (let i = 0; i < details.length; i += 1) {
          const r = details[i];
          if (r.status !== 'fulfilled') continue;
          gathered.push(...eventRows(r.value, recent[i]));
        }
        gathered.sort((a, b) => b.actionId - a.actionId || b.eventIndex - a.eventIndex);
        if (!cancelled) {
          setRows(gathered.slice(0, limit));
          setState('ready');
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof BackendUnreachable) setState('down');
        else {
          setError(err instanceof ApiError ? err.message : 'Could not load activity.');
          setState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return (
    <div className="rounded-md border border-rule bg-surface">
      <div className="flex items-baseline justify-between border-b border-rule px-5 py-3">
        <Label>Live activity</Label>
        <Link href="/app/actions" className="text-xs text-accent hover:underline">
          Full Docket
        </Link>
      </div>
      <ul className="divide-y divide-rule">
        {state === 'loading' && (
          <li className="px-5 py-4 text-sm text-muted">Loading recent events...</li>
        )}
        {state === 'down' && (
          <li className="px-5 py-4 text-sm text-muted">Backend not reachable.</li>
        )}
        {state === 'error' && (
          <li className="px-5 py-4 text-sm text-slash">{error}</li>
        )}
        {state === 'ready' && rows.length === 0 && (
          <li className="px-5 py-4 text-sm text-muted">No on-chain activity yet.</li>
        )}
        {state === 'ready' && rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3">
            <Link
              href={`/app/actions/${r.actionId}`}
              className="serial text-[0.6rem] text-muted hover:text-accent"
            >
              {serial(r.actionId)}
            </Link>
            <p className={`truncate text-sm ${KIND_TONE[r.kind]}`}>{r.headline}</p>
            {r.txHash && r.explorerLink ? (
              <a
                href={r.explorerLink}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-muted hover:text-accent"
              >
                {truncateHash(r.txHash)}
              </a>
            ) : (
              <span className="text-xs text-muted">indexed</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function eventRows(detail: ActionDetail, summary: ActionSummary): Row[] {
  const out: Row[] = [];
  for (const e of detail.events) {
    let kind: Kind | null = null;
    let headline = '';
    if (e.eventType === 'BondPosted' || e.eventType === 'BondLocked') {
      kind = 'bond';
      headline = `${KIND_LABEL.bond} for ${money(summary.amount)}`;
    } else if (e.eventType === 'ActionExecuted') {
      kind = 'execute';
      headline = `${KIND_LABEL.execute}: ${money(summary.amount)}`;
    } else if (e.eventType === 'BondSlashed' || e.eventType === 'ResolvedSlash') {
      kind = 'slash';
      headline = `${KIND_LABEL.slash} on action ${summary.actionId}`;
    } else if (e.eventType === 'BondReleased' || e.eventType === 'ResolvedRefund') {
      kind = 'refund';
      headline = `${KIND_LABEL.refund} on action ${summary.actionId}`;
    }
    if (!kind) continue;
    out.push({
      key: `${summary.actionId}-${e.eventIndex}-${e.eventType}`,
      actionId: summary.actionId,
      kind,
      headline,
      txHash: e.transactionHash,
      explorerLink: e.explorerLink,
      eventIndex: e.eventIndex,
    });
  }
  return out;
}

function money(atomic: string): string {
  try {
    const n = BigInt(atomic) / 1_000_000_000n;
    return `${n.toLocaleString('en-US')} csprUSD`;
  } catch {
    return '';
  }
}
