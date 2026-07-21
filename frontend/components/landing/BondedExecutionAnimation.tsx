'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CANONICAL_ACTION_27_PROOF } from '@/lib/canonical-action-27-fallback';
import { formatMoney, formatWcspr, truncateHash } from '@/lib/format';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

interface CanonicalAnimationData {
  actionId: string;
  paymentAmountBase: string;
  settlementTx: string | null;
  quoteHash: string | null;
  bondBase: string;
  challengerRewardBase: string;
  reserveCreditBase: string;
  watchdogChallengeTx: string | null;
  resolveTx: string | null;
}

export type HealthMode = 'healthy' | 'degraded' | 'unreachable';

interface Props {
  data: CanonicalAnimationData | null;
  healthMode: HealthMode;
  degradedReason?: string | null;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function fallbackAnimationData(): CanonicalAnimationData {
  const proof = CANONICAL_ACTION_27_PROOF;
  return {
    actionId: proof.actionId,
    paymentAmountBase: proof.payment?.paymentAmount ?? '100000000',
    settlementTx: proof.payment?.settlementTransaction ?? null,
    quoteHash: proof.paidQuote?.quoteHash ?? null,
    bondBase: proof.bond,
    challengerRewardBase: proof.economicImpact.challengerReward,
    reserveCreditBase: proof.economicImpact.reserveCredit,
    watchdogChallengeTx:
      proof.timeline.find((s) => s.stage === 'challenge')?.txHash ?? null,
    resolveTx: proof.timeline.find((s) => s.stage === 'resolve')?.txHash ?? null,
  };
}

function shortOrLabel(value: string | null, fallback: string): string {
  return value ? truncateHash(value) : fallback;
}

export default function BondedExecutionAnimation({
  data,
  healthMode,
  degradedReason,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState('Complete mechanism');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const display = useMemo(() => data ?? fallbackAnimationData(), [data]);
  const usingFallback = !data || healthMode !== 'healthy';
  const shouldAnimate = healthMode === 'healthy' && !reducedMotion;

  const stages = useMemo(
    () => [
      {
        key: 'intent',
        eyebrow: 'INTENT',
        title: 'Agent asks to move money',
        metric: 'invoice payout',
        body: 'The request is priced before the agent can execute.',
        tone: 'neutral' as const,
      },
      {
        key: 'gate',
        eyebrow: 'BONDED GATE',
        title: 'Quote paid, payer bound, bond locked',
        metric: formatMoney(display.bondBase),
        body: `Action No. ${display.actionId.padStart(4, '0')} cannot continue without collateral.`,
        tone: 'accent' as const,
      },
      {
        key: 'execution',
        eyebrow: 'EXECUTION',
        title: 'Authorized action runs',
        metric: formatWcspr(display.paymentAmountBase),
        body: `Settlement ${shortOrLabel(display.settlementTx, 'recorded on Casper')}.`,
        tone: 'neutral' as const,
      },
      {
        key: 'evidence',
        eyebrow: 'EVIDENCE',
        title: 'Buyer contradiction arrives',
        metric: shortOrLabel(display.quoteHash, 'signed evidence'),
        body: 'Delivery failure is objectively verifiable during the window.',
        tone: 'slash' as const,
      },
      {
        key: 'watchdog',
        eyebrow: 'WATCHDOG',
        title: 'Independent challenge',
        metric: shortOrLabel(display.watchdogChallengeTx, 'challenge filed'),
        body: 'The watchdog submits the evidence to the controller.',
        tone: 'slash' as const,
      },
      {
        key: 'consequence',
        eyebrow: 'BOND CONSEQUENCE',
        title: 'Bond slashed',
        metric: `Reward ${formatMoney(display.challengerRewardBase)}`,
        body: `Reserve credit ${formatMoney(display.reserveCreditBase)}.`,
        tone: 'slash' as const,
      },
      {
        key: 'receipt',
        eyebrow: 'RECEIPT',
        title: 'Signed proof issued',
        metric: shortOrLabel(display.resolveTx, 'receipt verified'),
        body: 'Portable evidence preserves the complete outcome.',
        tone: 'accent' as const,
      },
    ],
    [display],
  );

  useEffect(() => {
    if (healthMode === 'healthy' && !reducedMotion) {
      setStatusText('Live backend connected. Replaying verified mechanism.');
      return;
    }
    if (reducedMotion) {
      setStatusText('Motion reduced. Showing complete final state.');
      return;
    }
    if (healthMode === 'degraded') {
      setStatusText(
        degradedReason
          ? `Cached Action 27 evidence shown. ${degradedReason}`
          : 'Cached Action 27 evidence shown while live service recovers.',
      );
      return;
    }
    setStatusText('Cached Action 27 evidence shown while live service recovers.');
  }, [degradedReason, healthMode, reducedMotion]);

  useGSAP(
    () => {
      const scope = containerRef.current;
      if (!scope) return;
      const q = gsap.utils.selector(scope);

      timelineRef.current?.kill();
      timelineRef.current = null;

      gsap.set(q('[data-step]'), { autoAlpha: 1, y: 0, scale: 1 });
      gsap.set(q('[data-connector]'), { autoAlpha: 1, scaleX: 1 });
      gsap.set(q('[data-pulse]'), { autoAlpha: 1, scale: 1 });

      if (!shouldAnimate) {
        setIsRunning(false);
        return;
      }

      const tl = gsap.timeline({
        defaults: { duration: 0.36, ease: 'power2.out' },
        onStart: () => setIsRunning(true),
        onComplete: () => {
          setStatusText('Receipt verified. Final consequence held on screen.');
          setIsRunning(false);
        },
      });

      timelineRef.current = tl;

      gsap.set(q('[data-step]'), { autoAlpha: 0.38, y: 8 });
      gsap.set(q('[data-step="gate"]'), { autoAlpha: 0.58, y: 0 });
      gsap.set(q('[data-connector]'), {
        autoAlpha: 0,
        scaleX: 0.18,
        transformOrigin: 'left center',
      });
      gsap.set(q('[data-pulse]'), { autoAlpha: 0, scale: 0.78 });

      const setState = (text: string) => {
        tl.call(() => setStatusText(text));
      };

      setState('Intent priced.');
      tl.to(q('[data-step="intent"]'), { autoAlpha: 1, y: 0 }, 0);
      tl.to(q('[data-connector="intent-gate"]'), { autoAlpha: 1, scaleX: 1 }, '+=0.1');
      setState('Bond locked before execution.');
      tl.to(q('[data-step="gate"]'), { autoAlpha: 1, scale: 1.01 }, '<');
      tl.to(q('[data-pulse="gate"]'), { autoAlpha: 1, scale: 1 }, '<');
      tl.to(q('[data-step="gate"]'), { scale: 1, duration: 0.18 }, '>');
      tl.to(q('[data-connector="gate-execution"]'), { autoAlpha: 1, scaleX: 1 }, '+=0.06');
      setState('Execution allowed through the bonded gate.');
      tl.to(q('[data-step="execution"]'), { autoAlpha: 1, y: 0 }, '<');
      tl.to(q('[data-connector="execution-evidence"]'), { autoAlpha: 1, scaleX: 1 }, '+=0.14');
      setState('Contradiction evidence received.');
      tl.to(q('[data-step="evidence"]'), { autoAlpha: 1, y: 0 }, '<');
      tl.to(q('[data-connector="evidence-watchdog"]'), { autoAlpha: 1, scaleX: 1 }, '+=0.08');
      setState('Watchdog challenge filed.');
      tl.to(q('[data-step="watchdog"]'), { autoAlpha: 1, y: 0 }, '<');
      tl.to(q('[data-connector="watchdog-consequence"]'), { autoAlpha: 1, scaleX: 1 }, '+=0.08');
      setState('Bond consequence settled.');
      tl.to(q('[data-step="consequence"]'), { autoAlpha: 1, y: 0, scale: 1.01 }, '<');
      tl.to(q('[data-step="consequence"]'), { scale: 1, duration: 0.18 }, '>');
      tl.to(q('[data-connector="consequence-receipt"]'), { autoAlpha: 1, scaleX: 1 }, '+=0.06');
      setState('Receipt signed.');
      tl.to(q('[data-step="receipt"]'), { autoAlpha: 1, y: 0 }, '<');

      return () => {
        tl.kill();
        setIsRunning(false);
      };
    },
    { scope: containerRef, dependencies: [shouldAnimate, runId, display] },
  );

  useEffect(() => {
    const el = containerRef.current;
    const tl = timelineRef.current;
    if (!el || !tl || !shouldAnimate) return;

    let onScreen = true;
    let visible = document.visibilityState === 'visible';

    const evaluate = () => {
      if (tl.progress() >= 1) return;
      if (onScreen && visible) {
        if (tl.paused()) tl.resume();
      } else if (!tl.paused()) {
        tl.pause();
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? false;
        evaluate();
      },
      { threshold: 0.2 },
    );
    io.observe(el);

    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      evaluate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shouldAnimate, runId]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-rule bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <p className="text-[0.68rem] font-medium uppercase text-muted">
            Action loop
          </p>
          <p className="mt-1 text-sm font-medium text-bone">
            Intent to consequence, with the bond as the gate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRunId((current) => current + 1)}
          className="min-h-10 rounded-md border border-rule px-4 py-2 text-sm text-bone transition-colors duration-150 ease-out hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!shouldAnimate || isRunning}
          aria-label="Replay the bonded execution animation"
        >
          Replay
        </button>
      </div>

      <div
        role="img"
        aria-label="Bondsman mechanism: intent, bonded gate, execution, evidence, watchdog, bond consequence and receipt."
        className="relative p-4 sm:p-5"
      >
        <div className="hidden min-h-[40rem] xl:block">
          <svg
            aria-hidden="true"
            viewBox="0 0 880 560"
            className="pointer-events-none absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)]"
            preserveAspectRatio="none"
          >
            <path
              data-connector="intent-gate"
              d="M 210 142 H 336"
              stroke="currentColor"
              className="text-accent-deep"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 7"
              fill="none"
            />
            <path
              data-connector="gate-execution"
              d="M 544 142 H 670"
              stroke="currentColor"
              className="text-accent-deep"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 7"
              fill="none"
            />
            <path
              data-connector="execution-evidence"
              d="M 730 208 C 692 286 606 324 500 324"
              stroke="currentColor"
              className="text-slash"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4 8"
              fill="none"
            />
            <path
              data-connector="evidence-watchdog"
              d="M 390 356 C 334 414 270 444 194 444"
              stroke="currentColor"
              className="text-slash"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4 8"
              fill="none"
            />
            <path
              data-connector="watchdog-consequence"
              d="M 288 444 H 408"
              stroke="currentColor"
              className="text-slash"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4 8"
              fill="none"
            />
            <path
              data-connector="consequence-receipt"
              d="M 568 444 H 692"
              stroke="currentColor"
              className="text-accent-deep"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="5 7"
              fill="none"
            />
          </svg>

          <div className="relative grid min-h-[40rem] grid-cols-[1fr_1.28fr_1fr] grid-rows-[12rem_12rem_12rem] gap-6">
            <MechanismCard stage={stages[0]} className="self-center" />
            <GateCard stage={stages[1]} />
            <MechanismCard stage={stages[2]} className="self-center" />
            <MechanismCard
              stage={stages[3]}
              className="col-start-2 row-start-2 self-center"
            />
            <MechanismCard stage={stages[4]} className="row-start-3 self-center" />
            <MechanismCard
              stage={stages[5]}
              className="col-start-2 row-start-3 self-center"
            />
            <MechanismCard
              stage={stages[6]}
              className="col-start-3 row-start-3 self-center"
            />
          </div>
        </div>

        <ol className="space-y-3 xl:hidden">
          {stages.map((stage, index) => (
            <li key={stage.key} className="relative pl-6">
              {index < stages.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[0.42rem] top-7 h-[calc(100%+0.75rem)] w-px ${
                    index >= 2 ? 'bg-slash/45' : 'bg-accent-deep/70'
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-5 h-3.5 w-3.5 rounded-full border ${
                  stage.tone === 'slash'
                    ? 'border-slash bg-slash/20'
                    : stage.tone === 'accent'
                      ? 'border-accent bg-accent/20'
                      : 'border-rule bg-raised'
                }`}
              />
              {stage.key === 'gate' ? (
                <GateCard stage={stage} compact />
              ) : (
                <MechanismCard stage={stage} />
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-ink px-4 py-3 text-xs sm:px-5">
        <p aria-live="polite" className="text-muted">
          {statusText}
        </p>
        <span className="rounded border border-rule bg-surface px-2.5 py-1 font-mono text-[0.66rem] uppercase text-muted">
          {usingFallback ? 'cached verified evidence' : 'live projection'}
        </span>
      </div>
    </div>
  );
}

type StageCard = {
  key: string;
  eyebrow: string;
  title: string;
  metric: string;
  body: string;
  tone: 'neutral' | 'accent' | 'slash';
};

function MechanismCard({
  stage,
  className = '',
}: {
  stage: StageCard;
  className?: string;
}) {
  const border =
    stage.tone === 'slash'
      ? 'border-slash/45'
      : stage.tone === 'accent'
        ? 'border-accent/45'
        : 'border-rule';
  const metric =
    stage.tone === 'slash'
      ? 'text-slash'
      : stage.tone === 'accent'
        ? 'text-accent'
        : 'text-bone';

  return (
    <article
      data-step={stage.key}
      className={`min-h-[9.5rem] rounded-md border ${border} bg-raised p-4 ${className}`}
    >
      <p className="text-[0.68rem] font-medium uppercase text-muted">
        {stage.eyebrow}
      </p>
      <h3 className="mt-2 text-base font-semibold leading-snug text-bone">
        {stage.title}
      </h3>
      <p className={`mt-3 break-words font-mono text-sm tabular ${metric}`}>
        {stage.metric}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{stage.body}</p>
    </article>
  );
}

function GateCard({
  stage,
  compact = false,
}: {
  stage: StageCard;
  compact?: boolean;
}) {
  return (
    <article
      data-step={stage.key}
      className={`relative overflow-hidden rounded-md border border-accent/65 bg-ink p-5 ${
        compact ? 'min-h-[12rem]' : 'min-h-[13rem]'
      }`}
    >
      <div
        data-pulse="gate"
        aria-hidden="true"
        className="absolute right-4 top-4 h-16 w-16 rounded-full border border-accent/40"
      />
      <div className="relative">
        <p className="text-[0.68rem] font-medium uppercase text-accent">
          {stage.eyebrow}
        </p>
        <h3 className="mt-3 text-xl font-semibold leading-tight text-bone sm:text-2xl">
          {stage.title}
        </h3>
        <p className="mt-4 break-words font-mono text-lg font-semibold text-accent tabular">
          {stage.metric}
        </p>
        <p className="mt-4 max-w-[26rem] text-sm leading-relaxed text-muted">
          {stage.body}
        </p>
      </div>
    </article>
  );
}
