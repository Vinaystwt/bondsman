'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { DemoJobStatus } from '@/lib/types';

// The live challenge wait, structured. Three steps so minutes of Casper
// finality read as progress instead of a stalled spinner.
type StepState = 'done' | 'active' | 'idle';

const STEPS: { key: string; label: string; detail: string }[] = [
  {
    key: 'submitted',
    label: 'Challenge submitted',
    detail: 'The funded demo key signed a real challenge transaction.',
  },
  {
    key: 'finalizing',
    label: 'Finalizing on Casper',
    detail: 'Block finality takes a few minutes on testnet. The job is persisted; you can reload or leave.',
  },
  {
    key: 'resolved',
    label: 'Bond slashed',
    detail: 'The contract splits the bond between challenger and reserve.',
  },
];

function stepStates(status: DemoJobStatus): [StepState, StepState, StepState] {
  switch (status) {
    case 'queued':
    case 'submitting_challenge':
      return ['active', 'idle', 'idle'];
    case 'challenge_finalized':
    case 'resolving':
      return ['done', 'active', 'idle'];
    case 'resolved':
      return ['done', 'done', 'done'];
    default:
      return ['active', 'idle', 'idle'];
  }
}

export default function PendingStepper({ status }: { status: DemoJobStatus }) {
  const reduce = useReducedMotion();
  const states = stepStates(status);

  return (
    <ol className="space-y-0" aria-label="Challenge progress">
      {STEPS.map((step, i) => {
        const state = states[i];
        const isLast = i === STEPS.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Connector */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px ${
                  state === 'done' ? 'bg-accent/60' : 'bg-rule'
                }`}
              />
            )}
            {/* Node */}
            <span
              className={`relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                state === 'done'
                  ? 'border-accent bg-accent/15 text-accent'
                  : state === 'active'
                    ? 'border-accent bg-ink text-accent'
                    : 'border-rule bg-surface text-muted'
              }`}
            >
              {state === 'done' ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : state === 'active' ? (
                <motion.span
                  className="h-2 w-2 rounded-full bg-accent"
                  animate={reduce ? {} : { opacity: [1, 0.35, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-rule" />
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm font-medium ${state === 'idle' ? 'text-muted' : 'text-bone'}`}>
                {step.label}
              </p>
              {state === 'active' && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
