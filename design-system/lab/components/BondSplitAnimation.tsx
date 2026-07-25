'use client';

// BondSplitAnimation: the choreographed consequence animation MOTION_SPEC.md
// §7 describes, wrapping `BondValueBlock` (Task 18) verbatim rather than
// reimplementing its markup. Fires the hold -> divide -> count ->
// colour-resolves-last sequence over `--duration-long` with
// `--ease-emphasized`, and honours `useReducedMotion()` by skipping straight
// to the final resolved frame with zero motion (MOTION_SPEC.md §9) -- the
// static reduced-motion equivalent is rendered separately, unwrapped, on
// `/motion` (app/motion/page.tsx), per this task's brief.
//
// No `--accent` anywhere. No `rounded-*` class.

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const POSTED = 2800;
const ASSET = 'csprUSD';
const RESOLUTION = { slashed: 2520, reward: 280, refund: 0 };

// Real token values (design-system/TOKENS/tokens.css) -- framer-motion
// needs numeric seconds, so these are the one place the ms tokens are
// converted, not redefined.
const DURATION_LONG_S = 0.48; // --duration-long: 480ms
const EASE_EMPHASIZED = [0.3, 0, 0.1, 1] as const; // --ease-emphasized

function useCountUp(target: number, playing: boolean, durationS: number) {
  const [value, setValue] = useState(playing ? 0 : target);

  useEffect(() => {
    if (!playing) {
      setValue(target);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (durationS * 1000));
      setValue(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, playing, durationS]);

  return value;
}

function Segment({
  label,
  value,
  emphasize,
  colourReady,
}: {
  label: string;
  value: number;
  emphasize: boolean;
  colourReady: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <span className="text-data text-muted font-sans">{label}</span>
      <p
        className={`text-headline font-sans ${
          emphasize && colourReady ? 'text-consequential' : emphasize ? 'text-muted' : 'text-ink'
        }`}
        style={
          emphasize
            ? { transition: `color ${DURATION_LONG_S}s ${cssEase(EASE_EMPHASIZED)}` }
            : undefined
        }
      >
        <span className="font-mono tabular-nums">{value.toLocaleString()}</span> {ASSET}
      </p>
    </div>
  );
}

function cssEase([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

export function BondSplitAnimation() {
  const [resolved, setResolved] = useState(false);
  const reduced = useReducedMotion();

  // §7 step 1 (hold): nothing counts until `resolved` is true. Reduced
  // motion still requires the trigger (a real state change must occur
  // before the resolved frame appears -- see MOTION_SPEC.md §4, "entrance
  // motion is reserved for content appearing after the user is already
  // looking at the screen") but skips the divide/count animation itself.
  const playing = resolved && !reduced;

  const slashed = useCountUp(RESOLUTION.slashed, playing, DURATION_LONG_S);
  const reward = useCountUp(RESOLUTION.reward, playing, DURATION_LONG_S);
  const refund = useCountUp(RESOLUTION.refund, playing, DURATION_LONG_S);

  // §7 step 4 (colour resolves last): only reaches full opacity once the
  // count settles. With reduced motion, the resolved frame renders with
  // colour already correct -- there is no "colour arriving late" moment to
  // reduce, only the count/divide gets removed.
  const [colourReady, setColourReady] = useState(false);
  useEffect(() => {
    if (!resolved) {
      setColourReady(false);
      return;
    }
    if (reduced) {
      setColourReady(true);
      return;
    }
    const t = setTimeout(() => setColourReady(true), DURATION_LONG_S * 1000);
    return () => clearTimeout(t);
  }, [resolved, reduced]);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setResolved(true)}
        disabled={resolved}
        className="self-start border-2 border-boundary bg-surface-raised px-4 py-2 text-data text-ink font-sans disabled:opacity-50"
      >
        {resolved ? 'Resolved' : 'Trigger resolution'}
      </button>

      {!resolved ? (
        <div className="border-2 border-boundary bg-surface-raised p-4" data-resolution="none">
          <span className="text-data text-muted font-sans">Posted</span>
          <p className="text-headline text-ink font-sans">
            <span className="font-mono tabular-nums">{POSTED.toLocaleString()}</span> {ASSET}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 divide-y divide-boundary border-2 border-boundary bg-surface-raised sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          data-resolution="slash"
          initial={playing ? { opacity: 1 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: playing ? DURATION_LONG_S : 0, ease: EASE_EMPHASIZED }}
        >
          <Segment label="Slashed to reserve" value={slashed} emphasize colourReady={colourReady} />
          <Segment label="Challenger reward" value={reward} emphasize={false} colourReady={colourReady} />
          <Segment label="Payer refund" value={refund} emphasize={false} colourReady={colourReady} />
        </motion.div>
      )}
    </div>
  );
}
