'use client';

import { useEffect, useState } from 'react';

// A live countdown to the challenge window close. Informational, not decorative.
export default function Countdown({ windowEnd }: { windowEnd: number }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, windowEnd - now);
  const open = remaining > 0;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <span
      className={`font-mono tabular text-sm ${open ? 'text-accent' : 'text-muted'}`}
    >
      {open
        ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} left`
        : 'window closed'}
    </span>
  );
}
