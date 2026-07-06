import Link from 'next/link';
import Seal from '@/components/Seal';
import Money from '@/components/ui/Money';
import StatusBadge from '@/components/ui/StatusBadge';
import { serial, truncateHash, txExplorer } from '@/lib/format';
import type { ActionSummary } from '@/lib/types';

interface HeroProps {
  bonded: string;
  slashed: string;
  reserve: string;
  watchdogEarned: string | null;
  recent?: ActionSummary;
  reachable: boolean;
}

// Left aligned, two column. All text and figures are server rendered, so the
// hero paints immediately with no logo-only flash.
export default function Hero({
  bonded,
  slashed,
  reserve,
  watchdogEarned,
  recent,
  reachable,
}: HeroProps) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
        {/* Left: the thesis */}
        <div>
          <div className="flex items-center gap-2.5">
            <Seal state="idle" size={26} withText={false} title="Bondsman" />
            <span className="serial inline-flex items-center gap-2 text-[0.68rem] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Live on Casper testnet
            </span>
          </div>

          <h1 className="mt-6 text-5xl font-semibold leading-[1.03] tracking-tight text-bone sm:text-6xl">
            No bond, no action.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
            Bondsman makes an autonomous agent stake real capital before it can
            move your money, and takes it when the agent is wrong.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
            >
              Try the live demo
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-accent/50"
            >
              How it works
            </Link>
          </div>

          {/* Live stats */}
          <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-rule pt-6 sm:grid-cols-4">
            <Stat label="Bonded" value={<Money atomic={bonded} bare />} />
            <Stat label="Slashed" value={<Money atomic={slashed} bare />} tone="slash" />
            <Stat label="Reserve" value={<Money atomic={reserve} bare />} />
            <Stat
              label="Watchdog earned"
              value={watchdogEarned ? <Money atomic={watchdogEarned} bare /> : '0'}
            />
          </dl>
        </div>

        {/* Right: a live recent action */}
        <div>
          {reachable && recent ? (
            <div className="rounded-lg border border-rule bg-surface p-6">
              <div className="flex items-center justify-between">
                <span className="serial text-[0.62rem] text-muted">
                  Most recent action
                </span>
                <StatusBadge status={recent.status} />
              </div>
              <p className="mt-5 font-mono text-4xl text-bone tabular">
                <Money atomic={recent.amount} />
              </p>
              <dl className="mt-5 space-y-2.5 border-t border-rule pt-4 text-sm">
                <Row label="Action" value={serial(recent.actionId)} />
                <Row label="Bond posted" value={<Money atomic={recent.bondPosted} />} />
                <Row label="Agent" value={truncateHash(recent.agent)} mono />
              </dl>
              <div className="mt-4 flex items-center gap-4 border-t border-rule pt-4 text-sm">
                <Link
                  href={`/app/actions/${recent.actionId}`}
                  className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                >
                  View action
                </Link>
                {recent.transactions.initiate && (
                  <a
                    href={txExplorer(recent.transactions.initiate)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted underline decoration-rule underline-offset-4 hover:text-accent"
                  >
                    On the explorer
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-rule bg-surface/40 p-8 text-sm leading-relaxed text-muted">
              <p className="text-bone">Backend not reachable</p>
              <p className="mt-2">
                Start it from the repository root to load live actions here.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded border border-rule bg-ink px-3 py-1.5 font-mono text-accent">
                <span className="text-muted">$</span> npm run api
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'slash';
}) {
  return (
    <div>
      <dt className="serial text-[0.58rem] text-muted">{label}</dt>
      <dd className={`mt-1.5 font-mono text-lg tabular ${tone === 'slash' ? 'text-slash' : 'text-bone'}`}>
        {value}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right text-bone ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
