import Link from 'next/link';
import CopyHash from '@/components/ui/CopyHash';
import { Label, StatusPill } from '@/components/ui/Primitives';
import {
  formatMoney,
  formatWindowEnd,
  resolveDisplayStatus,
  truncateHash,
  txExplorer,
} from '@/lib/format';
import type { ActionDetail } from '@/lib/types';

function statusTone(status: string): 'ok' | 'warn' | 'fault' | 'info' {
  if (status === 'ResolvedSlash') return 'fault';
  if (status === 'ResolvedRefund') return 'ok';
  if (status === 'Executed' || status === 'Challenged') return 'warn';
  return 'info';
}

export default function ActionSummary({ action }: { action: ActionDetail }) {
  const displayStatus = resolveDisplayStatus(
    action.status,
    action.windowEnd,
    action.challenger,
  );
  const txEntries = Object.entries(action.transactions)
    .filter(([, hash]) => /^[0-9a-f]{64}$/i.test(hash));

  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label>LIVE TESTNET ACTION</Label>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-bone">
            Action {action.actionId}
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            Monitor the action state, role split, transaction hashes and receipt availability from the live backend projection.
          </p>
        </div>
        <StatusPill tone={statusTone(action.status)}>{displayStatus}</StatusPill>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Principal">{formatMoney(action.amount)}</Field>
        <Field label="Bond posted">{formatMoney(action.bondPosted)}</Field>
        <Field label="Fault class">{action.faultClass ?? 'unknown'}</Field>
        <Field label="Challenge window">{formatWindowEnd(action.windowEnd)}</Field>
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-rule bg-ink p-4">
          <Label>Responsible parties</Label>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Payer">
              {action.payment?.payer ? (
                <CopyHash
                  value={action.payment.payer}
                  label={truncateHash(action.payment.payer)}
                />
              ) : (
                'not recorded'
              )}
            </Field>
            <Field label="Acting agent">
              <CopyHash value={action.agent} label={truncateHash(action.agent)} />
            </Field>
            <Field label="Bond funder">
              Configured backend agent account
            </Field>
            <Field label="Transaction submitter">
              Backend deployer and backend agent
            </Field>
            <Field label="Challenger">
              {action.challenger ? (
                <CopyHash
                  value={action.challenger}
                  label={truncateHash(action.challenger)}
                />
              ) : (
                'none yet'
              )}
            </Field>
          </dl>
        </div>

        <div className="rounded-md border border-rule bg-ink p-4">
          <Label>Payment and receipt</Label>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Payment status">
              {action.payment ? action.payment.status : 'not linked'}
            </Field>
            <Field label="Quote hash">
              {action.payment?.quoteHash ? (
                <CopyHash
                  value={action.payment.quoteHash}
                  label={truncateHash(action.payment.quoteHash)}
                />
              ) : (
                'not available'
              )}
            </Field>
            <Field label="Settlement transaction">
              {action.payment?.settlementTransaction ? (
                <CopyHash
                  value={action.payment.settlementTransaction}
                  href={txExplorer(action.payment.settlementTransaction)}
                  label={truncateHash(action.payment.settlementTransaction)}
                />
              ) : (
                'not available'
              )}
            </Field>
            <Field label="Receipt">
              {action.receiptUrl ? (
                <Link
                  href={`/verify?actionId=${action.actionId}`}
                  className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                >
                  Verify receipt
                </Link>
              ) : (
                'pending terminal resolution'
              )}
            </Field>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-rule bg-ink p-4">
        <Label>Transactions</Label>
        {txEntries.length > 0 ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {txEntries.map(([name, hash]) => (
              <li key={name} className="flex items-center justify-between gap-3 rounded border border-rule bg-surface px-3 py-2 text-sm">
                <span className="text-muted">{name}</span>
                <CopyHash value={hash} href={txExplorer(hash)} label={truncateHash(hash)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No transaction hashes are available yet.</p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="serial text-[0.6rem] text-muted">{label}</dt>
      <dd className="mt-1 break-all text-bone">{children}</dd>
    </div>
  );
}
