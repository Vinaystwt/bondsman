'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  index: number;
  slash?: boolean;
  children: ReactNode;
}

/**
 * One-shot scroll-triggered reveal for a canonical timeline step.
 * Reduced-motion users get the completed state immediately.
 */
export default function TimelineStep({ index, slash, children }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <li className="relative">
        <span
          aria-hidden="true"
          className={`absolute -left-[27px] top-2 grid h-3 w-3 place-items-center rounded-full border ${
            slash ? 'border-slash bg-ink' : 'border-accent bg-ink'
          }`}
        >
          <span
            className={`h-1 w-1 rounded-full ${slash ? 'bg-slash' : 'bg-accent'}`}
          />
        </span>
        {children}
      </li>
    );
  }

  return (
    <motion.li
      className="relative"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.05, 0.35),
      }}
    >
      <motion.span
        aria-hidden="true"
        className={`absolute -left-[27px] top-2 grid h-3 w-3 place-items-center rounded-full border ${
          slash ? 'border-slash bg-ink' : 'border-accent bg-ink'
        }`}
        initial={{ scale: 0.4, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.05 }}
      >
        <span
          className={`h-1 w-1 rounded-full ${slash ? 'bg-slash' : 'bg-accent'}`}
        />
      </motion.span>
      {children}
    </motion.li>
  );
}
