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
  if (!atomic) return `— ${unit}`;
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
    return `— ${unit}`;
  }
}

const ACCENT = '#35C281';
const ACCENT_DEEP = '#1C7A52';
const SLASH = '#E5484D';
const RULE = '#232A27';
const RAISED = '#18211D';
const BONE = '#E8EDEA';
const BONE_DIM = '#a4b0aa';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Continuous bonded execution animation.
 *
 * One GSAP master timeline drives the entire narrative: request, payment
 * requirement, WCSPR settlement, paid quote, bond lock, execution, delayed
 * contradiction, watchdog challenge, controller resolution, slash and receipt.
 * The timeline repeats indefinitely with a final hold on the receipt state and
 * a short soft reset back to idle.
 *
 * The whole scene lives in one SVG viewBox so packets travel along real path
 * geometry. The red contradiction packet follows the evidence connector via
 * MotionPathPlugin. Every packet, path stroke and label is animated with
 * transform and opacity only, so the layout never reflows.
 *
 * Lifecycle:
 *   - IntersectionObserver + visibilitychange pause and resume the timeline
 *     so the browser does no work when the hero is offscreen or the tab is
 *     hidden.
 *   - prefers-reduced-motion snaps to the final verified state and disables
 *     the loop.
 *   - healthMode degraded or unreachable renders a static historical state
 *     and never enters the loop.
 */
export default function BondedExecutionAnimation({
  data,
  healthMode,
  degradedReason,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const gradId = useId().replace(/:/g, '');

  const [reducedMotion, setReducedMotion] = useState(false);

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

  const shouldAnimate = healthMode === 'healthy' && !reducedMotion;

  useGSAP(
    () => {
      const scope = containerRef.current;
      if (!scope) return;
      const q = gsap.utils.selector(scope);

      // Reset every animated element to the idle state before we build. This
      // is what runs when React remounts and when the loop restarts.
      gsap.set(
        q('[data-anim="stage"], [data-anim="packet"], [data-anim="label"], [data-anim="line"]'),
        { autoAlpha: 0 },
      );
      gsap.set(q('[data-anim="line"]'), { drawSVGDuration: 0 });

      if (!shouldAnimate) {
        // Snap to the completed state: everything visible, packets at rest.
        gsap.set(
          q('[data-anim="stage"], [data-anim="label"], [data-anim="line"]'),
          { autoAlpha: 1 },
        );
        gsap.set(q('[data-role="verified-mark"]'), { autoAlpha: 1 });
        gsap.set(q('[data-role="live-pulse"]'), { autoAlpha: 0 });
        return;
      }

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 2.4,
        defaults: { ease: 'power2.out', duration: 0.55 },
      });

      timelineRef.current = tl;

      // 1. Agent request appears.
      tl.addLabel('request', 0);
      tl.to(q('[data-stage="agent"]'), { autoAlpha: 1 }, 'request');
      tl.to(q('[data-line="agent-to-gate"]'), { autoAlpha: 1, duration: 0.35 }, 'request+=0.15');

      // 2. Payment requirement + settlement.
      tl.addLabel('payment', '+=0.15');
      tl.to(q('[data-stage="payment"]'), { autoAlpha: 1 }, 'payment');
      tl.fromTo(
        q('[data-packet="payment"]'),
        { autoAlpha: 0, motionPath: { path: '#path-payment', start: 0, end: 0 } },
        {
          autoAlpha: 1,
          duration: 0.9,
          ease: 'power1.inOut',
          motionPath: { path: '#path-payment', start: 0, end: 1 },
        },
        'payment+=0.05',
      );
      tl.to(q('[data-packet="payment"]'), { autoAlpha: 0, duration: 0.2 }, '>-0.05');
      tl.to(q('[data-stage="payment"] [data-role="stage-value"]'), {
        color: ACCENT,
        duration: 0.2,
      });

      // 3. Paid quote.
      tl.addLabel('quote', '+=0.15');
      tl.to(q('[data-stage="quote"]'), { autoAlpha: 1 }, 'quote');
      tl.to(q('[data-line="payment-to-quote"]'), { autoAlpha: 1, duration: 0.25 }, 'quote');

      // 4. Bond lock.
      tl.addLabel('bond', '+=0.3');
      tl.to(q('[data-stage="bond"]'), { autoAlpha: 1 }, 'bond');
      tl.to(q('[data-line="quote-to-bond"]'), { autoAlpha: 1, duration: 0.25 }, 'bond');
      tl.fromTo(
        q('[data-role="bond-vault"]'),
        { scale: 0.7 },
        { scale: 1, duration: 0.4, transformOrigin: '50% 50%' },
        'bond+=0.05',
      );

      // 5. Execution.
      tl.addLabel('execute', '+=0.25');
      tl.to(q('[data-stage="execute"]'), { autoAlpha: 1 }, 'execute');
      tl.to(q('[data-line="bond-to-execute"]'), { autoAlpha: 1, duration: 0.25 }, 'execute');

      // 6. Delayed evidence packet enters along the evidence connector.
      tl.addLabel('evidence', '+=0.6');
      tl.to(q('[data-stage="evidence"]'), { autoAlpha: 1 }, 'evidence');
      tl.fromTo(
        q('[data-packet="evidence"]'),
        {
          autoAlpha: 0,
          motionPath: { path: '#path-evidence', start: 0, end: 0 },
        },
        {
          autoAlpha: 1,
          duration: 1.4,
          ease: 'power1.inOut',
          motionPath: { path: '#path-evidence', start: 0, end: 1 },
        },
        'evidence+=0.1',
      );
      tl.to(q('[data-packet="evidence"]'), { autoAlpha: 0, duration: 0.25 }, '>');

      // 7. Watchdog challenge.
      tl.addLabel('challenge', '+=0.05');
      tl.to(q('[data-stage="watchdog"]'), { autoAlpha: 1 }, 'challenge');
      tl.to(q('[data-line="watchdog-to-controller"]'), { autoAlpha: 1, duration: 0.35 }, 'challenge');

      // 8. Controller resolution.
      tl.addLabel('resolve', '+=0.25');
      tl.to(q('[data-stage="controller"]'), { autoAlpha: 1 }, 'resolve');
      tl.to(
        q('[data-stage="controller"] [data-role="stage-value"]'),
        { color: SLASH, duration: 0.25 },
        'resolve+=0.05',
      );

      // 9. Slash split.
      tl.addLabel('slash', '+=0.4');
      tl.to(q('[data-stage="split"]'), { autoAlpha: 1 }, 'slash');
      tl.to(q('[data-line="controller-to-split"]'), { autoAlpha: 1, duration: 0.3 }, 'slash');

      // 10. Receipt sealed and verified.
      tl.addLabel('receipt', '+=0.35');
      tl.to(q('[data-stage="receipt"]'), { autoAlpha: 1 }, 'receipt');
      tl.to(q('[data-line="controller-to-receipt"]'), { autoAlpha: 1, duration: 0.25 }, 'receipt');
      tl.to(q('[data-role="verified-mark"]'), { autoAlpha: 1, duration: 0.35 }, 'receipt+=0.2');

      // Final readable hold before the repeatDelay + soft reset.
      tl.addLabel('final', '+=1.2');
      tl.to(
        q('[data-anim="stage"], [data-anim="line"], [data-role="verified-mark"], [data-anim="label"]'),
        { autoAlpha: 0, duration: 0.6, ease: 'power1.in' },
        'final+=1.4',
      );

      return () => {
        tl.kill();
      };
    },
    { scope: containerRef, dependencies: [shouldAnimate] },
  );

  // Pause on offscreen or hidden.
  useEffect(() => {
    const el = containerRef.current;
    const tl = timelineRef.current;
    if (!el || !tl) return;

    let onScreen = false;
    let visible = document.visibilityState === 'visible';

    const evaluate = () => {
      if (onScreen && visible) {
        if (tl.paused()) tl.resume();
      } else {
        if (!tl.paused()) tl.pause();
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
  }, [shouldAnimate]);

  const summary = useMemo(
    () =>
      'Bondsman execution animation: request, payment settlement, paid quote, bond lock, action execution, delayed evidence, watchdog challenge, controller resolution, slash, split allocation and signed receipt.',
    [],
  );

  const disabledCause =
    healthMode === 'unreachable'
      ? 'Backend unavailable. Showing historical proof state.'
      : healthMode === 'degraded'
        ? degradedReason
          ? `Live execution paused. ${degradedReason}`
          : 'Live execution paused. Historical proof preserved.'
        : null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-rule bg-surface"
    >
      <div
        role="img"
        aria-label={`Bondsman bonded execution animation. ${summary}`}
        className="relative"
      >
        <svg
          viewBox="0 0 720 560"
          xmlns="http://www.w3.org/2000/svg"
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={`${gradId}-flow`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
              <stop offset="50%" stopColor={ACCENT} stopOpacity="0.8" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>

            {/* Payment path: from external agent down into the payment stage. */}
            <path
              id="path-payment"
              d="M 140 84 C 140 130 220 150 220 190"
              fill="none"
            />
            {/* Evidence path: from the buyer signer channel at the bottom into
                the watchdog, following a real curve inside the SVG. */}
            <path
              id="path-evidence"
              d="M 360 508 C 500 500 580 450 590 340"
              fill="none"
            />
          </defs>

          {/* Backdrop rectangle for the execution gate. */}
          <rect
            x={40}
            y={130}
            width={640}
            height={230}
            rx={12}
            fill={RAISED}
            stroke={RULE}
          />
          <text
            data-anim="label"
            x={56}
            y={152}
            fill={BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={11}
            letterSpacing="3"
          >
            BONDSMAN EXECUTION GATE
          </text>

          {/* External agent node */}
          <g data-anim="stage" data-stage="agent">
            <Node
              x={40}
              y={30}
              w={200}
              h={54}
              title="EXTERNAL AGENT"
              subtitle="a2a request"
            />
          </g>

          {/* Payment step */}
          <g data-anim="stage" data-stage="payment">
            <StageBox
              x={70}
              y={180}
              w={140}
              h={80}
              title="PAYMENT"
              label={paymentAmountLabel}
              hash={data?.settlementTx}
            />
          </g>

          {/* Quote step */}
          <g data-anim="stage" data-stage="quote">
            <StageBox
              x={230}
              y={180}
              w={140}
              h={80}
              title="QUOTE"
              label="paid quote"
              hash={data?.quoteHash}
            />
          </g>

          {/* Bond step */}
          <g data-anim="stage" data-stage="bond">
            <StageBox
              x={390}
              y={180}
              w={140}
              h={80}
              title="BOND"
              label={bondLabel}
              subtitle="vault locked"
              accent
            />
            <g data-role="bond-vault">
              <rect
                x={470}
                y={196}
                width={44}
                height={48}
                rx={4}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1.4}
              />
              <path
                d={`M478 218 L484 224 L508 200`}
                stroke={ACCENT}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* Execute step */}
          <g data-anim="stage" data-stage="execute">
            <StageBox
              x={550}
              y={180}
              w={130}
              h={80}
              title="EXECUTE"
              label="payout cleared"
              subtitle={data?.actionId ? `Action ${data.actionId}` : null}
            />
          </g>

          {/* Delayed evidence channel */}
          <g data-anim="stage" data-stage="evidence">
            <rect
              x={40}
              y={480}
              width={640}
              height={60}
              rx={10}
              fill={RAISED}
              stroke={RULE}
            />
            <text
              x={56}
              y={504}
              fill={BONE_DIM}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={11}
              letterSpacing="3"
            >
              DELAYED EVIDENCE CHANNEL
            </text>
            <text
              x={56}
              y={526}
              fill={BONE}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={13}
            >
              buyer signer · goods_not_received
            </text>
          </g>

          {/* Watchdog node */}
          <g data-anim="stage" data-stage="watchdog">
            <Node
              x={480}
              y={380}
              w={200}
              h={54}
              title="WATCHDOG"
              subtitle="independent · deterministic"
              slash
            />
          </g>

          {/* Controller resolution node */}
          <g data-anim="stage" data-stage="controller">
            <StageBox
              x={40}
              y={380}
              w={210}
              h={54}
              title="CONTROLLER"
              label="slash resolved"
              slash
            />
          </g>

          {/* Split allocation */}
          <g data-anim="stage" data-stage="split">
            <StageBox
              x={40}
              y={445}
              w={210}
              h={30}
              title="REWARD"
              label={rewardLabel}
              compact
            />
            <StageBox
              x={260}
              y={445}
              w={210}
              h={30}
              title="RESERVE"
              label={reserveLabel}
              compact
            />
          </g>

          {/* Portable receipt */}
          <g data-anim="stage" data-stage="receipt">
            <Node
              x={480}
              y={445}
              w={200}
              h={30}
              title="PORTABLE RECEIPT"
              subtitle="signed · verified"
              small
            />
            <g data-role="verified-mark">
              <circle cx={666} cy={460} r={9} fill={ACCENT} />
              <path
                d="M661 460 l4 4 l7 -8"
                stroke="#0B0F0D"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* Connectors */}
          <g data-anim="line" data-line="agent-to-gate">
            <path
              d="M 140 84 L 140 180"
              stroke={ACCENT}
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="4 4"
              opacity={0.6}
            />
          </g>
          <g data-anim="line" data-line="payment-to-quote">
            <path
              d="M 210 220 L 230 220"
              stroke={ACCENT}
              strokeWidth={1.5}
              fill="none"
            />
          </g>
          <g data-anim="line" data-line="quote-to-bond">
            <path
              d="M 370 220 L 390 220"
              stroke={ACCENT}
              strokeWidth={1.5}
              fill="none"
            />
          </g>
          <g data-anim="line" data-line="bond-to-execute">
            <path
              d="M 530 220 L 550 220"
              stroke={ACCENT}
              strokeWidth={1.5}
              fill="none"
            />
          </g>
          <g data-anim="line" data-line="watchdog-to-controller">
            <path
              d="M 480 405 L 250 405"
              stroke={SLASH}
              strokeWidth={1.5}
              fill="none"
            />
          </g>
          <g data-anim="line" data-line="controller-to-split">
            <path
              d="M 145 435 L 145 445"
              stroke={SLASH}
              strokeWidth={1.5}
              fill="none"
            />
          </g>
          <g data-anim="line" data-line="controller-to-receipt">
            <path
              d="M 250 460 L 480 460"
              stroke={ACCENT_DEEP}
              strokeWidth={1.2}
              fill="none"
              strokeDasharray="3 3"
              opacity={0.7}
            />
          </g>

          {/* Green settlement packet along payment path */}
          <circle
            data-anim="packet"
            data-packet="payment"
            r={5}
            fill={ACCENT}
          />
          {/* Red contradiction packet along evidence path */}
          <circle
            data-anim="packet"
            data-packet="evidence"
            r={5.5}
            fill={SLASH}
          />

          {/* Live pulse indicator inside the gate */}
          <g data-role="live-pulse">
            <circle cx={676} cy={148} r={4} fill={ACCENT}>
              {shouldAnimate && (
                <animate
                  attributeName="opacity"
                  values="0.2;1;0.2"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
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

/**
 * Rectangular node used for external actors: agent, watchdog, receipt.
 */
function Node({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  slash = false,
  small = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string | null;
  slash?: boolean;
  small?: boolean;
}) {
  const border = slash ? SLASH : ACCENT;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={RAISED}
        stroke={border}
        strokeOpacity={0.35}
      />
      <text
        x={x + 12}
        y={y + (small ? 14 : 20)}
        fill={BONE_DIM}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={small ? 9 : 10}
        letterSpacing="3"
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={x + 12}
          y={y + (small ? 26 : 40)}
          fill={BONE}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={small ? 11 : 13}
        >
          {subtitle}
        </text>
      )}
    </g>
  );
}

/**
 * Sub-stage inside the execution gate.
 */
function StageBox({
  x,
  y,
  w,
  h,
  title,
  label,
  hash,
  subtitle,
  accent = false,
  slash = false,
  compact = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  label: string;
  hash?: string | null;
  subtitle?: string | null;
  accent?: boolean;
  slash?: boolean;
  compact?: boolean;
}) {
  const border = slash ? SLASH : accent ? ACCENT : RULE;
  const labelColor = slash ? SLASH : accent ? ACCENT : BONE;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="#0f1613"
        stroke={border}
        strokeOpacity={accent || slash ? 0.55 : 0.4}
      />
      <text
        x={x + 12}
        y={y + (compact ? 12 : 18)}
        fill={BONE_DIM}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={9}
        letterSpacing="3"
      >
        {title}
      </text>
      <text
        data-role="stage-value"
        x={x + 12}
        y={y + (compact ? 24 : 40)}
        fill={labelColor}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={compact ? 11 : 13}
      >
        {label}
      </text>
      {subtitle && (
        <text
          x={x + 12}
          y={y + 58}
          fill={BONE_DIM}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={10}
        >
          {subtitle}
        </text>
      )}
      {hash && (
        <text
          x={x + 12}
          y={y + h - 8}
          fill={BONE_DIM}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={9}
        >
          {shortHash(hash)}
        </text>
      )}
    </g>
  );
}

function shortHash(h: string): string {
  const clean = h.replace(/^hash-/, '').replace(/^account-hash-/, '');
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}
