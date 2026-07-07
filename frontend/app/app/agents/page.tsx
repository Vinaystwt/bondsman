import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Panel } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import Money from '@/components/ui/Money';
import { truncateHash } from '@/lib/format';
import { resolveRole } from '@/lib/agent-roles';

export const metadata: Metadata = { title: 'Agents' };

export default async function AgentsPage() {
  const [actionsRes, deploymentsRes] = await Promise.all([
    safeGet(() => api.actions()),
    safeGet(() => api.deployments()),
  ]);
  if (!actionsRes.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Agents" />
        <BackendDown />
      </div>
    );
  }
  const actions = actionsRes.data;
  const deployments = deploymentsRes.reachable ? deploymentsRes.data : null;

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

  const known = deployments
    ? Object.entries(deployments.accounts)
        .filter(([k]) => k === 'agent' || k === 'watchdog')
        .map(([, entry]) => entry.publicKey)
    : [];

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Agents"
        intro="One approver and one watchdog transact on chain. The approver is model-driven and posts bonds. The watchdog is deterministic and catches duplicates. Both are real accounts, both sign real transactions."
      />

      {known.length > 0 && (
        <section aria-label="Known agents">
          <h2 className="serial mb-3 text-[0.68rem] text-muted">Core agents</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {known.map((address) => {
              const rec = byAgent.get(address) ?? { clean: 0, slashed: 0, volume: 0n };
              const role = resolveRole(address, deployments);
              return (
                <AgentCard
                  key={address}
                  address={address}
                  clean={rec.clean}
                  slashed={rec.slashed}
                  volume={rec.volume.toString()}
                  roleLabel={role.label}
                  roleDescription={role.description}
                />
              );
            })}
          </div>
        </section>
      )}

      {agents.filter(([a]) => !known.includes(a)).length > 0 && (
        <section aria-label="Other agents">
          <h2 className="serial mb-3 text-[0.68rem] text-muted">Other addresses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {agents
              .filter(([a]) => !known.includes(a))
              .map(([address, rec]) => {
                const role = resolveRole(address, deployments);
                return (
                  <AgentCard
                    key={address}
                    address={address}
                    clean={rec.clean}
                    slashed={rec.slashed}
                    volume={rec.volume.toString()}
                    roleLabel={role.label}
                    roleDescription={role.description}
                  />
                );
              })}
          </div>
        </section>
      )}

      {agents.length === 0 && (
        <EmptyState title="No agents yet" body="Agents appear here once they act on an invoice." />
      )}
    </div>
  );
}

function AgentCard({
  address,
  clean,
  slashed,
  volume,
  roleLabel,
  roleDescription,
}: {
  address: string;
  clean: number;
  slashed: number;
  volume: string;
  roleLabel: string;
  roleDescription: string;
}) {
  return (
    <Link
      href={`/app/agents/${encodeURIComponent(address)}`}
      className="group block"
    >
      <Panel className="p-6 transition-colors group-hover:border-accent/40">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-sm text-bone group-hover:text-accent">
            {truncateHash(address)}
          </p>
          <span className="serial text-[0.6rem] text-muted">{roleLabel}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{roleDescription}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="serial text-[0.58rem] text-muted">Clean</dt>
            <dd className="mt-1 font-mono text-lg text-accent tabular">{clean}</dd>
          </div>
          <div>
            <dt className="serial text-[0.58rem] text-muted">Slashed</dt>
            <dd className="mt-1 font-mono text-lg text-slash tabular">{slashed}</dd>
          </div>
          <div>
            <dt className="serial text-[0.58rem] text-muted">Moved</dt>
            <dd className="mt-1 font-mono text-lg text-bone tabular">
              <Money atomic={volume} bare />
            </dd>
          </div>
        </dl>
      </Panel>
    </Link>
  );
}
