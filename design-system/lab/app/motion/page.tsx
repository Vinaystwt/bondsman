// Motion prototype lab (Task 24): the bond-split animation
// (components/BondSplitAnimation.tsx) rendered live, beside a static,
// unwrapped rendering of the same two `BondValueBlock` states -- the
// reduced-motion equivalent MOTION_SPEC.md §9 requires every animation to
// have. Also demonstrates that `useReducedMotion()` actually gates the
// animated version: with OS-level "reduce motion" enabled, the left column
// skips straight to the resolved frame with no divide/count, matching the
// right column exactly.
//
// No `--accent` anywhere on this page. No `rounded-*` class.

import { BondSplitAnimation } from '../../components/BondSplitAnimation';
import { BondValueBlock } from '../../components/BondValueBlock';

export default function MotionPage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Motion prototype: bond split</h1>
      <p style={{ maxWidth: '72ch' }}>
        The full choreography is documented in{' '}
        <code>design-system/MOTION_SPEC.md</code> §7. Click{' '}
        <em>Trigger resolution</em> below to play it: the block holds, then
        divides into three segments over <code>--duration-long</code> with{' '}
        <code>--ease-emphasized</code>, with each figure counting up rather
        than jump-cutting, and the <code>--consequential</code> colour on
        the slashed figure only reaching full opacity once the count
        settles. If your OS has &quot;reduce motion&quot; enabled,{' '}
        <code>useReducedMotion()</code> is read directly and the same
        trigger jumps straight to the final resolved frame with no divide,
        no count-up, and no colour fade -- identical to the static column
        on the right.
      </p>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-subhead text-ink font-sans">Animated (respects reduced motion)</h2>
          <BondSplitAnimation />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-subhead text-ink font-sans">
            Reduced-motion equivalent (static, no wrapper)
          </h2>
          <p style={{ maxWidth: '60ch' }} className="text-data text-muted font-sans">
            The identical two states, rendered with no animation wrapper at
            all -- what every viewer sees regardless of motion preference,
            once the sequence has finished or been skipped.
          </p>
          <div className="flex flex-col gap-4">
            <span className="text-data text-muted font-mono">in flight</span>
            <BondValueBlock posted={2800} asset="csprUSD" />
            <span className="text-data text-muted font-mono">resolved (slash)</span>
            <BondValueBlock
              posted={2800}
              asset="csprUSD"
              resolution={{ slashed: 2520, reward: 280, refund: 0 }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
