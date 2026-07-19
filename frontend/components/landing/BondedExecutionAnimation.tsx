'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { truncateHash } from '@/lib/format';

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

/** 9-decimal base-unit → short display. Local to keep the file self-contained. */
function toShort(atomic: string | null, unit: string, digits = 0): string {
  if (!atomic) return `— ${unit}`;
  try {
    const v = BigInt(atomic);
    const scale = 10n ** 9n;
    const whole = v / scale;
    const frac = Number(v % scale) / Number(scale);
    const n = Number(whole) + frac;
    return `${n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    })} ${unit}`;
  } catch {
    return `— ${unit}`;
  }
}

const TIMINGS = [
  650, // 1 request received
  700, // 2 402 payment required
  800, // 3 WCSPR settled
  850, // 4 quote issued
  850, // 5 bond locked
  700, // 6 action executed
  850, // 7 evidence arrived
  800, // 8 watchdog challenge
  750, // 9 controller resolved
  850, // 10 bond slashed
  900, // 11 split allocated
  850, // 12 receipt verified
];
const FINAL = TIMINGS.length;

const STAGE_LABELS = [
  'Idle',
  'Request received',
  '402 payment required',
  'WCSPR settled',
  'Quote issued',
  'Bond locked',
  'Action executed',
  'Evidence arrived',
  'Watchdog challenge',
  'Resolved',
  'Bond slashed',
  'Split allocated',
  'Receipt verified',
];

const ACCENT = '#35C281';
const ACCENT_DEEP = '#1C7A52';
const SLASH = '#E5484D';
const MUTED = '#4c5b56';
const RULE = '#232A27';
const RAISED = '#18211D';
const BONE = '#E8EDEA';
const BONE_DIM = '#a4b0aa';

export default function BondedExecutionAnimation({
  data,
  healthMode,
  degradedReason,
}: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const startedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const gradId = useId();

  const play = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (reduce || healthMode !== 'healthy') {
      setPhase(FINAL);
      return;
    }
    let acc = 0;
    TIMINGS.forEach((dt, i) => {
      acc += dt;
      const id = window.setTimeout(() => setPhase(i + 1), acc);
      timeoutsRef.current.push(id);
    });
  }, [reduce, healthMode]);

  const replay = useCallback(() => {
    if (reduce || healthMode !== 'healthy') return;
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
    setPhase(0);
    startedRef.current = false;
    window.setTimeout(() => play(), 60);
  }, [play, reduce, healthMode]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (reduce || healthMode !== 'healthy') {
      setPhase(FINAL);
      startedRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            play();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [play, reduce, healthMode]);

  // Visibility flags derived from phase.
  const on = (n: number) => phase >= n;
  const done = phase >= FINAL;

  const paymentActive = on(2);
  const settled = on(3);
  const quoteActive = on(4);
  const bondActive = on(5);
  const executeActive = on(6);
  const evidenceActive = on(7);
  const watchdogActive = on(8);
  const resolvedActive = on(9);
  const slashActive = on(10);
  const splitActive = on(11);
  const receiptVerified = on(12);

  const summary = useMemo(
    () =>
      `Bondsman execution sequence: ${STAGE_LABELS.slice(1).join(', ')}. Ends in receipt verified.`,
    [],
  );

  const paymentAmountLabel = toShort(
    data?.paymentAmountBase ?? null,
    'WCSPR',
    3,
  );
  const bondLabel = toShort(data?.bondBase ?? null, 'csprUSD', 0);
  const rewardLabel = toShort(data?.challengerRewardBase ?? null, 'csprUSD', 0);
  const reserveLabel = toShort(data?.reserveCreditBase ?? null, 'csprUSD', 0);

  const disabledCause =
    healthMode === 'unreachable'
      ? 'Backend unreachable · showing cached historical proof'
      : healthMode === 'degraded'
      ? degradedReason
        ? `Execution paused · ${degradedReason}`
        : 'Execution paused · historical proof preserved'
      : null;

  return (
    <div
      ref={rootRef}
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
            <marker
              id={`${gradId}-arrow`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L6,4 L0,8 z" fill={ACCENT} />
            </marker>
            <marker
              id={`${gradId}-arrow-slash`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L6,4 L0,8 z" fill={SLASH} />
            </marker>
            <marker
              id={`${gradId}-arrow-muted`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L6,4 L0,8 z" fill={MUTED} />
            </marker>
          </defs>

          {/* External agent */}
          <Node
            x={40}
            y={24}
            w={200}
            h={54}
            title="EXTERNAL AGENT"
            subtitle="a2a request"
            active={on(1)}
          />

          {/* Bondsman Execution Gate outer */}
          <rect
            x={40}
            y={110}
            width={640}
            height={230}
            rx={10}
            fill={RAISED}
            stroke={RULE}
          />
          <text
            x={56}
            y={132}
            fill={BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={11}
            letterSpacing="3"
          >
            BONDSMAN EXECUTION GATE
          </text>

          {/* Downstream connector: agent -> gate */}
          <motion.path
            d="M 140 78 L 140 108"
            stroke={ACCENT}
            strokeWidth={2}
            fill="none"
            markerEnd={`url(#${gradId}-arrow)`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              on(1)
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Four stage pills inside gate */}
          <StagePill
            x={64}
            y={158}
            w={130}
            h={62}
            title="PAYMENT"
            status={
              settled
                ? 'settled'
                : paymentActive
                ? 'active'
                : 'idle'
            }
            valueLine={settled ? paymentAmountLabel : '402 required'}
            hashLine={settled ? shortHash(data?.settlementTx ?? null) : null}
          />
          <StagePill
            x={210}
            y={158}
            w={130}
            h={62}
            title="QUOTE"
            status={quoteActive ? 'settled' : 'idle'}
            valueLine={quoteActive ? 'paid quote' : 'awaiting settlement'}
            hashLine={quoteActive ? shortHash(data?.quoteHash ?? null) : null}
          />
          <StagePill
            x={356}
            y={158}
            w={130}
            h={62}
            title="BOND"
            status={bondActive ? 'settled' : 'idle'}
            valueLine={bondActive ? bondLabel : 'awaiting quote'}
            hashLine={bondActive ? 'vault locked' : null}
          />
          <StagePill
            x={502}
            y={158}
            w={130}
            h={62}
            title="EXECUTE"
            status={executeActive ? 'settled' : 'idle'}
            valueLine={executeActive ? 'payout cleared' : 'awaiting bond'}
            hashLine={
              executeActive ? `Action ${data?.actionId ?? '27'}` : null
            }
          />

          {/* Flow connectors between pills */}
          <FlowLine
            x1={194}
            x2={210}
            y={189}
            active={settled}
            gradId={`${gradId}-arrow`}
          />
          <FlowLine
            x1={340}
            x2={356}
            y={189}
            active={quoteActive}
            gradId={`${gradId}-arrow`}
          />
          <FlowLine
            x1={486}
            x2={502}
            y={189}
            active={bondActive}
            gradId={`${gradId}-arrow`}
          />

          {/* Delayed evidence channel */}
          <g>
            <rect
              x={40}
              y={252}
              width={640}
              height={70}
              rx={8}
              fill="transparent"
              stroke={RULE}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            <text
              x={56}
              y={273}
              fill={BONE_DIM}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={11}
              letterSpacing="3"
            >
              DELAYED EVIDENCE CHANNEL
            </text>
            <text
              x={56}
              y={296}
              fill={BONE}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={11}
            >
              buyer signer · goods_not_received
            </text>
            <text
              x={56}
              y={312}
              fill={BONE_DIM}
              fontFamily="ui-monospace, Menlo, monospace"
              fontSize={10}
            >
              evidence root binds to one action
            </text>

            {/* moving packet along the channel */}
            <motion.rect
              x={0}
              y={280}
              width={40}
              height={20}
              rx={4}
              fill={SLASH}
              opacity={0.9}
              initial={{ x: 680, opacity: 0 }}
              animate={
                evidenceActive
                  ? { x: 420, opacity: 1 }
                  : done
                  ? { x: 420, opacity: 0.35 }
                  : { x: 680, opacity: 0 }
              }
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </g>

          {/* Watchdog node right */}
          <Node
            x={480}
            y={352}
            w={200}
            h={62}
            title="WATCHDOG"
            subtitle={
              watchdogActive
                ? shortHash(data?.watchdogChallengeTx ?? null) ?? 'challenge submitted'
                : 'deterministic · independent'
            }
            active={watchdogActive}
            tone={watchdogActive ? 'slash' : 'idle'}
          />

          {/* Challenge line: watchdog -> controller (into gate right edge). */}
          <motion.path
            d="M 580 352 C 580 340, 580 250, 640 245"
            stroke={SLASH}
            strokeWidth={2}
            fill="none"
            markerEnd={`url(#${gradId}-arrow-slash)`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              on(8)
                ? { pathLength: 1, opacity: 0.95 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Controller resolution + slash allocation */}
          <rect
            x={40}
            y={352}
            width={420}
            height={62}
            rx={8}
            fill={RAISED}
            stroke={slashActive ? SLASH : RULE}
          />
          <text
            x={56}
            y={374}
            fill={BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={11}
            letterSpacing="3"
          >
            CONTROLLER RESOLUTION
          </text>
          <text
            x={56}
            y={396}
            fill={slashActive ? SLASH : BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={12}
          >
            {slashActive
              ? `bond slashed · ${bondLabel}`
              : resolvedActive
              ? 'resolving'
              : 'awaiting challenge'}
          </text>

          {/* Slash split boxes appear only from phase 11 */}
          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={
              splitActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
            }
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <SplitBox
              x={40}
              y={430}
              w={200}
              h={44}
              title="WATCHDOG REWARD"
              value={rewardLabel}
              tone="accent"
            />
            <SplitBox
              x={260}
              y={430}
              w={200}
              h={44}
              title="PROTECTION RESERVE"
              value={reserveLabel}
              tone="accent"
            />
            {/* pipe lines from resolution to split */}
            <motion.path
              d="M 140 414 L 140 430"
              stroke={ACCENT}
              strokeWidth={2}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={splitActive ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            />
            <motion.path
              d="M 360 414 L 360 430"
              stroke={ACCENT}
              strokeWidth={2}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={splitActive ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          </motion.g>

          {/* Portable receipt panel */}
          <rect
            x={480}
            y={430}
            width={200}
            height={104}
            rx={8}
            fill={RAISED}
            stroke={receiptVerified ? ACCENT : RULE}
          />
          <text
            x={496}
            y={452}
            fill={BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={11}
            letterSpacing="3"
          >
            PORTABLE RECEIPT
          </text>
          <text
            x={496}
            y={474}
            fill={BONE}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={11}
          >
            bondsman.golden-path.v2
          </text>
          <text
            x={496}
            y={492}
            fill={BONE_DIM}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={10}
          >
            Action {data?.actionId ?? '27'}
          </text>

          {/* Verification seal */}
          <motion.g
            initial={{ scale: 0.4, opacity: 0 }}
            animate={
              receiptVerified
                ? { scale: 1, opacity: 1 }
                : { scale: 0.4, opacity: 0 }
            }
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <circle cx={640} cy={504} r={14} fill={ACCENT} />
            <motion.path
              d="M 632 504 L 638 510 L 648 500"
              stroke={RAISED}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={receiptVerified ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            />
          </motion.g>

          {/* Post-completion ambient pulse on receipt seal */}
          {done && !reduce && healthMode === 'healthy' && (
            <motion.circle
              cx={640}
              cy={504}
              r={14}
              fill="none"
              stroke={ACCENT}
              strokeWidth={1.5}
              initial={{ opacity: 0, r: 14 }}
              animate={{ opacity: [0.4, 0, 0.4], r: [14, 22, 14] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </svg>
      </div>

      {/* Overlay chip: current stage / cause */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              healthMode === 'healthy'
                ? done
                  ? 'bg-accent'
                  : 'bg-accent animate-pulse'
                : healthMode === 'degraded'
                ? 'bg-amber-400'
                : 'bg-muted'
            }`}
          />
          <span
            className={`serial text-[0.6rem] ${
              healthMode === 'healthy'
                ? 'text-accent'
                : healthMode === 'degraded'
                ? 'text-amber-300'
                : 'text-muted'
            }`}
          >
            {disabledCause ?? STAGE_LABELS[Math.min(phase, FINAL)]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="serial text-[0.58rem] text-muted">
            Action {data?.actionId ?? '27'} · canonical proof
          </span>
          {!reduce && healthMode === 'healthy' && (
            <button
              type="button"
              onClick={replay}
              className="rounded border border-rule bg-ink px-2 py-1 text-[0.6rem] text-muted transition-colors hover:text-bone focus-visible:text-bone"
              aria-label="Replay the bonded execution animation"
            >
              Replay flow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function shortHash(v: string | null): string | null {
  if (!v) return null;
  return truncateHash(v);
}

function Node({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  active,
  tone = 'idle',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  active: boolean;
  tone?: 'idle' | 'slash';
}) {
  const stroke = active
    ? tone === 'slash'
      ? SLASH
      : ACCENT
    : RULE;
  const titleColor = active
    ? tone === 'slash'
      ? SLASH
      : ACCENT
    : BONE_DIM;
  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={RAISED}
        stroke={stroke}
        strokeWidth={1.5}
        initial={false}
        animate={{ stroke }}
        transition={{ duration: 0.3 }}
      />
      <text
        x={x + 16}
        y={y + 22}
        fill={titleColor}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={11}
        letterSpacing="3"
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={x + 16}
          y={y + 42}
          fill={BONE_DIM}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={10}
        >
          {subtitle}
        </text>
      )}
    </g>
  );
}

function StagePill({
  x,
  y,
  w,
  h,
  title,
  status,
  valueLine,
  hashLine,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  status: 'idle' | 'active' | 'settled';
  valueLine: string;
  hashLine: string | null;
}) {
  const stroke =
    status === 'settled' ? ACCENT : status === 'active' ? ACCENT_DEEP : RULE;
  const titleColor =
    status === 'settled' ? ACCENT : status === 'active' ? ACCENT_DEEP : BONE_DIM;
  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={RAISED}
        stroke={stroke}
        strokeWidth={1.5}
        animate={{ stroke }}
        transition={{ duration: 0.3 }}
      />
      <text
        x={x + 12}
        y={y + 20}
        fill={titleColor}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={11}
        letterSpacing="3"
      >
        {title}
      </text>
      <text
        x={x + 12}
        y={y + 40}
        fill={BONE}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={11}
      >
        {valueLine}
      </text>
      {hashLine && (
        <text
          x={x + 12}
          y={y + 55}
          fill={BONE_DIM}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={9.5}
        >
          {hashLine}
        </text>
      )}
    </g>
  );
}

function SplitBox({
  x,
  y,
  w,
  h,
  title,
  value,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  value: string;
  tone: 'accent';
}) {
  const color = tone === 'accent' ? ACCENT : BONE_DIM;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={RAISED} stroke={color} />
      <text
        x={x + 12}
        y={y + 18}
        fill={color}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={10}
        letterSpacing="3"
      >
        {title}
      </text>
      <text
        x={x + 12}
        y={y + 35}
        fill={BONE}
        fontFamily="ui-monospace, Menlo, monospace"
        fontSize={11}
      >
        {value}
      </text>
    </g>
  );
}

function FlowLine({
  x1,
  x2,
  y,
  active,
  gradId,
}: {
  x1: number;
  x2: number;
  y: number;
  active: boolean;
  gradId: string;
}) {
  return (
    <motion.line
      x1={x1}
      x2={x2}
      y1={y}
      y2={y}
      stroke={active ? ACCENT : RULE}
      strokeWidth={1.5}
      markerEnd={active ? `url(#${gradId})` : undefined}
      initial={false}
      animate={{ stroke: active ? ACCENT : RULE }}
      transition={{ duration: 0.3 }}
    />
  );
}
