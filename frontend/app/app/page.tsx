import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Stat } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import ActionRow from '@/components/app/ActionRow';
import Money from '@/components/ui/Money';
import type { ActionSummary } from '@/lib/types';

export const metadata: Metadata = { title: 'Overview' };

function sum(values: string[]): bigint {
  return values.reduce((acc, v) => acc + BigInt(v || '0'), 0n);
}

export default async function OverviewPage() {
  const [actionsRes, reserveRes] = await Promise.all([
    safeGet(() => api.actions()),
    safeGet(() => api.reserve()),
  ]);

  if (!actionsRes.reachable || !reserveRes.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Overview" />
        <BackendDown />
      </div>
    );
  }

  const actions = actionsRes.data;
  const reserve = reserveRes.data;

  const open = actions.filter(
    (a) => a.status === 'Executed' || a.status === 'Bonded' || a.status === 'Challenged',
  );
  const slashedActions = actions.filter((a) => a.status === 'ResolvedSlash');

  // Total currently held in bonds, total returned to the reserve by slashing.
  const heldBonds = sum(open.map((a) => a.bondPosted));
  const slashedBonds = sum(slashedActions.map((a) => a.bondPosted));

  const recent = [...actions].sort((a, b) => b.actionId - a.actionId).slice(0, 6);

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Overview"
        intro="Live state from Casper testnet. Every figure here is read from the chain through the projection, not stored in the app."
      />

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Held in bonds" tone="copper">
          <Money atomic={heldBonds.toString()} bare />
        </Stat>
        <Stat label="Slashed to date" tone="void">
          <Money atomic={slashedBonds.toString()} bare />
        </Stat>
        <Stat label="Reserve balance" tone="sage">
          <Money atomic={reserve.balance} bare />
        </Stat>
        <Stat label="Open actions">{open.length}</Stat>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <RecentActivity recent={recent} />
        <OpenActions open={open} />
      </div>
    </div>
  );
}

function RecentActivity({ recent }: { recent: ActionSummary[] }) {
  return (
    <section aria-label="Recent activity">
      <h2 className="serial mb-3 text-[0.68rem] text-muted">Recent activity</h2>
      {recent.length === 0 ? (
        <EmptyState title="No actions yet" body="Once the agent acts on an invoice, it shows up here." />
      ) : (
        <div className="space-y-2">
          {recent.map((a) => (
            <ActionRow key={a.actionId} action={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function OpenActions({ open }: { open: ActionSummary[] }) {
  return (
    <section aria-label="Open actions">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="serial text-[0.68rem] text-muted">Open to challenge</h2>
        <Link href="/app/arena" className="text-xs text-copper hover:underline">
          Go to Challenge Arena
        </Link>
      </div>
      {open.length === 0 ? (
        <EmptyState
          title="Nothing open right now"
          body="Every action has resolved. Bonds in flight will appear here while their challenge window is open."
        />
      ) : (
        <div className="space-y-2">
          {open.map((a) => (
            <ActionRow key={a.actionId} action={a} />
          ))}
        </div>
      )}
    </section>
  );
}
