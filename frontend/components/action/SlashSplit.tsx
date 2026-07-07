import { parseEventData } from '@/lib/format';
import type { ActionDetail } from '@/lib/types';
import Money from '@/components/ui/Money';
import { Label } from '@/components/ui/Primitives';

function asAmount(v: unknown): string | null {
  return typeof v === 'string' && /^\d+$/.test(v) ? v : null;
}

function halve(atomic: string): string {
  try {
    return (BigInt(atomic) / 2n).toString();
  } catch {
    return '0';
  }
}

export default function SlashSplit({ action }: { action: ActionDetail }) {
  const slash = action.events.find((e) => e.eventType === 'BondSlashed');
  const data = slash ? parseEventData(slash.data) : {};
  const realChallenger = asAmount(data.challenger_amount);
  const realReserve = asAmount(data.pool_amount) ?? asAmount(data.reserve_amount);

  const resolved = action.status === 'ResolvedSlash';
  const estimatedChallenger = resolved ? null : halve(action.bondPosted);
  const estimatedReserve = resolved ? null : halve(action.bondPosted);

  const challengerAmount = realChallenger ?? estimatedChallenger;
  const reserveAmount = realReserve ?? estimatedReserve;

  const heading = resolved
    ? 'Slash split, settled on chain'
    : 'If slashed, the bond splits';

  return (
    <section
      aria-label="Slash split"
      className="rounded-md border border-rule bg-surface p-6"
    >
      <div className="flex items-baseline justify-between">
        <Label>{heading}</Label>
        {!resolved && (
          <span className="text-[0.6rem] text-muted">Estimated 50 / 50</span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-rule bg-ink px-4 py-3">
          <Label>To the challenger</Label>
          <p className={`mt-1 font-mono text-xl tabular ${resolved ? 'text-slash' : 'text-accent'}`}>
            {challengerAmount ? <Money atomic={challengerAmount} bare /> : '—'}
          </p>
          <p className="mt-1 text-[0.62rem] text-muted">csprUSD</p>
        </div>
        <div className="rounded-md border border-rule bg-ink px-4 py-3">
          <Label>To the reserve</Label>
          <p className={`mt-1 font-mono text-xl tabular ${resolved ? 'text-slash' : 'text-accent'}`}>
            {reserveAmount ? <Money atomic={reserveAmount} bare /> : '—'}
          </p>
          <p className="mt-1 text-[0.62rem] text-muted">csprUSD</p>
        </div>
      </div>
      {!resolved && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          The bond splits fifty to the challenger and fifty to the reserve.
          Challenger reward goes to whoever signs the challenge.
        </p>
      )}
      {resolved && !realChallenger && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Split amounts are not indexed for this action version. Bond posted:
          <span className="ml-1 font-mono text-bone">
            <Money atomic={action.bondPosted} />
          </span>
        </p>
      )}
    </section>
  );
}
