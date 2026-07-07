import { parseEventData } from '@/lib/format';
import type { Reserve } from '@/lib/types';
import { Label } from '@/components/ui/Primitives';
import Money from '@/components/ui/Money';

function amountFromSlash(data: string): bigint {
  const d = parseEventData(data);
  const v =
    (typeof d.reserve_amount === 'string' && d.reserve_amount) ||
    (typeof d.pool_amount === 'string' && d.pool_amount) ||
    '0';
  try { return BigInt(v); } catch { return 0n; }
}

export default function ReserveGrowth({ reserve }: { reserve: Reserve }) {
  const events = [...reserve.slashes].sort((a, b) => a.actionId - b.actionId);
  const cumulative: { actionId: number; running: bigint }[] = [];
  let run = 0n;
  for (const s of events) {
    run += amountFromSlash(s.data);
    cumulative.push({ actionId: s.actionId, running: run });
  }
  const max = cumulative.length ? cumulative[cumulative.length - 1].running : 0n;
  const maxNumber = Number(max) / 1e9;

  return (
    <div className="rounded-md border border-rule bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <Label>Reserve growth</Label>
        <span className="font-mono text-2xl text-accent tabular">
          <Money atomic={reserve.balance} />
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Every bar is one slash added to the reserve. The reserve only grows
        when a duplicate is caught on chain.
      </p>
      {cumulative.length === 0 ? (
        <p className="mt-5 text-sm text-muted">No slashes yet.</p>
      ) : (
        <ol
          className="mt-5 flex items-end gap-1"
          aria-label="Cumulative reserve balance by slash"
        >
          {cumulative.map((c) => {
            const pct = maxNumber > 0 ? (Number(c.running) / 1e9 / maxNumber) * 100 : 0;
            return (
              <li
                key={c.actionId}
                className="flex-1"
                title={`Action ${c.actionId}: ${(Number(c.running) / 1e9).toLocaleString()} csprUSD`}
              >
                <div
                  className="rounded-sm bg-accent/70"
                  style={{ height: `${Math.max(pct, 6)}%`, minHeight: 8 }}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
