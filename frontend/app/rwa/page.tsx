import type { Metadata } from 'next';
import Image from 'next/image';
import { api, safeGet } from '@/lib/api';
import { Label, Panel } from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import Money from '@/components/ui/Money';
import { truncateHash } from '@/lib/format';
import CopyHash from '@/components/ui/CopyHash';

export const metadata: Metadata = {
  title: 'The invoice adapter',
  description:
    'Invoices are the first Bondsman adapter. Delivery contradiction is the flagship fault. Duplicate claim is the deterministic test vector.',
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
        <Label>The first adapter</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Invoices are the first Bondsman adapter.
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Autonomous invoice-payout agents make two kinds of consequential
          mistake. Delivery that never happened is the flagship delayed-evidence
          fault: it is what the canonical proof settled. Duplicate claim is the
          deterministic test vector: a claim-hash collision the contract proves
          with zero oracle trust. Both slash the bond.
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
        <Stat label="Faults slashed" value={String(slashed)} tone="slash" />
      </section>

      <section aria-label="How the two verifiers work" className="space-y-6">
        <div className="space-y-2">
          <Label>The two verifiers</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Two on-chain verifiers cover the invoice payout adapter
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            The delivery-contradiction verifier reads a signed attestation from
            the buyer key and matches it to an executed action; the on-chain
            verifier checks the signature and evidence root. The duplicate-claim
            verifier watches the paid-claim registry: if a payout reuses a claim
            hash already paid, the contract proves the collision. In both cases
            the bond splits between the challenger and the protection reserve.
          </p>
        </div>
        <figure className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-rule bg-surface/50 p-4 sm:p-6">
          <Image
            src="/diagrams/duplicate-proof.svg"
            alt="A duplicate invoice reuses a claim hash that was already paid. The contract proves it, slashes the bond, and the challenger and reserve split the take."
            width={1120}
            height={520}
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
          Invoice numbers, debtors, due dates and delivery flags are controlled
          testnet fixtures for reproducible verification. The bond, execution,
          challenge and slash are all real Casper testnet transactions.
        </p>
      </section>

      {reserve && (
        <section aria-label="Reserve" className="space-y-3 border-t border-rule pt-8">
          <Label>Protection reserve</Label>
          <p className="text-sm leading-relaxed text-muted">
            The reserve grows only when a bond is slashed by a verified fault.
            Its balance is a measure of accountability enforced, not fee revenue.
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
