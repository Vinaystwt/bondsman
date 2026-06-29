'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Seal from '@/components/Seal';

// The orchestrated load sequence: the seal presses in, then the thesis,
// sub line, and the path to the demo arrive in turn.
export default function Hero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: reduce ? 0 : 0.25 },
    },
  };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
      };

  return (
    <section className="relative overflow-hidden">
      {/* Faint ledger grid behind the hero. */}
      <div aria-hidden="true" className="ledger-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
        <Seal state="stamp" size={140} />
        <motion.div variants={container} initial="hidden" animate="show" className="mt-10">
          <motion.h1
            variants={item}
            className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          >
            No bond, no action.
          </motion.h1>
          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
          >
            Bondsman makes an autonomous agent stake real capital before it can
            move your money, and takes it when the agent is wrong.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demo"
              className="rounded-md border border-copper bg-copper/15 px-6 py-3 font-medium text-copper transition-colors hover:bg-copper/25"
            >
              Try the live demo
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-copper/50"
            >
              How it works
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
