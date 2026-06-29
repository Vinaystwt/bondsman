'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';
import type { ActionDetail, ActionSummary } from '@/lib/types';
import { formatMoney, parseEventData, truncateHash, serial } from '@/lib/format';
import { SkeletonPanel, BackendDown, EmptyState } from '@/components/ui/States';
import { Label, Panel } from '@/components/ui/Primitives';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import StatusBadge from '@/components/ui/StatusBadge';
import ChallengeRunner from './ChallengeRunner';

function isChallengeable(a: ActionSummary) {
  return a.status === 'Executed' || a.status === 'Bonded' || a.status === 'Challenged';
}

export default function ArenaClient({ heading }: { heading?: boolean }) {
  const [actions, setActions] = useState<ActionSummary[] | null>(null);
  const [reachable, setReachable] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await clientApi.actions();
      setActions(data);
      setReachable(true);
      const open = data.find(isChallengeable);
      setSelected((prev) => prev ?? open?.actionId ?? null);
    } catch {
      setReachable(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!reachable) return <BackendDown />;
  if (!actions) return <SkeletonPanel rows={3} />;

  const challengeable = actions.filter(isChallengeable);
  const slashed = actions
    .filter((a) => a.status === 'ResolvedSlash')
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  return (
    <div className="space-y-8">
      {heading && (
        <header>
          <Label>Challenge Arena</Label>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Catch a wrong payout
          </h1>
          <p className="mt-3 max-w-prose leading-relaxed text-muted">
            Every action below was bonded before it could move money. When an
            action is wrong, anyone can challenge it. The contract checks the
            claim, and if it holds, the bond is slashed: half to you, half to the
            reserve. Pick a payout and press challenge.
          </p>
        </header>
      )}

      {challengeable.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section aria-label="Challengeable payouts">
            <Label>Open payouts</Label>
            <ul className="mt-3 space-y-2">
              {challengeable.map((a) => (
                <li key={a.actionId}>
                  <button
                    type="button"
                    onClick={() => setSelected(a.actionId)}
                    className={`flex w-full items-center justify-between gap-4 rounded-md border px-4 py-3 text-left transition-colors ${
                      selected === a.actionId
                        ? 'border-copper bg-copper/10'
                        : 'border-rule bg-surface hover:border-copper/40'
                    }`}
                  >
                    <span>
                      <span className="serial text-[0.62rem] text-muted">{serial(a.actionId)}</span>
                      <span className="mt-0.5 block text-sm text-bone">
                        <Money atomic={a.amount} />
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div>
            {selected !== null && (
              <ChallengeRunner
                key={selected}
                actionId={selected}
                allActions={actions}
                onResolved={load}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <EmptyState
            title="No open payout to challenge right now"
            body="Every action has already resolved. A fresh challenge needs an executed action inside its window. Seed one from the repository root, then reload."
            action={
              <span className="inline-flex items-center gap-2 rounded border border-rule bg-ink px-4 py-2 font-mono text-sm text-copper">
                <span className="text-muted">$</span> npm run seed
              </span>
            }
          />
          {slashed.length > 0 && <SlashEvidence actionId={slashed[0].actionId} />}
        </div>
      )}
    </div>
  );
}

/** Shows a challenge that already resolved, with its real on-chain evidence. */
function SlashEvidence({ actionId }: { actionId: number }) {
  const [detail, setDetail] = useState<ActionDetail | null>(null);
  useEffect(() => {
    clientApi.action(actionId).then(setDetail).catch(() => undefined);
  }, [actionId]);

  if (!detail) return <SkeletonPanel rows={2} />;

  const slash = detail.events.find((e) => e.eventType === 'BondSlashed');
  const data = slash ? parseEventData(slash.data) : {};
  const challengerAmount = typeof data.challenger_amount === 'string' ? data.challenger_amount : null;
  const reserveAmount =
    typeof data.pool_amount === 'string'
      ? data.pool_amount
      : typeof data.reserve_amount === 'string'
        ? data.reserve_amount
        : null;

  return (
    <Panel className="p-6">
      <Label>A challenge that already resolved</Label>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {serial(detail.actionId)} reused a claim that had already been paid. The
        contract found the duplicate and slashed the bond. This is the real
        outcome recorded on testnet.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {challengerAmount && (
          <div className="rounded-md border border-rule bg-ink px-4 py-3">
            <Label>To the challenger</Label>
            <p className="mt-1 text-lg text-bone">
              <Money atomic={challengerAmount} />
            </p>
          </div>
        )}
        {reserveAmount && (
          <div className="rounded-md border border-rule bg-ink px-4 py-3">
            <Label>To the reserve</Label>
            <p className="mt-1 text-lg text-bone">
              <Money atomic={reserveAmount} />
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 space-y-2 border-t border-rule pt-4">
        {detail.transactions.challenge && detail.explorerLinks.challenge && (
          <Row label="Challenge transaction" hash={detail.transactions.challenge} href={detail.explorerLinks.challenge} />
        )}
        {detail.transactions.resolve && detail.explorerLinks.resolve && (
          <Row label="Resolve transaction" hash={detail.transactions.resolve} href={detail.explorerLinks.resolve} />
        )}
      </div>
      <Link
        href={`/app/actions/${detail.actionId}`}
        className="mt-5 inline-block text-sm text-copper underline decoration-rule underline-offset-4 hover:decoration-copper"
      >
        See the full action
      </Link>
    </Panel>
  );
}

function Row({ label, hash, href }: { label: string; hash: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <CopyHash value={hash} href={href} label={truncateHash(hash)} />
    </div>
  );
}

export { formatMoney };
