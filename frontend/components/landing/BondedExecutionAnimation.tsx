'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(MotionPathPlugin, useGSAP);
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

const SCALE = 10n ** 9n;

function toShort(atomic: string | null, unit: string, digits = 0): string {
  if (!atomic) return `${unit} unavailable`;
  try {
    const v = BigInt(atomic);
    const whole = v / SCALE;
    const frac = Number(v % SCALE) / Number(SCALE);
    const n = Number(whole) + frac;
    return `${n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    })} ${unit}`;
  } catch {
    return `${unit} unavailable`;
  }
}

const ACCENT = '#B7791F';
const ACCENT_DEEP = '#6E4814';
const SLASH = '#E0231C';
const RULE = '#2A2620';
const RAISED = '#1C1913';
const BONE = '#ECE6D8';
const BONE_DIM = '#A59C8A';
const INK = '#0E0D0B';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Product loop animation for the homepage hero.
 *
 * The timeline runs once, keeps the final consequence visible and can be
 * replayed manually. Offscreen and hidden tabs pause the active timeline.
 */
export default function BondedExecutionAnimation({
  data,
  healthMode,
  degradedReason,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const idPrefix = useId().replace(/:/g, '');
  const paymentPathId = `${idPrefix}-path-payment`;
  const evidencePathId = `${idPrefix}-path-evidence`;

  const [reducedMotion, setReducedMotion] = useState(false);
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const paymentAmountLabel = toShort(
    data?.paymentAmountBase ?? null,
    'WCSPR',
    3,
  );
  const bondLabel = toShort(data?.bondBase ?? null, 'csprUSD', 0);
  const rewardLabel = toShort(data?.challengerRewardBase ?? null, 'csprUSD', 0);
  const reserveLabel = toShort(data?.reserveCreditBase ?? null, 'csprUSD', 0);

  const shouldAnimate = !reducedMotion;

  useGSAP(
    () => {
      const scope = containerRef.current;
      if (!scope) return;
      const q = gsap.utils.selector(scope);

      timelineRef.current?.kill();
      timelineRef.current = null;

      gsap.set(q('[data-anim="node"], [data-anim="line"], [data-anim="packet"]'), {
        autoAlpha: 0,
      });
      gsap.set(q('[data-role="consequence-total"]'), { scale: 0.96 });
      gsap.set(q('[data-role="state-label"]'), { textContent: 'Preparing bond' });

      if (!shouldAnimate) {
        gsap.set(q('[data-anim="node"], [data-anim="line"]'), { autoAlpha: 1 });
        gsap.set(q('[data-role="state-label"]'), { textContent: 'Receipt verified' });
        gsap.set(q('[data-role="consequence-total"]'), { scale: 1 });
        setIsRunning(false);
        return;
      }

      setIsRunning(true);

      const tl = gsap.timeline({
        defaults: { duration: 0.42, ease: 'power2.out' },
        onComplete: () => {
          setIsRunning(false);
          gsap.set(q('[data-role="state-label"]'), { textContent: 'Receipt verified' });
        },
      });

      timelineRef.current = tl;

      tl.to(q('[data-stage="intent"]'), { autoAlpha: 1 }, 0);
      tl.to(q('[data-stage="bond"]'), { autoAlpha: 1 }, '+=0.18');
      tl.to(q('[data-line="intent-bond"]'), { autoAlpha: 1, duration: 0.25 }, '<');
      tl.fromTo(
        q('[data-packet="payment"]'),
        {
          autoAlpha: 0,
          motionPath: { path: `#${paymentPathId}`, start: 0, end: 0 },
        },
        {
          autoAlpha: 1,
          duration: 0.85,
          ease: 'power1.inOut',
          motionPath: { path: `#${paymentPathId}`, start: 0, end: 1 },
        },
        '<',
      );
      tl.to(q('[data-packet="payment"]'), { autoAlpha: 0, duration: 0.12 }, '>');
      tl.set(q('[data-role="state-label"]'), { textContent: 'Bond locked' });

      tl.to(q('[data-stage="execute"]'), { autoAlpha: 1 }, '+=0.15');
      tl.to(q('[data-line="bond-execute"]'), { autoAlpha: 1, duration: 0.25 }, '<');
      tl.set(q('[data-role="state-label"]'), { textContent: 'Action executed' });

      tl.to(q('[data-stage="evidence"]'), { autoAlpha: 1 }, '+=0.34');
      tl.to(q('[data-line="execute-evidence"]'), { autoAlpha: 1, duration: 0.25 }, '<');
      tl.fromTo(
        q('[data-packet="evidence"]'),
        {
          autoAlpha: 0,
          motionPath: { path: `#${evidencePathId}`, start: 0, end: 0 },
        },
        {
          autoAlpha: 1,
          duration: 0.95,
          ease: 'power1.inOut',
          motionPath: { path: `#${evidencePathId}`, start: 0, end: 1 },
        },
        '<',
      );
      tl.to(q('[data-packet="evidence"]'), { autoAlpha: 0, duration: 0.14 }, '>');
      tl.set(q('[data-role="state-label"]'), { textContent: 'Failure proven' });

      tl.to(q('[data-stage="watchdog"]'), { autoAlpha: 1 }, '+=0.06');
      tl.to(q('[data-line="evidence-watchdog"]'), { autoAlpha: 1, duration: 0.25 }, '<');
      tl.set(q('[data-role="state-label"]'), { textContent: 'Watchdog challenged' });

      tl.to(q('[data-stage="consequence"]'), { autoAlpha: 1 }, '+=0.22');
      tl.to(q('[data-line="watchdog-consequence"]'), { autoAlpha: 1, duration: 0.25 }, '<');
      tl.to(
        q('[data-role="consequence-total"]'),
        { scale: 1, transformOrigin: '50% 50%', duration: 0.28 },
        '<',
      );
      tl.set(q('[data-role="state-label"]'), { textContent: 'Bond slashed' });

      tl.to(q('[data-stage="receipt"]'), { autoAlpha: 1 }, '+=0.2');
      tl.to(q('[data-line="consequence-receipt"]'), { autoAlpha: 1, duration: 0.25 }, '<');
      tl.set(q('[data-role="state-label"]'), { textContent: 'Receipt verified' });

      return () => {
        tl.kill();
      };
    },
    {
      scope: containerRef,
      dependencies: [shouldAnimate, runId, paymentPathId, evidencePathId],
    },
  );

  useEffect(() => {
    const el = containerRef.current;
    const tl = timelineRef.current;
    if (!el || !tl || !shouldAnimate) return;

    let onScreen = false;
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
      { threshold: 0.15 },
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

  const summary = useMemo(
    () =>
      'Bondsman lifecycle animation: intent, bond, execute, evidence, watchdog, consequence and signed receipt.',
    [],
  );

  const disabledCause =
    healthMode === 'unreachable'
      ? 'Backend unavailable. Showing historical proof state.'
      : healthMode === 'degraded'
        ? degradedReason
          ? `Live execution paused. ${degradedReason}`
          : 'Live execution paused. Historical proof preserved.'
        : reducedMotion
          ? 'Motion reduced. Showing final proof state.'
          : null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-rule bg-surface"
    >
      <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
        <div>
          <p className="serial text-[0.62rem] text-muted">ACTION LOOP</p>
          <p className="mt-1 text-sm font-medium text-bone">
            Economic consequence before autonomy
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRunId((current) => current + 1)}
          className="min-h-10 rounded-md border border-rule px-3 py-2 text-sm text-bone transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!shouldAnimate || isRunning}
        >
          Replay
        </button>
      </div>

      <div
        role="img"
        aria-label={`Bondsman bonded execution animation. ${summary}`}
        className="relative"
      >
        <svg
          viewBox="0 0 720 520"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <path
              id={paymentPathId}
              d="M 122 156 C 170 126 236 126 286 156"
              fill="none"
            />
            <path
              id={evidencePathId}
              d="M 432 252 C 480 292 508 340 518 386"
              fill="none"
            />
          </defs>

          <rect
            x={24}
            y={24}
            width={672}
            height={472}
            rx={12}
            fill={INK}
            stroke={RULE}
          />
          <path
            d="M 48 82 H 672 M 48 438 H 672"
            stroke={RULE}
            strokeDasharray="4 8"
            opacity={0.7}
          />

          <text
            x={48}
            y={58}
            fill={BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={10}
            letterSpacing="3"
          >
            BONDED ACTION {data?.actionId ? `NO. ${data.actionId}` : 'NO. 0027'}
          </text>
          <text
            data-role="state-label"
            x={520}
            y={58}
            fill={ACCENT}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={11}
            textAnchor="end"
          >
            Preparing bond
          </text>

          <FlowLine
            name="intent-bond"
            d="M 158 158 C 196 140 246 140 284 158"
          />
          <FlowLine
            name="bond-execute"
            d="M 410 158 C 448 140 498 140 536 158"
          />
          <FlowLine
            name="execute-evidence"
            d="M 592 208 C 560 232 518 246 458 250"
          />
          <FlowLine
            name="evidence-watchdog"
            d="M 396 306 C 430 344 472 372 518 390"
            slash
          />
          <FlowLine
            name="watchdog-consequence"
            d="M 460 412 C 394 426 328 426 262 412"
            slash
          />
          <FlowLine
            name="consequence-receipt"
            d="M 244 392 C 298 346 370 330 444 342"
          />

          <g data-anim="node" data-stage="intent">
            <LoopNode
              x={64}
              y={116}
              w={96}
              h={84}
              title="INTENT"
              value="agent asks"
              detail="money move"
            />
          </g>

          <g data-anim="node" data-stage="bond">
            <LoopNode
              x={284}
              y={116}
              w={132}
              h={84}
              title="BOND"
              value={bondLabel}
              detail="locked first"
              accent
            />
          </g>

          <g data-anim="node" data-stage="execute">
            <LoopNode
              x={536}
              y={116}
              w={120}
              h={84}
              title="EXECUTE"
              value="authorized"
              detail={paymentAmountLabel}
            />
          </g>

          <g data-anim="node" data-stage="evidence">
            <LoopNode
              x={336}
              y={228}
              w={126}
              h={84}
              title="EVIDENCE"
              value="failure proof"
              detail={data?.quoteHash ? shortHash(data.quoteHash) : 'signed buyer'}
              slash
            />
          </g>

          <g data-anim="node" data-stage="watchdog">
            <LoopNode
              x={516}
              y={368}
              w={130}
              h={78}
              title="WATCHDOG"
              value="challenge"
              detail={data?.watchdogChallengeTx ? shortHash(data.watchdogChallengeTx) : 'objective rule'}
              slash
            />
          </g>

          <g data-anim="node" data-stage="consequence">
            <rect
              x={76}
              y={356}
              width={188}
              height={106}
              rx={8}
              fill={RAISED}
              stroke={SLASH}
              strokeOpacity={0.64}
            />
            <text
              x={94}
              y={382}
              fill={BONE_DIM}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={10}
              letterSpacing="3"
            >
              CONSEQUENCE
            </text>
            <text
              data-role="consequence-total"
              x={94}
              y={411}
              fill={SLASH}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={17}
              fontWeight={700}
            >
              bond slashed
            </text>
            <text
              x={94}
              y={436}
              fill={BONE}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={11}
            >
              reward {rewardLabel}
            </text>
            <text
              x={94}
              y={452}
              fill={BONE_DIM}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={10}
            >
              reserve {reserveLabel}
            </text>
          </g>

          <g data-anim="node" data-stage="receipt">
            <rect
              x={440}
              y={304}
              width={180}
              height={74}
              rx={8}
              fill={RAISED}
              stroke={ACCENT}
              strokeOpacity={0.55}
            />
            <text
              x={458}
              y={329}
              fill={BONE_DIM}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={10}
              letterSpacing="3"
            >
              RECEIPT
            </text>
            <text
              x={458}
              y={354}
              fill={ACCENT}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={14}
            >
              signed and verified
            </text>
            <circle cx={598} cy={328} r={11} fill={ACCENT} />
            <path
              d="M592 328 l4 4 l8 -9"
              stroke={INK}
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          <circle
            data-anim="packet"
            data-packet="payment"
            r={5}
            fill={ACCENT}
          />
          <circle
            data-anim="packet"
            data-packet="evidence"
            r={5.5}
            fill={SLASH}
          />
        </svg>
      </div>

      {disabledCause && (
        <div className="border-t border-rule bg-ink px-4 py-2 text-xs text-muted">
          {disabledCause}
        </div>
      )}
    </div>
  );
}

function FlowLine({
  name,
  d,
  slash = false,
}: {
  name: string;
  d: string;
  slash?: boolean;
}) {
  return (
    <path
      data-anim="line"
      data-line={name}
      d={d}
      stroke={slash ? SLASH : ACCENT_DEEP}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeDasharray={slash ? '5 5' : '4 6'}
      fill="none"
      opacity={0.74}
    />
  );
}

function LoopNode({
  x,
  y,
  w,
  h,
  title,
  value,
  detail,
  accent = false,
  slash = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  value: string;
  detail?: string | null;
  accent?: boolean;
  slash?: boolean;
}) {
  const border = slash ? SLASH : accent ? ACCENT : RULE;
  const valueColor = slash ? SLASH : accent ? ACCENT : BONE;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={RAISED}
        stroke={border}
        strokeOpacity={accent || slash ? 0.6 : 0.48}
      />
      <text
        x={x + 14}
        y={y + 25}
        fill={BONE_DIM}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={10}
        letterSpacing="3"
      >
        {title}
      </text>
      <text
        x={x + 14}
        y={y + 50}
        fill={valueColor}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={13}
      >
        {value}
      </text>
      {detail && (
        <text
          x={x + 14}
          y={y + 68}
          fill={BONE_DIM}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={10}
        >
          {detail}
        </text>
      )}
    </g>
  );
}

function shortHash(h: string): string {
  const clean = h.replace(/^hash-/, '').replace(/^account-hash-/, '');
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}
