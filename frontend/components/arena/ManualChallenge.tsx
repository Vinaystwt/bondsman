'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';
import type { ActionDetail } from '@/lib/types';
import { parseEventData, serial, truncateHash, txExplorer } from '@/lib/format';
import Seal from '@/components/Seal';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { Label } from '@/components/ui/Primitives';
import Countdown from './Countdown';

type Phase = 'ready' | 'submitting' | 'pending' | 'resolved' | 'error';

function asAmount(v: unknown): string | null {
  return typeof v === 'string' && /^\d+$/.test(v) ? v : null;
}

export default function ManualChallenge({
  initial,
  onResolved,
}: {
  initial: ActionDetail;
  onResolved: () => void;
}) {
  const reduce = useReducedMotion();
  const [action, setAction] = useState<ActionDetail>(initial);
  const [phase, setPhase] = useState<Phase>(
    initial.status === 'ResolvedSlash' ? 'resolved' : 'ready',
  );
  const [challengeTx, setChallengeTx] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function challenge() {
    setPhase('submitting');
    setError('');
    try {
      const { challenge: cTx } = await clientApi.challenge(action.actionId);
      setChallengeTx(cTx ?? null);
      setPhase('pending');
      await poll();
    } catch {
      setError('The challenge could not be submitted. The backend may be busy.');
      setPhase('error');
    }
  }

  async function poll() {
    for (let i = 0; i < 40; i += 1) {
      try {
        const fresh = await clientApi.action(action.actionId);
        setAction(fresh);
        if (fresh.status === 'ResolvedSlash' || fresh.status === 'ResolvedRefund') {
          setPhase('resolved');
          onResolved();
          return;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    setPhase('resolved');
    onResolved();
  }

  const slash = action.events.find((e) => e.eventType === 'BondSlashed');
  const data = slash ? parseEventData(slash.data) : {};
  const challengerAmount = asAmount(data.challenger_amount);
  const reserveAmount = asAmount(data.pool_amount) ?? asAmount(data.reserve_amount);
  const resolvedSlash = action.status === 'ResolvedSlash';

  const sealState = phase === 'resolved' && resolvedSlash ? 'strike' : 'stamp';

  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface">
      <div className="grid gap-6 border-b border-rule p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <motion.div
          className="grid place-items-center"
          animate={
            phase === 'pending' && !reduce
              ? { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 1.6 } }
              : { scale: 1 }
          }
        >
          <Seal state={sealState} size={116} />
        </motion.div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="serial text-[0.62rem] text-muted">{serial(action.actionId)}</span>
            {phase === 'ready' && <Countdown windowEnd={action.windowEnd} />}
          </div>
          <p className="mt-2 font-mono text-3xl text-bone tabular">
            <Money atomic={action.amount} />
          </p>
          <p className="mt-1 text-sm text-muted">
            Bond at stake <Money atomic={action.bondPosted} />
          </p>
        </div>
      </div>

      <div className="p-6">
        <Label>The agent approved this payout</Label>
        <blockquote className="mt-2 border-l-2 border-rule pl-4 text-sm leading-relaxed text-bone">
          {action.reasoning?.trim()
            ? `“${action.reasoning}”`
            : 'This payout reused a claim that had already been paid. The invoice was paid once before.'}
        </blockquote>

        <p className="mt-4 rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm leading-relaxed text-bone">
          This payout is a duplicate claim. The same invoice was already paid.
          Challenging it will slash the bond.
        </p>

        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5"
            >
              <button
                type="button"
                onClick={challenge}
                className="w-full rounded-md bg-accent px-5 py-3.5 font-medium text-ink transition-colors hover:bg-accent-strong"
              >
                Challenge this payout
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                No wallet or account needed. The backend signs the challenge for you.
              </p>
            </motion.div>
          )}

          {(phase === 'submitting' || phase === 'pending') && (
            <motion.div
              key="pending"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5 space-y-3"
            >
              <p className="flex items-center gap-2 text-sm text-accent">
                <Spinner />
                {phase === 'submitting'
                  ? 'Submitting the challenge to Casper testnet'
                  : 'Waiting for the slash to confirm on-chain'}
              </p>
              {challengeTx && <TxLine label="Challenge" hash={challengeTx} />}
              <p className="text-xs text-muted">This is a real transaction. It resolves in a few seconds.</p>
            </motion.div>
          )}

          {phase === 'resolved' && (
            <BondSplit
              resolvedSlash={resolvedSlash}
              challengerAmount={challengerAmount}
              reserveAmount={reserveAmount}
              challengeTx={challengeTx ?? action.transactions.challenge ?? null}
              resolveTx={action.transactions.resolve ?? null}
              actionId={action.actionId}
              reduce={!!reduce}
            />
          )}

          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 space-y-3">
              <p className="rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm text-bone">{error}</p>
              <button
                type="button"
                onClick={challenge}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BondSplit({
  resolvedSlash,
  challengerAmount,
  reserveAmount,
  challengeTx,
  resolveTx,
  actionId,
  reduce,
}: {
  resolvedSlash: boolean;
  challengerAmount: string | null;
  reserveAmount: string | null;
  challengeTx: string | null;
  resolveTx: string | null;
  actionId: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      key="resolved"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 space-y-4"
    >
      <p className={`text-lg font-medium ${resolvedSlash ? 'text-slash' : 'text-accent'}`}>
        {resolvedSlash
          ? 'Payout challenged. Bond slashed.'
          : 'The window closed clean. The bond returned in full.'}
      </p>
      {resolvedSlash && (
        <p className="text-sm text-muted">The contract found the duplicate. The bond is gone.</p>
      )}

      {resolvedSlash && (challengerAmount || reserveAmount) && (
        <div className="grid grid-cols-2 gap-3">
          <SplitCard label="To you, the challenger" amount={challengerAmount} delay={0.05} reduce={reduce} />
          <SplitCard label="To the reserve" amount={reserveAmount} delay={0.15} reduce={reduce} />
        </div>
      )}

      <div className="space-y-2 border-t border-rule pt-3">
        {challengeTx && <TxLine label="Challenge" hash={challengeTx} />}
        {resolveTx && <TxLine label="Resolve" hash={resolveTx} />}
      </div>
      <Link
        href={`/app/actions/${actionId}`}
        className="inline-block text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
      >
        See the full action
      </Link>
    </motion.div>
  );
}

function SplitCard({
  label,
  amount,
  delay,
  reduce,
}: {
  label: string;
  amount: string | null;
  delay: number;
  reduce: boolean;
}) {
  if (!amount) return null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-md border border-rule bg-ink px-4 py-3"
    >
      <Label>{label}</Label>
      <p className="mt-1 text-lg text-bone">
        <Money atomic={amount} />
      </p>
    </motion.div>
  );
}

function TxLine({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label} transaction</span>
      <CopyHash value={hash} href={txExplorer(hash)} label={truncateHash(hash)} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
