import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Label, Panel } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import Term from '@/components/ui/Term';
import { parseEventData, serial, truncateHash, txExplorer } from '@/lib/format';

export const metadata: Metadata = { title: 'Protection Reserve' };

export default async function ReservePage() {
  const res = await safeGet(() => api.reserve());
  if (!res.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Protection Reserve" />
        <BackendDown />
      </div>
    );
  }
  const reserve = res.data;

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Protection Reserve"
        intro={
          <>
            When a bond is{' '}
            <Term name="slash">slashed</Term>, half goes to whoever caught the
            wrong payout and half goes here. The{' '}
            <Term name="reserve">reserve</Term> exists to protect the people
            whose money the agent moves.
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <div className="rounded-md border border-sage/40 bg-sage/10 px-6 py-6">
          <Label>Reserve balance</Label>
          <p className="mt-2 font-mono text-3xl text-sage tabular">
            <Money atomic={reserve.balance} bare />
          </p>
          <p className="mt-1 text-sm text-muted">csprUSD</p>
        </div>
        <Panel className="flex items-center px-6 py-6">
          <p className="text-sm leading-relaxed text-muted">
            The reserve is funded only by wrong actions. It grows when the
            contract proves a payout was a duplicate and takes the bond. Nothing
            else pays into it, so its balance is a direct measure of fraud caught.
          </p>
        </Panel>
      </section>

      <section aria-label="Slashes that funded the reserve">
        <h2 className="serial mb-3 text-[0.68rem] text-muted">
          Slashes that funded the reserve
        </h2>
        {reserve.slashes.length === 0 ? (
          <EmptyState
            title="No slashes yet"
            body="When an action is proven wrong, its share of the slashed bond appears here with a link to the transaction."
          />
        ) : (
          <ul className="space-y-2">
            {reserve.slashes.map((slash, i) => {
              const data = parseEventData(slash.data);
              const reserveAmount =
                typeof data.reserve_amount === 'string'
                  ? data.reserve_amount
                  : typeof data.pool_amount === 'string'
                    ? data.pool_amount
                    : null;
              return (
                <li
                  key={`${slash.transactionHash}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-surface px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/app/actions/${slash.actionId}`}
                      className="serial text-[0.62rem] text-muted hover:text-copper"
                    >
                      {serial(slash.actionId)}
                    </Link>
                    <span className="text-sm text-bone">
                      {reserveAmount ? (
                        <>
                          <Money atomic={reserveAmount} /> to the reserve
                        </>
                      ) : (
                        'Slash recorded'
                      )}
                    </span>
                  </div>
                  <CopyHash
                    value={slash.transactionHash}
                    href={txExplorer(slash.transactionHash)}
                    label={`tx ${truncateHash(slash.transactionHash)}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
