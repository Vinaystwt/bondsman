'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useId, useState } from 'react';

export type SealState = 'idle' | 'stamp' | 'lift' | 'strike';

interface SealProps {
  /** Visual state. idle = logo, stamp = bond posted, lift = refund, strike = slash. */
  state?: SealState;
  size?: number;
  /** Show the ring text. Off for small marks like the favicon or nav logo. */
  withText?: boolean;
  className?: string;
  title?: string;
}

const COLOR: Record<SealState, string> = {
  idle: '#B7791F', // copper
  stamp: '#B7791F', // copper, the sealed state
  lift: '#5A7D6F', // sage, the quiet refund
  strike: '#E0231C', // void red, the slash (the only place red appears)
};

// The toothed outer ring of a notary stamp.
function teeth(count: number, r: number, color: string) {
  // Round to fixed precision so the coordinates serialize identically on the
  // server and the client (float toString otherwise diverges and breaks hydration).
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const ticks = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const x1 = round(50 + Math.cos(angle) * r);
    const y1 = round(50 + Math.sin(angle) * r);
    const x2 = round(50 + Math.cos(angle) * (r + 3.4));
    const y2 = round(50 + Math.sin(angle) * (r + 3.4));
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />,
    );
  }
  return ticks;
}

// The crafted mark itself, shared by the static and animated wrappers.
function SealBody({
  id,
  color,
  withText,
  strike,
  animateStrike,
}: {
  id: string;
  color: string;
  withText: boolean;
  strike: boolean;
  animateStrike: boolean;
}) {
  return (
    <>
      <defs>
        <path id={`${id}-top`} d="M 16 50 A 34 34 0 0 1 84 50" fill="none" />
        <path id={`${id}-bottom`} d="M 84 50 A 34 34 0 0 1 16 50" fill="none" />
        <radialGradient id={`${id}-wax`} cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="70%" stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="46" fill={`url(#${id}-wax)`} />
      {teeth(40, 44, color)}
      <circle cx="50" cy="50" r="41" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
      <circle cx="50" cy="50" r="33.5" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="50" cy="50" r="24" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />

      {withText && (
        <g
          fill={color}
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '6.6px',
            letterSpacing: '0.34em',
            fontWeight: 500,
          }}
        >
          <text>
            <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
              BONDSMAN
            </textPath>
          </text>
          <text>
            <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
              NOTARY OF MONEY
            </textPath>
          </text>
        </g>
      )}

      {/* Central mark: two arms gripping the coin. It holds the stake. */}
      <g stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <circle cx="50" cy="50" r="8.5" strokeWidth="2.2" />
        <path d="M 50 41.5 L 50 35" />
        <path d="M 41 47 Q 36 50 41 53" />
        <path d="M 59 47 Q 64 50 59 53" />
        <circle cx="50" cy="50" r="2.4" fill={color} stroke="none" />
      </g>

      {/* The strike: a decisive line through the seal. Slash only. */}
      {strike &&
        (animateStrike ? (
          <motion.line
            x1="20"
            y1="80"
            x2="80"
            y2="20"
            stroke="#E0231C"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <line x1="20" y1="80" x2="80" y2="20" stroke="#E0231C" strokeWidth="4" strokeLinecap="round" />
        ))}
    </>
  );
}

export function Seal({
  state = 'idle',
  size = 96,
  withText = true,
  className,
  title = 'Bondsman seal',
}: SealProps) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const color = COLOR[state];

  // Render a static, identical mark on the server and first client paint, then
  // hand over to the animated version after mount. This keeps hydration clean.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const shared = {
    role: 'img' as const,
    'aria-label': title,
    width: size,
    height: size,
    viewBox: '0 0 100 100',
    className,
  };

  if (!mounted || reduce) {
    return (
      <svg {...shared}>
        <title>{title}</title>
        <SealBody id={id} color={color} withText={withText} strike={state === 'strike'} animateStrike={false} />
      </svg>
    );
  }

  const variants: Variants = {
    idle: { scale: 1, rotate: 0, opacity: 1, y: 0 },
    stamp: {
      scale: [1.4, 0.92, 1],
      rotate: [-9, 1.5, 0],
      opacity: [0, 1, 1],
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
    lift: {
      scale: [1, 1.12],
      opacity: [1, 0.88],
      y: [0, -4],
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
    strike: { scale: 1, rotate: 0, opacity: 1, y: 0 },
  };

  return (
    <motion.svg
      key={state}
      {...shared}
      initial="idle"
      animate={state}
      variants={variants}
    >
      <title>{title}</title>
      <SealBody id={id} color={color} withText={withText} strike={state === 'strike'} animateStrike />
    </motion.svg>
  );
}

export default Seal;
