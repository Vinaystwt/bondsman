'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';
import type { ActionDetail, ActionSummary } from '@/lib/types';
import { parseEventData, serial, truncateHash } from '@/lib/format';
import Seal from '@/components/Seal';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { Label } from '@/components/ui/Primitives';
import { SkeletonPanel } from '@/components/ui/States';

type Phase = 'ready' | 'submitting' | 'pending' | 'resolved' | 'error';

interface Props {
  actionId: number;
  allActions: ActionSummary[];
  onResolved: () => void;
}

export default function ChallengeRunner({ actionId, allActions, onResolved }: Props) {
  const reduce = useReducedMotion();
  const [detail, setDetail] = useState<ActionDetail | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [challengeTx, setChallengeTx] = useState<string | null>(null);
  const [resolveTx, setResolveTx] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    clientApi.action(actionId).then(setDetail).catch(() => undefined);
  }, [actionId]);

  const summary = allActions.find((a) => a.actionId === actionId);
  const duplicateOf = summary
    ? allActions.find(
        (a) => a.claimHash === summary.claimHash && a.actionId < summary.actionId,
      )
    : undefined;

  async function challenge() {
    setPhase('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? 'The challenge could not be submitted.');
        setPhase('error');
        return;
      }
      setChallengeTx(data.challenge ?? null);
      setResolveTx(data.resolve ?? null);
      setPhase('pending');
      await pollUntilResolved();
    } catch {
      setErrorMsg('The backend could not be reached.');
      setPhase('error');
    }
  }

  async function pollUntilResolved() {
    for (let i = 0; i < 30; i += 1) {
      try {
        const fresh = await clientApi.action(actionId);
        if (fresh.status === 'ResolvedSlash' || fresh.status === 'ResolvedRefund') {
          setDetail(fresh);
          setPhase('resolved');
          onResolved();
          return;
        }
        setDetail(fresh);
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 3500));
    }
    // Resolution did not land in the polling window; show what we have.
    setPhase('resolved');
    onResolved();
  }

  if (!detail) return <SkeletonPanel rows={3} />;

  const resolvedSlash = detail.status === 'ResolvedSlash';
  const slashEvent = detail.events.find((e) => e.eventType === 'BondSlashed');
  const slashData = slashEvent ? parseEventData(slashEvent.data) : {};

  const sealState =
    phase === 'resolved' && resolvedSlash
      ? 'strike'
      : phase === 'resolved'
        ? 'lift'
        : 'stamp';

  return (
    <div className="overflow-hidden rounded-md border border-rule bg-surface">
      <div className="grid place-items-center border-b border-rule bg-ink/40 py-8">
        <motion.div
          animate={
            phase === 'pending' && !reduce
              ? { scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 1.6 } }
              : { scale: 1 }
          }
        >
          <Seal state={sealState} size={150} />
        </motion.div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="serial text-[0.62rem] text-muted">{serial(detail.actionId)}</span>
            <p className="mt-1 font-display text-2xl text-bone">
              <Money atomic={detail.amount} />
            </p>
          </div>
        </div>

        {/* Plain-language cue. */}
        {duplicateOf && (
          <p className="mt-3 rounded-md border border-void/30 bg-void/5 px-4 py-3 text-sm leading-relaxed text-bone">
            This payout reuses the same claim as {serial(duplicateOf.actionId)}. The
            invoice was already paid once. Challenging it should slash the bond.
          </p>
        )}

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
                className="w-full rounded-md border border-copper bg-copper/15 px-5 py-3 font-medium text-copper transition-colors hover:bg-copper/25"
              >
                Challenge this payout
              </button>
            </motion.div>
          )}

          {(phase === 'submitting' || phase === 'pending') && (
            <motion.div
              key="pending"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-3"
            >
              <p className="flex items-center gap-2 text-sm text-copper">
                <Spinner /> {phase === 'submitting' ? 'Submitting the challenge to testnet' : 'Waiting for the slash to confirm on-chain'}
              </p>
              {challengeTx && <TxLine label="Challenge" hash={challengeTx} />}
              {resolveTx && <TxLine label="Resolve" hash={resolveTx} />}
              <p className="text-xs text-muted">
                This is a real transaction. Confirmation can take a moment.
              </p>
            </motion.div>
          )}

          {phase === 'resolved' && (
            <motion.div
              key="resolved"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-4"
            >
              <p className={`text-lg font-medium ${resolvedSlash ? 'text-void' : 'text-sage'}`}>
                {resolvedSlash ? 'Payout challenged. Bond slashed.' : 'The action held up. The bond returns in full.'}
              </p>
              {resolvedSlash && (
                <div className="grid grid-cols-2 gap-3">
                  <Split label="To you" amount={asString(slashData.challenger_amount)} />
                  <Split label="To the reserve" amount={asString(slashData.pool_amount) ?? asString(slashData.reserve_amount)} />
                </div>
              )}
              <div className="space-y-2 border-t border-rule pt-3">
                {challengeTx && <TxLine label="Challenge" hash={challengeTx} />}
                {resolveTx && <TxLine label="Resolve" hash={resolveTx} />}
              </div>
              <Link
                href={`/app/actions/${detail.actionId}`}
                className="inline-block text-sm text-copper underline decoration-rule underline-offset-4 hover:decoration-copper"
              >
                See the full action
              </Link>
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5 space-y-3"
            >
              <p className="rounded-md border border-void/30 bg-void/5 px-4 py-3 text-sm text-bone">
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={challenge}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-copper/50"
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

function asString(v: unknown): string | null {
  return typeof v === 'string' && /^\d+$/.test(v) ? v : null;
}

function Split({ label, amount }: { label: string; amount: string | null }) {
  if (!amount) return null;
  return (
    <div className="rounded-md border border-rule bg-ink px-4 py-3">
      <Label>{label}</Label>
      <p className="mt-1 text-lg text-bone">
        <Money atomic={amount} />
      </p>
    </div>
  );
}

function TxLine({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label} transaction</span>
      <CopyHash value={hash} href={`https://testnet.cspr.live/transaction/${hash}`} label={truncateHash(hash)} />
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
