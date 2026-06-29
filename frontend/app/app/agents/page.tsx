import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Panel } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import Money from '@/components/ui/Money';
import { truncateHash } from '@/lib/format';

export const metadata: Metadata = { title: 'Agents' };

export default async function AgentsPage() {
  const res = await safeGet(() => api.actions());
  if (!res.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Agents" />
        <BackendDown />
      </div>
    );
  }
  const actions = res.data;

  // Collect each agent with its record, derived from real actions.
  const byAgent = new Map<
    string,
    { clean: number; slashed: number; volume: bigint }
  >();
  for (const a of actions) {
    const rec = byAgent.get(a.agent) ?? { clean: 0, slashed: 0, volume: 0n };
    if (a.status === 'ResolvedSlash') rec.slashed += 1;
    else if (a.status === 'ResolvedRefund') rec.clean += 1;
    rec.volume += BigInt(a.amount || '0');
    byAgent.set(a.agent, rec);
  }
  const agents = [...byAgent.entries()];

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Agents"
        intro="Every agent that has moved money through Bondsman, with the record the contract keeps on it."
      />

      {agents.length === 0 ? (
        <EmptyState title="No agents yet" body="Agents appear here once they act on an invoice." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map(([address, rec]) => (
            <Link
              key={address}
              href={`/app/agents/${encodeURIComponent(address)}`}
              className="group block"
            >
              <Panel className="p-6 transition-colors group-hover:border-copper/40">
                <p className="font-mono text-sm text-bone group-hover:text-copper">
                  {truncateHash(address)}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="serial text-[0.58rem] text-muted">Clean</dt>
                    <dd className="mt-1 font-mono text-lg text-sage tabular">{rec.clean}</dd>
                  </div>
                  <div>
                    <dt className="serial text-[0.58rem] text-muted">Slashed</dt>
                    <dd className="mt-1 font-mono text-lg text-void tabular">{rec.slashed}</dd>
                  </div>
                  <div>
                    <dt className="serial text-[0.58rem] text-muted">Moved</dt>
                    <dd className="mt-1 font-mono text-lg text-bone tabular">
                      <Money atomic={rec.volume.toString()} bare />
                    </dd>
                  </div>
                </dl>
                <span className="mt-4 inline-block text-xs text-copper opacity-0 transition-opacity group-hover:opacity-100">
                  View profile and reputation
                </span>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
