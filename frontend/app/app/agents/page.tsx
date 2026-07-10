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

type ApprovalStats = { clean: number; slashed: number; volume: bigint };

function accountAddress(accountHash: string) {
  return `account-hash-${accountHash}`;
}

export default async function AgentsPage() {
  const [actionsRes, deploymentsRes, watchdogRes] = await Promise.all([
    safeGet(() => api.actions()),
    safeGet(() => api.deployments()),
    safeGet(() => api.watchdog()),
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
  const watchdog = watchdogRes.reachable ? watchdogRes.data : null;

  const byAgent = new Map<string, ApprovalStats>();
  for (const action of actions) {
    const rec = byAgent.get(action.agent) ?? { clean: 0, slashed: 0, volume: 0n };
    if (action.status === 'ResolvedSlash') rec.slashed += 1;
    else if (action.status === 'ResolvedRefund') rec.clean += 1;
    rec.volume += BigInt(action.amount || '0');
    byAgent.set(action.agent, rec);
  }

  const approverAddress = deployments
    ? accountAddress(deployments.accounts.agent.accountHash)
    : null;
  const watchdogAddress = watchdog?.account ?? (deployments
    ? accountAddress(deployments.accounts.watchdog.accountHash)
    : null);
  const approver = approverAddress
    ? byAgent.get(approverAddress) ?? { clean: 0, slashed: 0, volume: 0n }
    : null;
  const watchdogActions = watchdogAddress
    ? actions.filter((action) => action.challenger === watchdogAddress)
    : [];
  const activeCore = new Set(
    [approverAddress, watchdogAddress].filter((address): address is string => Boolean(address)),
  );

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Agents"
        intro="The configured approver posts bonds before payouts. The watchdog signs duplicate challenges. These cards are derived from the current deployment and projected Casper testnet activity."
      />

      {approverAddress && watchdogAddress && (
        <section aria-label="Active core agents">
          <h2 className="serial mb-3 text-[0.68rem] text-muted">Active core agents</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ApproverCard address={approverAddress} stats={approver!} />
            <WatchdogCard
              address={watchdogAddress}
              challenges={watchdogActions.length}
              slashes={watchdogActions.filter((action) => action.status === 'ResolvedSlash').length}
              rewards={watchdog?.totalRewardEarned ?? '0'}
              lastActionId={watchdog?.recentCatches[0]?.actionId ?? null}
              running={watchdog?.running ?? false}
            />
          </div>
        </section>
      )}

      {byAgent.size > 0 && (
        <section aria-label="Historical addresses">
          <h2 className="serial mb-3 text-[0.68rem] text-muted">Historical approver addresses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[...byAgent.entries()]
              .filter(([address]) => !activeCore.has(address))
              .map(([address, stats]) => {
                const role = resolveRole(address, deployments);
                return (
                  <ApproverCard
                    key={address}
                    address={address}
                    stats={stats}
                    label={role.role === 'other' ? 'Historical approver' : role.label}
                  />
                );
              })}
          </div>
        </section>
      )}

      {byAgent.size === 0 && <EmptyState title="No agents yet" body="Agents appear here once they act on an invoice." />}
    </div>
  );
}

function ApproverCard({
  address,
  stats,
  label = 'Approver (model-driven)',
}: {
  address: string;
  stats: ApprovalStats;
  label?: string;
}) {
  return (
    <Link href={`/app/agents/${encodeURIComponent(address)}`} className="group block">
      <Panel className="p-6 transition-colors group-hover:border-accent/40">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-sm text-bone group-hover:text-accent">{truncateHash(address)}</p>
          <span className="serial text-[0.6rem] text-muted">{label}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">Posts a bond before every approval and pays only after contract execution.</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Metric label="Clean" value={String(stats.clean)} tone="accent" />
          <Metric label="Slashed" value={String(stats.slashed)} tone="slash" />
          <Metric label="Moved" value={<Money atomic={stats.volume.toString()} bare />} />
        </dl>
      </Panel>
    </Link>
  );
}

function WatchdogCard({
  address,
  challenges,
  slashes,
  rewards,
  lastActionId,
  running,
}: {
  address: string;
  challenges: number;
  slashes: number;
  rewards: string;
  lastActionId: number | null;
  running: boolean;
}) {
  return (
    <Panel className="p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-sm text-bone">{truncateHash(address)}</p>
        <span className="serial text-[0.6rem] text-muted">Watchdog (deterministic)</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">Scans projected payouts, signs duplicate challenges, and earns the contract-defined challenger share.</p>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Metric label="Challenges" value={String(challenges)} tone="accent" />
        <Metric label="Slashes" value={String(slashes)} tone="slash" />
        <Metric label="Rewards" value={<Money atomic={rewards} bare />} />
      </dl>
      <p className="mt-4 text-xs text-muted">
        {running ? 'Active heartbeat' : 'Heartbeat delayed'}
        {lastActionId !== null ? ` · Latest slash #${lastActionId}` : ''}
      </p>
    </Panel>
  );
}

function Metric({ label, value, tone = 'bone' }: { label: string; value: React.ReactNode; tone?: 'accent' | 'slash' | 'bone' }) {
  const colors = { accent: 'text-accent', slash: 'text-slash', bone: 'text-bone' };
  return (
    <div>
      <dt className="serial text-[0.58rem] text-muted">{label}</dt>
      <dd className={`mt-1 font-mono text-lg tabular ${colors[tone]}`}>{value}</dd>
    </div>
  );
}
