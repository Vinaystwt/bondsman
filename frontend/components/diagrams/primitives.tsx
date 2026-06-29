'use client';

import { motion, useReducedMotion, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

// The product palette, for use inside SVG attributes.
export const C = {
  ink: '#0E0D0B',
  surface: '#16140F',
  raised: '#1C1A14',
  bone: '#ECE6D8',
  muted: '#8C8473',
  copper: '#B7791F',
  sage: '#5A7D6F',
  void: '#E0231C',
  rule: '#2A2620',
} as const;

export type Tone = 'copper' | 'sage' | 'void' | 'muted' | 'bone';

export const TONE_HEX: Record<Tone, string> = {
  copper: C.copper,
  sage: C.sage,
  void: C.void,
  muted: C.muted,
  bone: C.bone,
};

/** A figure wrapper with a caption, consistent across every diagram. */
export function DiagramFrame({
  title,
  caption,
  viewBox,
  children,
  className,
}: {
  title: string;
  caption?: string;
  viewBox: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`rounded-md border border-rule bg-surface/60 p-4 sm:p-6 ${className ?? ''}`}>
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={title}
        className="h-auto w-full"
        style={{ fontFamily: 'var(--font-mono), monospace' }}
      >
        <title>{title}</title>
        {children}
      </svg>
      {caption && (
        <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Reveal a group on scroll, staggered by order. Static when reduced motion is set. */
export function Reveal({
  order = 0,
  children,
  ...rest
}: {
  order?: number;
  children: ReactNode;
} & React.ComponentProps<typeof motion.g>) {
  const reduce = useReducedMotion();
  if (reduce) return <g {...(rest as React.SVGProps<SVGGElement>)}>{children}</g>;
  return (
    <motion.g
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: order * 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.g>
  );
}

/** An arrow that draws itself in on reveal. */
export function Arrow({
  d,
  tone = 'muted',
  order = 0,
  dashed = false,
}: {
  d: string;
  tone?: Tone;
  order?: number;
  dashed?: boolean;
}) {
  const reduce = useReducedMotion();
  const color = TONE_HEX[tone];
  const markerId = `arrow-${tone}`;
  const transition: Transition = {
    delay: order * 0.12 + 0.2,
    duration: 0.5,
    ease: [0.16, 1, 0.3, 1],
  };
  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="7"
          markerHeight="7"
          refX="5.5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={color} />
        </marker>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeDasharray={dashed ? '4 4' : undefined}
        markerEnd={`url(#${markerId})`}
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={reduce ? { duration: 0 } : transition}
      />
    </>
  );
}

/** A labelled box node. Up to two lines of text. */
export function Node({
  x,
  y,
  w,
  h,
  line1,
  line2,
  tone = 'muted',
  order = 0,
  filled = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  line1: string;
  line2?: string;
  tone?: Tone;
  order?: number;
  filled?: boolean;
}) {
  const color = TONE_HEX[tone];
  return (
    <Reveal order={order}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={filled ? color : C.surface}
        fillOpacity={filled ? 0.12 : 1}
        stroke={color}
        strokeWidth={1.4}
      />
      <text
        x={x + w / 2}
        y={line2 ? y + h / 2 - 5 : y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={C.bone}
        style={{ fontSize: 9.5, letterSpacing: '0.02em' }}
      >
        {line1}
      </text>
      {line2 && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill={C.muted}
          style={{ fontSize: 7.5 }}
        >
          {line2}
        </text>
      )}
    </Reveal>
  );
}
