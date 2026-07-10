'use client';

import CountUp from './CountUp';
import { toCsprUsd } from '@/lib/format';

// Animated money figure: counts up to the csprUSD value on first view.
// Server components can embed this directly; only the number animates.
export default function MoneyCountUp({ atomic }: { atomic: string }) {
  const value = Math.round(toCsprUsd(atomic));
  return (
    <CountUp
      value={value}
      format={(n) => n.toLocaleString('en-US')}
    />
  );
}
