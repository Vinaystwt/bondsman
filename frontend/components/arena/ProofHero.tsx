'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { DemoProofs, SlashProof } from '@/lib/types';
import { serial, truncateHash, txExplorer, accountExplorer } from '@/lib/format';
import CopyHash from '@/components/ui/CopyHash';
import Money from '@/components/ui/Money';
import CountUp from '@/components/ui/CountUp';
import { Label } from '@/components/ui/Primitives';

function half(atomic: string): string {
  try {
    return (BigInt(atomic) / 2n).toString();
  } catch {
    return '0';
  }
}

// The judge's first impression: completed, on-chain, verifiable now.
export default function ProofHero({ proofs }: { proofs: DemoProofs }) {
  const total = proofs.totals?.slashes ?? null;

  return (
    <div className="space-y-4">
      {total !== null && total > 0 && (
        <p className="text-lg leading-snug text-bone sm:text-xl">
          Bondsman has already slashed{' '}
          <span className="font-mono font-semibold text-slash tabular">
            <CountUp value={total} />
          </span>{' '}
          bonds on Casper testnet. Here is the most recent, on chain, right now.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <ProofCard
          label="Latest slash · demo key challenger"
          proof={proofs.latestManualSlash}
        />
        <ProofCard
          label="Latest slash · autonomous watchdog"
          proof={proofs.latestWatchdogSlash}
        />
      </div>
    </div>
  );
}

export function ProofCard({
  label,
  proof,
}: {
  label: string;
  proof: SlashProof | null;
}) {
  const reduce = useReducedMotion();

  if (!proof) {
    return (
      <div className="rounded-lg border border-rule bg-surface p-5 text-sm text-muted">
        No completed proof is projected yet.
      </div>
    );
  }

  const challengerShare = half(proof.bond);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-lg border border-slash/25 bg-surface p-5"
    >
      {/* Slash strike accent along the top edge */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 origin-left bg-slash"
        initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        <Link
          href={`/app/actions/${proof.actionId}`}
          className="serial text-[0.62rem] text-muted transition-colors hover:text-accent"
        >
          {serial(proof.actionId)}
        </Link>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="relative inline-block font-mono text-2xl text-bone tabular">
          <Money atomic={proof.bond} bare />
          {/* The strike itself: the bond, struck through in red */}
          <motion.span
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-0.5 w-full origin-left bg-slash"
            initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.45, delay: 0.5, ease: [0.65, 0, 0.35, 1] }}
          />
        </span>
        <span className="text-sm text-muted">csprUSD bond slashed</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-rule bg-ink px-3 py-2">
          <p className="serial text-[0.56rem] text-muted">To challenger</p>
          <p className="mt-0.5 font-mono text-sm text-accent tabular">
            <Money atomic={challengerShare} bare />
          </p>
        </div>
        <div className="rounded-md border border-rule bg-ink px-3 py-2">
          <p className="serial text-[0.56rem] text-muted">To reserve</p>
          <p className="mt-0.5 font-mono text-sm text-accent tabular">
            <Money atomic={challengerShare} bare />
          </p>
        </div>
      </div>

      {proof.challenger && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span>Challenger</span>
          <CopyHash
            value={proof.challenger}
            href={accountExplorer(proof.challenger)}
            label={truncateHash(proof.challenger)}
          />
        </div>
      )}

      <div className="mt-3 space-y-1.5 border-t border-rule pt-3 text-sm">
        {proof.challengeTx && <ProofTx label="Challenge" hash={proof.challengeTx} />}
        {proof.resolveTx && <ProofTx label="Resolve" hash={proof.resolveTx} />}
      </div>
    </motion.div>
  );
}

function ProofTx({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <CopyHash value={hash} href={txExplorer(hash)} label={truncateHash(hash)} />
    </div>
  );
}
