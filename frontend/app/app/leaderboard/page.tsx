import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { Label, Panel } from '@/components/ui/Primitives';
import { BackendDown, EmptyState } from '@/components/ui/States';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { truncateHash, accountExplorer } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Challenger leaderboard',
  description:
    'Everyone who has caught a duplicate on Bondsman testnet, ranked by rewards earned.',
};

function halve(atomic: string): bigint {
  try {
    return BigInt(atomic) / 2n;
  } catch {
    return 0n;
  }
}

export default async function LeaderboardPage() {
  const res = await safeGet(() => api.actions());
  if (!res.reachable) {
    return <BackendDown />;
  }

  const actions = res.data;
  const map = new Map<
    string,
    { challenger: string; type: string | null; successes: number; reward: bigint }
  >();
  for (const a of actions) {
    if (a.status !== 'ResolvedSlash' || !a.challenger) continue;
    const rec = map.get(a.challenger) ?? {
      challenger: a.challenger,
      type: a.challengerType ?? null,
      successes: 0,
      reward: 0n,
    };
    rec.successes += 1;
    rec.reward += halve(a.bondPosted);
    map.set(a.challenger, rec);
  }
  const ranked = [...map.values()].sort((a, b) => {
    if (a.reward === b.reward) return b.successes - a.successes;
    return a.reward < b.reward ? 1 : -1;
  });

  return (
    <div className="space-y-12">
      <header className="max-w-3xl space-y-4">
        <Label>Leaderboard</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Every duplicate caught, ranked
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Public activity, derived from on-chain slashes. Rewards are computed
          from posted bonds using the 50 / 50 split. The contract tracks agent
          reputation; this page ranks challenger activity from the projection.
        </p>
      </header>

      {ranked.length === 0 ? (
        <EmptyState
          title="No slashes yet"
          body="Once someone catches a duplicate on chain, they show up here."
        />
      ) : (
        <ol className="space-y-2">
          {ranked.map((r, i) => (
            <li key={r.challenger}>
              <Panel className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-4 px-4 py-3">
                <span className="serial w-6 text-[0.62rem] text-muted">
                  #{i + 1}
                </span>
                <CopyHash
                  value={r.challenger}
                  href={accountExplorer(r.challenger)}
                  label={truncateHash(r.challenger)}
                />
                <span className="text-xs text-muted">{typeLabel(r.type)}</span>
                <span className="text-right font-mono text-sm text-bone tabular">
                  {r.successes}{' '}
                  <span className="text-xs text-muted">slashes</span>
                </span>
                <span className="text-right font-mono text-sm text-accent tabular">
                  <Money atomic={r.reward.toString()} bare /> csprUSD
                </span>
              </Panel>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function typeLabel(type: string | null): string {
  if (type === 'watchdog') return 'watchdog';
  if (type === 'manual') return 'backend key';
  if (type === 'external-wallet') return 'wallet';
  return '';
}
