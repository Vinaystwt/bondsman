'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { CesEvent } from '@/lib/types';
import { describeEvent } from '@/lib/events';
import { truncateHash } from '@/lib/format';
import CopyHash from '@/components/ui/CopyHash';

const DOT: Record<string, string> = {
  accent: 'border-accent bg-accent/20',
  slash: 'border-slash bg-slash/20',
  muted: 'border-rule bg-surface',
};

export default function EventTimeline({ events }: { events: CesEvent[] }) {
  const reduce = useReducedMotion();

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted">
        No on-chain events recorded for this action yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 pl-6">
      <span aria-hidden="true" className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-rule" />
      {events.map((event, i) => {
        const view = describeEvent(event);
        return (
          <motion.li
            key={`${event.contract}-${event.eventIndex}-${i}`}
            className="relative"
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
          >
            <span
              aria-hidden="true"
              className={`absolute -left-6 top-1 grid h-[15px] w-[15px] place-items-center rounded-full border-2 ${DOT[view.tone]}`}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h4 className="text-sm font-semibold text-bone">{view.headline}</h4>
              <span className="serial text-[0.6rem] text-muted">{event.contract}</span>
            </div>
            {view.detail && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{view.detail}</p>
            )}
            {event.transactionHash && event.explorerLink && (
              <div className="mt-1.5">
                <CopyHash
                  value={event.transactionHash}
                  href={event.explorerLink}
                  label={`tx ${truncateHash(event.transactionHash)}`}
                />
              </div>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
