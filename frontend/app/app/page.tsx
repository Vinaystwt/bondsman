import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Label, Panel, Stat } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import ActionRow from '@/components/app/ActionRow';
import Ticker from '@/components/live/Ticker';
import RealVsDemo from '@/components/RealVsDemo';
import ReserveGrowth from '@/components/ReserveGrowth';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import Term from '@/components/ui/Term';
import { parseEventData, serial, truncateHash, txExplorer } from '@/lib/format';
import type { ActionSummary } from '@/lib/types';

export const metadata: Metadata = { title: 'Overview' };

function sum(values: string[]): string {
  return values.reduce((acc, v) => acc + BigInt(v || '0'), 0n).toString();
}

const TIERS = [
  ['Below 10,000 csprUSD', '2.0%'],
  ['10,000 and above', '3.0%'],
  ['50,000 and above', '5.0%'],
];

export default async function OverviewPage() {
  const [healthRes, actionsRes, reserveRes, watchdogRes] = await Promise.all([
    safeGet(() => api.health()),
    safeGet(() => api.actions()),
    safeGet(() => api.reserve()),
    safeGet(() => api.watchdog()),
  ]);

  if (!healthRes.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Overview" />
        <BackendDown />
      </div>
    );
  }

  const actions = actionsRes.reachable ? actionsRes.data : [];
  const reserve = reserveRes.reachable
    ? reserveRes.data
    : { balance: '0', slashes: [] };
  const watchdog = watchdogRes.reachable ? watchdogRes.data : null;

  const now = Date.now();
  const open = actions.filter(
    (a) => a.status === 'Executed' && a.windowEnd > now && !a.challenger,
  );
  const slashedActions = actions.filter((a) => a.status === 'ResolvedSlash');
  const heldBonds = sum(open.map((a) => a.bondPosted));
  const slashedBonds = sum(slashedActions.map((a) => a.bondPosted));
  const recent = [...actions].sort((a, b) => b.actionId - a.actionId).slice(0, 6);

  return (
    <div className="space-y-12">
      <PageHeader
        label="Product"
        title="Overview"
        intro="Live state from Casper testnet. Every figure here is read from the chain through the projection, not stored in the app."
      />

      <section aria-label="Totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Held in bonds" tone="accent">
          <Money atomic={heldBonds} bare />
        </Stat>
        <Stat label="Slashed to date" tone="slash">
          <Money atomic={slashedBonds} bare />
        </Stat>
        <Stat label="Reserve balance" tone="accent">
          <Money atomic={reserve.balance} bare />
        </Stat>
        <Stat label="Watchdog earned" tone="accent">
          {watchdog ? <Money atomic={watchdog.totalRewardEarned} bare /> : '0'}
        </Stat>
      </section>

      <section aria-label="Live activity">
        <h2 className="serial mb-3 text-[0.68rem] text-muted">Live activity</h2>
        <Ticker limit={8} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <section aria-label="Recent activity">
          <h2 className="serial mb-3 text-[0.68rem] text-muted">Recent actions</h2>
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

        <section aria-label="Open to challenge">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="serial text-[0.68rem] text-muted">Open to challenge</h2>
            <Link href="/app/arena" className="text-xs text-accent hover:underline">
              Go to Challenge Arena
            </Link>
          </div>
          {open.length === 0 ? (
            <EmptyState
              title="Nothing open right now"
              body="Bonds in flight appear here while their challenge window is open."
            />
          ) : (
            <div className="space-y-2">
              {open.map((a) => (
                <ActionRow key={a.actionId} action={a} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section aria-label="Reserve growth">
        <h2 className="serial mb-3 text-[0.68rem] text-muted">Reserve growth</h2>
        <ReserveGrowth reserve={reserve} />
      </section>

      {/* Folded panels: policies and the reserve */}
      <div className="grid gap-10 lg:grid-cols-2">
        <PoliciesPanel />
        <ReservePanel slashes={reserve.slashes} balance={reserve.balance} />
      </div>

      <section aria-label="Real vs demo">
        <h2 className="serial mb-3 text-[0.68rem] text-muted">What is real, what is mocked</h2>
        <RealVsDemo />
      </section>
    </div>
  );
}

function PoliciesPanel() {
  return (
    <section aria-label="Policies">
      <h2 className="serial mb-3 text-[0.68rem] text-muted">Bond policy</h2>
      <Panel className="p-6">
        <p className="text-sm leading-relaxed text-muted">
          The <Term name="bond">bond</Term> is set by the contract. It scales with
          the payout, and a negative reputation score adds a premium above the
          tier floor, never a discount below it.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="serial text-[0.58rem] text-muted">
              <th className="pb-2 font-medium">Payout size</th>
              <th className="pb-2 text-right font-medium">Base rate</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map(([range, rate]) => (
              <tr key={range} className="border-t border-rule">
                <td className="py-2 text-bone">{range}</td>
                <td className="py-2 text-right font-mono text-accent tabular">{rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-rule pt-4">
          <div>
            <Label>To the challenger</Label>
            <p className="mt-1 font-mono text-lg text-accent tabular">50%</p>
          </div>
          <div>
            <Label>To the reserve</Label>
            <p className="mt-1 font-mono text-lg text-accent tabular">50%</p>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function ReservePanel({
  slashes,
  balance,
}: {
  slashes: { data: string; actionId: number; transactionHash: string | null }[];
  balance: string;
}) {
  return (
    <section aria-label="Protection reserve">
      <h2 className="serial mb-3 text-[0.68rem] text-muted">Protection reserve</h2>
      <Panel className="p-6">
        <p className="text-sm leading-relaxed text-muted">
          Funded only by slashed bonds. It exists to protect the people whose
          money the agent moves, so its balance measures fraud caught.
        </p>
        <p className="mt-3 font-mono text-2xl text-accent tabular">
          <Money atomic={balance} />
        </p>
        <div className="mt-4 border-t border-rule pt-4">
          <Label>Slashes that funded it</Label>
          {slashes.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No slashes yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {slashes.map((s, i) => {
                const d = parseEventData(s.data);
                const amt =
                  typeof d.reserve_amount === 'string'
                    ? d.reserve_amount
                    : typeof d.pool_amount === 'string'
                      ? d.pool_amount
                      : null;
                return (
                  <li key={`${s.transactionHash}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/app/actions/${s.actionId}`} className="serial text-[0.6rem] text-muted hover:text-accent">
                      {serial(s.actionId)}
                    </Link>
                    <span className="text-bone">{amt ? <Money atomic={amt} /> : 'recorded'}</span>
                    {s.transactionHash ? (
                      <CopyHash value={s.transactionHash} href={txExplorer(s.transactionHash)} label={truncateHash(s.transactionHash)} />
                    ) : (
                      <span className="text-xs text-muted">Proof from prior contract</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>
    </section>
  );
}
