import { formatAmount } from '@/lib/format';

interface MoneyProps {
  atomic: string | bigint;
  /** Hide the csprUSD suffix (for dense tables). */
  bare?: boolean;
  className?: string;
}

/** A money figure, rendered as a typeset serial in tabular mono. */
export function Money({ atomic, bare, className }: MoneyProps) {
  return (
    <span className={`font-mono tabular ${className ?? ''}`}>
      {formatAmount(atomic)}
      {!bare && <span className="ml-1 text-[0.72em] text-muted">csprUSD</span>}
    </span>
  );
}

export default Money;
