import type { Metadata } from 'next';
import Image from 'next/image';
import { api, safeGet } from '@/lib/api';
import { Label, Panel } from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import Money from '@/components/ui/Money';
import { truncateHash } from '@/lib/format';
import CopyHash from '@/components/ui/CopyHash';

export const metadata: Metadata = {
  title: 'The invoice pool',
  description:
    'Bondsman guards an invoice-financing pool from duplicate payouts.',
};

export default async function RWAPage() {
  const [invoicesRes, actionsRes, reserveRes] = await Promise.all([
    safeGet(() => api.invoices()),
    safeGet(() => api.actions()),
    safeGet(() => api.reserve()),
  ]);

  if (!invoicesRes.reachable || !actionsRes.reachable) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <BackendDown />
      </div>
    );
  }

  const invoices = invoicesRes.data;
  const actions = actionsRes.data;
  const reserve = reserveRes.reachable ? reserveRes.data : null;

  const paid = invoices.filter((i) => i.paid).length;
  const totalPool = invoices.reduce((acc, i) => acc + BigInt(i.amount || '0'), 0n);
  const slashed = actions.filter((a) => a.status === 'ResolvedSlash').length;

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>The use case</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          A pool that stops paying twice
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Invoice financing pools pay vendors early and collect from the debtor
          later. The failure that eats these pools is paying the same invoice
          twice: a duplicate claim slips through, the money leaves, and no one
          catches it before the next reporting cycle. Bondsman puts a bonded
          agent between the pool and the payout.
        </p>
      </header>

      <section aria-label="Pool statistics" className="grid gap-4 sm:grid-cols-4">
        <Stat label="Invoices in pool" value={String(invoices.length)} />
        <Stat label="Paid" value={String(paid)} />
        <Stat
          label="Value at risk"
          value={<Money atomic={totalPool.toString()} bare />}
          suffix="csprUSD"
        />
        <Stat label="Duplicates caught" value={String(slashed)} tone="slash" />
      </section>

      <section aria-label="How the proof works" className="space-y-6">
        <div className="space-y-2">
          <Label>The proof</Label>
          <h2 className="text-2xl font-semibold text-bone">
            One claim, one payout, enforced by the contract
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Every invoice has a claim hash, a fingerprint of what it claims.
            When an agent proposes a payout, the contract checks whether that
            fingerprint was already paid. If it was, any challenger can slash
            the bond and the reserve grows.
          </p>
        </div>
        <figure className="overflow-hidden rounded-md border border-rule bg-surface p-6">
          <Image
            src="/diagrams/duplicate-proof.svg"
            alt="A duplicate invoice reuses a claim hash that was already paid. The contract proves it, slashes the bond, and the challenger and reserve split the take."
            width={900}
            height={420}
            className="h-auto w-full"
          />
        </figure>
      </section>

      <section aria-label="Invoices" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <Label>Invoices in the pool</Label>
          <span className="text-xs text-muted">
            Controlled invoice fixtures; live bond and slash execution.
          </span>
        </div>
        <ul className="space-y-2">
          {invoices.slice(0, 8).map((inv) => (
            <li key={inv.id}>
              <Panel className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3">
                <span className="serial text-[0.62rem] text-muted">
                  {inv.invoiceNumber}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-bone">{inv.debtor}</p>
                  <p className="text-xs text-muted">
                    Due {inv.dueDate}, delivered {inv.delivered ? 'yes' : 'no'}
                  </p>
                </div>
                <p className="font-mono text-sm tabular text-bone">
                  <Money atomic={inv.amount} />
                </p>
                <CopyHash value={inv.claimHash} label={truncateHash(inv.claimHash)} />
              </Panel>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted">
          Invoice numbers, debtors, due dates, and delivery flags are controlled
          testnet fixtures for reproducible duplicate-claim demonstrations. The
          claim hash is the fingerprint the contract uses to prove a duplicate;
          it is not itself a transaction.
        </p>
      </section>

      {reserve && (
        <section aria-label="Reserve" className="space-y-3 border-t border-rule pt-8">
          <Label>Protection reserve</Label>
          <p className="text-sm leading-relaxed text-muted">
            The reserve grows only when a duplicate is caught. Its balance is a
            measure of fraud stopped, not fee revenue.
          </p>
          <p className="font-mono text-3xl text-accent tabular">
            <Money atomic={reserve.balance} />
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone = 'accent',
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  tone?: 'accent' | 'slash' | 'bone';
}) {
  const toneClass = {
    accent: 'text-accent',
    slash: 'text-slash',
    bone: 'text-bone',
  }[tone];
  return (
    <div className="rounded-md border border-rule bg-surface px-5 py-4">
      <Label>{label}</Label>
      <p className={`mt-2 font-mono text-2xl tabular ${toneClass}`}>{value}</p>
      {suffix && <p className="mt-1 text-[0.62rem] text-muted">{suffix}</p>}
    </div>
  );
}
