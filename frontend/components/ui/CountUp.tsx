'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// Counts from 0 to value once, on first render. Numbers-only, transform-free,
// so it cannot cause layout thrash; reduced motion renders the final value.
export default function CountUp({
  value,
  durationMs = 900,
  format,
}: {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduce || started.current) {
      setDisplay(value);
      return;
    }
    started.current = true;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduce]);

  return <>{format ? format(display) : display.toLocaleString('en-US')}</>;
}
