import Link from 'next/link';
import { Label } from '@/components/ui/Primitives';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { truncateHash, txExplorer, formatWcspr, formatBase } from '@/lib/format';
import type { CanonicalProof } from '@/lib/types';

interface CanonicalSummaryProps {
  proof: CanonicalProof;
  receiptValid: boolean | null;
}

export default function CanonicalSummary({
  proof,
  receiptValid,
}: CanonicalSummaryProps) {
  const settlementTx = proof.payment?.settlementTransaction ?? null;
  const challengeTx =
    proof.timeline.find((s) => s.stage === 'challenge')?.txHash ?? null;
  const resolveTx =
    proof.timeline.find((s) => s.stage === 'resolve')?.txHash ?? null;

  return (
    <section
      aria-label="Canonical action proof"
      className="rounded-lg border border-rule bg-surface"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-6 py-4">
        <div>
          <Label>Canonical proof · Action No. {proof.actionId.padStart(4, '0')}</Label>
          <p className="mt-1 text-lg font-semibold text-bone">
            {proof.oneLine}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`serial rounded border px-2.5 py-1 text-[0.6rem] ${
              proof.outcome === 'SLASHED'
                ? 'border-slash/40 bg-slash/10 text-slash'
                : 'border-accent/30 bg-accent/10 text-accent'
            }`}
          >
            {proof.outcome}
          </span>
          <span className="serial rounded border border-rule bg-ink px-2.5 py-1 text-[0.6rem] text-muted">
            {proof.faultClass}
          </span>
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="x402 settlement">
          {proof.payment ? (
            <div className="space-y-1">
              <p className="font-mono text-bone">
                {formatWcspr(proof.payment.paymentAmount)}
              </p>
              {settlementTx && (
                <CopyHash
                  value={settlementTx}
                  href={txExplorer(settlementTx)}
                  label={truncateHash(settlementTx)}
                />
              )}
            </div>
          ) : (
            <span className="text-muted">not available</span>
          )}
        </Field>

        <Field label="Paid quote hash">
          {proof.paidQuote ? (
            <CopyHash
              value={proof.paidQuote.quoteHash}
              label={truncateHash(proof.paidQuote.quoteHash)}
            />
          ) : (
            <span className="text-muted">not available</span>
          )}
        </Field>

        <Field label="Principal at risk">
          <span className="font-mono text-bone">
            <Money atomic={proof.valueAtRisk} />
          </span>
        </Field>

        <Field label="Bond posted">
          <span className="font-mono text-slash">
            <Money atomic={proof.bond} />
          </span>
        </Field>

        <Field label="Watchdog challenger">
          <div className="space-y-1">
            <p className="text-xs text-muted">
              {proof.participants.challenger.role}
            </p>
            {challengeTx && (
              <CopyHash
                value={challengeTx}
                href={txExplorer(challengeTx)}
                label={truncateHash(challengeTx)}
              />
            )}
          </div>
        </Field>

        <Field label="Resolution">
          <div className="space-y-1">
            <p className="font-mono text-xs text-muted">
              Reserve credit {formatBase(proof.economicImpact.reserveCredit)}
            </p>
            {resolveTx && (
              <CopyHash
                value={resolveTx}
                href={txExplorer(resolveTx)}
                label={truncateHash(resolveTx)}
              />
            )}
          </div>
        </Field>
      </dl>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-6 py-4 text-sm">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              receiptValid ? 'bg-accent' : 'bg-muted'
            }`}
          />
          <span className="text-muted">
            {receiptValid
              ? 'Portable receipt verified independently'
              : 'Portable receipt verification unavailable'}
          </span>
        </div>
        <Link
          href="/proof"
          className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
        >
          Inspect the full proof
        </Link>
      </footer>
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
      <dt className="serial text-[0.58rem] text-muted">{label}</dt>
      <dd className="mt-1.5 text-sm text-bone">{children}</dd>
    </div>
  );
}
