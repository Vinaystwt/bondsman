'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ActionStatus } from '@/lib/types';

interface Step {
  key: string;
  label: string;
  note: string;
}

const STEPS: Step[] = [
  { key: 'initiate', label: 'Intent', note: 'The agent commits its decision and reasoning hash.' },
  { key: 'bond', label: 'Bond', note: 'The stake is locked before anything moves.' },
  { key: 'execute', label: 'Execute', note: 'The payout clears to the vendor.' },
  { key: 'window', label: 'Challenge window', note: 'Anyone can flag the action while it is open.' },
  { key: 'resolve', label: 'Resolve', note: 'The bond returns, or it is slashed.' },
];

function progress(status: ActionStatus): { reached: number; outcome: 'refund' | 'slash' | 'pending' } {
  switch (status) {
    case 'Initiated':
      return { reached: 0, outcome: 'pending' };
    case 'Bonded':
      return { reached: 1, outcome: 'pending' };
    case 'Executed':
      return { reached: 3, outcome: 'pending' };
    case 'Challenged':
      return { reached: 3, outcome: 'pending' };
    case 'ResolvedRefund':
      return { reached: 4, outcome: 'refund' };
    case 'ResolvedSlash':
      return { reached: 4, outcome: 'slash' };
    default:
      return { reached: 0, outcome: 'pending' };
  }
}

export default function Lifecycle({ status }: { status: ActionStatus }) {
  const reduce = useReducedMotion();
  const { reached, outcome } = progress(status);

  function nodeTone(i: number) {
    if (i === 4 && outcome === 'slash') return 'void';
    if (i === 4 && outcome === 'refund') return 'sage';
    if (i <= reached) return 'copper';
    return 'idle';
  }

  const toneRing: Record<string, string> = {
    copper: 'border-copper bg-copper/15 text-copper',
    sage: 'border-sage bg-sage/15 text-sage',
    void: 'border-void bg-void/15 text-void',
    idle: 'border-rule bg-surface text-muted',
  };

  return (
    <ol className="grid gap-4 md:grid-cols-5 md:gap-0">
      {STEPS.map((step, i) => {
        const tone = nodeTone(i);
        const done = i <= reached || (i === 4 && outcome !== 'pending');
        return (
          <motion.li
            key={step.key}
            className="relative md:px-2"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Connecting rule (desktop). */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[calc(50%+18px)] top-[18px] hidden h-px w-[calc(100%-36px)] origin-left md:block ${
                  i < reached ? 'bg-copper/60' : 'bg-rule'
                }`}
              />
            )}
            <div className="flex items-center gap-3 md:flex-col md:gap-2 md:text-center">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-mono text-sm ${toneRing[tone]}`}
              >
                {done ? (
                  i === 4 && outcome === 'slash' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )
                ) : (
                  i + 1
                )}
              </span>
              <div className="md:mt-1">
                <p className={`text-sm font-medium ${done ? 'text-bone' : 'text-muted'}`}>
                  {step.label}
                </p>
                <p className="mt-0.5 hidden text-xs leading-snug text-muted md:block">
                  {step.note}
                </p>
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
