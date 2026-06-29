import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import { Label, Panel } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import Term from '@/components/ui/Term';

export const metadata: Metadata = { title: 'Policies' };

// The bond tiers are contract logic, not money the API provides.
// get_bond_required: base by amount, plus a penalty when reputation is negative.
const TIERS = [
  { range: '50,000 csprUSD and above', bps: 500, pct: '5.0%' },
  { range: '10,000 to 49,999 csprUSD', bps: 300, pct: '3.0%' },
  { range: 'below 10,000 csprUSD', bps: 200, pct: '2.0%' },
];

export default async function PoliciesPage() {
  // Show the live penalty by reading the agent's current score.
  const deploymentsRes = await safeGet(() => api.deployments());
  let score: number | null = null;
  if (deploymentsRes.reachable) {
    const hash = deploymentsRes.data.accounts.agent?.accountHash;
    if (hash) {
      const agentRes = await safeGet(() => api.agent(`account-hash-${hash}`));
      if (agentRes.reachable) score = agentRes.data.score;
    }
  } else {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Policies" />
        <BackendDown />
      </div>
    );
  }

  const penaltyBps = score !== null && score < 0 ? Math.min(Math.abs(score), 300) : 0;

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Policies"
        intro={
          <>
            The <Term name="bond">bond</Term> an agent must post is set by the
            contract, not by anyone after the fact. It scales with the size of
            the payout and with the agent&apos;s record.
          </>
        }
      />

      {/* Risk-weighted base */}
      <section aria-label="Risk-weighted bond">
        <h2 className="font-display text-2xl text-bone">Risk weighted bond</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          A larger payout puts more at risk, so it requires a larger stake. The
          base rate steps up with the amount.
        </p>
        <div className="mt-5 overflow-hidden rounded-md border border-rule">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr className="serial text-[0.62rem] text-muted">
                <th className="px-4 py-3 font-medium">Payout size</th>
                <th className="px-4 py-3 font-medium">Base rate</th>
                <th className="px-4 py-3 text-right font-medium">Basis points</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.bps} className="border-t border-rule">
                  <td className="px-4 py-3 text-bone">{t.range}</td>
                  <td className="px-4 py-3 font-mono text-copper tabular">{t.pct}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted tabular">{t.bps} bps</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reputation penalty */}
      <section aria-label="Reputation penalty">
        <h2 className="font-display text-2xl text-bone">Reputation penalty</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          A clean action raises an agent&apos;s{' '}
          <Term name="reputation">score</Term> by 10. A{' '}
          <Term name="slash">slash</Term> drops it by 50. While the score is
          negative, the contract adds that many basis points to the bond, up to a
          cap of 300. A worse record means a larger stake before the agent can
          act again.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Panel className="px-5 py-4">
            <Label>Clean action</Label>
            <p className="mt-2 font-mono text-2xl text-sage tabular">+10</p>
            <p className="mt-1 text-xs text-muted">to score</p>
          </Panel>
          <Panel className="px-5 py-4">
            <Label>Slash</Label>
            <p className="mt-2 font-mono text-2xl text-void tabular">&minus;50</p>
            <p className="mt-1 text-xs text-muted">to score</p>
          </Panel>
          <Panel className="px-5 py-4">
            <Label>Current agent score</Label>
            <p className="mt-2 font-mono text-2xl text-bone tabular">
              {score ?? '·'}
            </p>
            <p className="mt-1 text-xs text-muted">
              adds {penaltyBps} bps to bonds
            </p>
          </Panel>
        </div>
      </section>

      {/* Worked example */}
      <section aria-label="Worked example">
        <h2 className="font-display text-2xl text-bone">A worked example</h2>
        <Panel className="mt-4 p-6">
          <p className="text-sm leading-relaxed text-bone">
            On a 1,000 csprUSD payout, the base rate is 2.0%, so the bond is{' '}
            <span className="font-mono text-copper">20 csprUSD</span>. After a
            slash drops the score to negative, the contract adds the penalty. At a
            score of negative 40, the rate becomes 2.4% and the same payout now
            needs a{' '}
            <span className="font-mono text-copper">24 csprUSD</span> bond. The
            agent pays more for moving the same money because its record is worse.
          </p>
        </Panel>
      </section>

      {/* Slash split */}
      <section aria-label="Slash split">
        <h2 className="font-display text-2xl text-bone">The slash split</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          When a bond is slashed, it divides in two. Half goes to whoever caught
          the wrong payout, which pays people to watch. Half goes to the{' '}
          <Term name="reserve">reserve</Term> that protects depositors.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-copper/40 bg-copper/10 px-5 py-4">
            <Label>To the challenger</Label>
            <p className="mt-2 font-mono text-2xl text-copper tabular">50%</p>
          </div>
          <div className="rounded-md border border-sage/40 bg-sage/10 px-5 py-4">
            <Label>To the reserve</Label>
            <p className="mt-2 font-mono text-2xl text-sage tabular">50%</p>
          </div>
        </div>
      </section>
    </div>
  );
}
