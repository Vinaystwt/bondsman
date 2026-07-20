import { Label, StatusPill } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/format';
import type { CanonicalBondEconomics } from '@/lib/types';

interface Props {
  economics: CanonicalBondEconomics;
  policySnapshot: Record<string, unknown> | null | undefined;
  actionId: string;
}

/**
 * Bond economics for the canonical action.
 *
 * Shows the deterministic quoted minimum against the actual posted bond, the
 * relationship between them, and an honest explanation. Action 27 predates the
 * quote policy snapshot; when policySnapshot is null, that is explained in the
 * disclosure rather than shown as a warning.
 */
export default function BondEconomicsCard({
  economics,
  policySnapshot,
  actionId,
}: Props) {
  const relTone =
    economics.bondRelation === 'overcollateralized'
      ? 'ok'
      : economics.bondRelation === 'exact'
        ? 'ok'
        : 'warn';
  const relLabel = economics.bondRelation.replace(/_/g, ' ');
  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Bond economics</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            Quoted minimum against actual posted collateral
          </h3>
        </div>
        <StatusPill tone={relTone as 'ok' | 'warn'}>{relLabel}</StatusPill>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Quoted minimum bond"
          value={formatMoney(economics.quotedMinimumBond)}
        />
        <Metric
          label="Actual posted bond"
          value={formatMoney(economics.actualPostedBond)}
          tone="accent"
        />
        <Metric
          label="Additional collateral"
          value={formatMoney(economics.bondDifference)}
        />
        <Metric
          label="Minimum satisfied"
          value={economics.minimumSatisfied ? 'Yes' : 'No'}
          tone={economics.minimumSatisfied ? 'accent' : 'slash'}
        />
      </dl>

      <div className="mt-6 rounded-md border border-rule bg-ink/60 p-4 text-sm leading-relaxed text-muted">
        <p>
          The paid quote established the minimum collateral requirement. The
          Casper controller required additional collateral at initiation using
          its authoritative on chain state. The action was overcollateralized
          without contradicting the quote.
        </p>
      </div>

      <details className="mt-4 text-xs text-muted">
        <summary className="cursor-pointer text-bone/80 hover:text-accent">
          Technical details
        </summary>
        <div className="mt-3 space-y-2 border-t border-rule pt-3">
          <p>
            <span className="serial text-[0.6rem] text-muted">Exact match</span>{' '}
            <span className="text-bone">
              {economics.exactMatch ? 'true' : 'false'}
            </span>
          </p>
          <p>
            <span className="serial text-[0.6rem] text-muted">
              Policy snapshot
            </span>{' '}
            {policySnapshot === null || policySnapshot === undefined ? (
              <span className="text-bone">
                Action No. {actionId.padStart(4, '0')} predates quote policy snapshot persistence.
              </span>
            ) : (
              <span className="text-bone">present</span>
            )}
          </p>
        </div>
      </details>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = 'bone',
}: {
  label: string;
  value: string;
  tone?: 'bone' | 'accent' | 'slash';
}) {
  const toneClass = {
    bone: 'text-bone',
    accent: 'text-accent',
    slash: 'text-slash',
  }[tone];
  return (
    <div className="rounded-md border border-rule bg-ink px-4 py-3">
      <dt className="serial text-[0.6rem] text-muted">{label}</dt>
      <dd className={`mt-2 font-mono text-lg tabular ${toneClass}`}>{value}</dd>
    </div>
  );
}
