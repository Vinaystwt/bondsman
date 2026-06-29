import Link from 'next/link';
import type { ActionSummary } from '@/lib/types';
import { serial } from '@/lib/format';
import Money from '@/components/ui/Money';
import StatusBadge from '@/components/ui/StatusBadge';

/** A dense, clickable ledger row for an action. Used across the dashboard. */
export default function ActionRow({ action }: { action: ActionSummary }) {
  return (
    <Link
      href={`/app/actions/${action.actionId}`}
      className="group flex items-center justify-between gap-4 rounded-md border border-rule bg-surface px-4 py-3 transition-colors hover:border-copper/40"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="serial w-16 shrink-0 text-[0.62rem] text-muted">
          {serial(action.actionId)}
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-bone group-hover:text-copper">
            <Money atomic={action.amount} />
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Bond <Money atomic={action.bondPosted} bare /> csprUSD
          </span>
        </span>
      </div>
      <StatusBadge status={action.status} />
    </Link>
  );
}
