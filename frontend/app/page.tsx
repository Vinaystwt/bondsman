import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import Hero from '@/components/landing/Hero';
import EmailCapture from '@/components/landing/EmailCapture';
import Appear from '@/components/ui/Appear';
import Diagram from '@/components/Diagram';
import Roadmap from '@/components/Roadmap';
import { Label } from '@/components/ui/Primitives';
import { txExplorer } from '@/lib/format';
import type { ActionSummary } from '@/lib/types';

function sum(values: string[]): string {
  return values.reduce((acc, v) => acc + BigInt(v || '0'), 0n).toString();
}

export default async function Home() {
  const [actionsRes, reserveRes, watchdogRes] = await Promise.all([
    safeGet(() => api.actions()),
    safeGet(() => api.reserve()),
    safeGet(() => api.watchdog()),
  ]);

  const reachable = actionsRes.reachable;
  const actions: ActionSummary[] = actionsRes.reachable ? actionsRes.data : [];
  const slashedActions = actions.filter((a) => a.status === 'ResolvedSlash');

  const bonded = sum(actions.map((a) => a.bondPosted));
  const slashed = sum(slashedActions.map((a) => a.bondPosted));
  const reserve = reserveRes.reachable ? reserveRes.data.balance : '0';
  const watchdogEarned = watchdogRes.reachable
    ? watchdogRes.data.totalRewardEarned
    : null;

  const recent = [...actions].sort((a, b) => b.actionId - a.actionId)[0];
  const featuredSlash = [...slashedActions].sort(
    (a, b) => Number(b.amount) - Number(a.amount),
  )[0];
  const explorerHref =
    featuredSlash?.transactions.resolve
      ? txExplorer(featuredSlash.transactions.resolve)
      : null;

  return (
    <>
      <Hero
        bonded={bonded}
        slashed={slashed}
        reserve={reserve}
        watchdogEarned={watchdogEarned}
        recent={recent}
        reachable={reachable}
      />

      {/* Problem */}
      <Band>
        <Appear className="max-w-3xl">
          <Label>The problem</Label>
          <h2 className="mt-3 text-3xl font-semibold leading-snug tracking-tight text-bone sm:text-4xl">
            An agent can approve a payout in milliseconds. Today it risks nothing
            when it is wrong.
          </h2>
          <p className="mt-5 max-w-prose leading-relaxed text-muted">
            Software is starting to move money on its own. When it makes a
            confident mistake, the loss lands on someone else. Bondsman puts the
            agent&apos;s own capital on the line first, so being wrong has a cost
            that lands where the decision was made.
          </p>
        </Appear>
      </Band>

      {/* Lifecycle */}
      <Band>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <Appear className="max-w-md">
            <Label>The lifecycle</Label>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              One path, two endings
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Every action is bonded, executed, then open to challenge. It ends
              with the bond returned, or the bond taken. Green holds, red is a
              taken bond.
            </p>
          </Appear>
          <Diagram
            name="lifecycle"
            alt="The lifecycle of a bonded action: intent, bond, execute, challenge window, then either a refund or a slash."
          />
        </div>
      </Band>

      {/* Two-agent economy */}
      <Band>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <Diagram
            name="agent-economy"
            alt="One agent approves and pays a duplicate. A second watchdog agent detects it, challenges, and the contract slashes the bond."
            className="order-2 lg:order-1"
          />
          <Appear className="order-1 max-w-md lg:order-2">
            <Label>Approver and watchdog</Label>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              One agent approves. A watchdog catches it.
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              A model-driven agent approves payouts. A deterministic watchdog
              monitors every payout. When one is a duplicate, the watchdog
              challenges and the contract settles. No human in the loop, two
              on-chain accounts, real transactions.
            </p>
            <Link
              href="/demo"
              className="mt-6 inline-block rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
            >
              See it in action
            </Link>
          </Appear>
        </div>
      </Band>

      {/* Use case */}
      <Band>
        <Appear className="max-w-3xl">
          <Label>The use case</Label>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
            Paying invoices, without paying twice
          </h2>
          <p className="mt-5 max-w-prose leading-relaxed text-muted">
            An agent processing accounts payable approves invoices for payment.
            The expensive, common failure is paying the same invoice twice: a
            duplicate slips through and the money is gone. Bondsman gives every
            invoice a claim hash, a fingerprint of what it claims. When a payout
            reuses a fingerprint that was already paid, the contract proves the
            duplicate and slashes the bond. The agent loses its own stake before
            anyone else loses a cent.
          </p>
          <div className="mt-8">
            <Diagram
              name="slash-split"
              alt="A slashed bond splits in half: one half to the challenger, one half to the reserve."
              className="max-w-xl"
            />
          </div>
        </Appear>
      </Band>

      {/* Positioning */}
      <Band>
        <div className="grid gap-8 md:grid-cols-2">
          <Appear className="rounded-lg border border-rule bg-surface p-7">
            <Label>The layer after issuance</Label>
            <p className="mt-3 text-xl leading-snug text-bone">
              Issuance puts assets on chain. Bondsman decides what happens when an
              agent moving those assets is wrong.
            </p>
          </Appear>
          <Appear delay={0.08} className="rounded-lg border border-rule bg-surface p-7">
            <Label>Real, not simulated</Label>
            <p className="mt-3 text-xl leading-snug text-bone">
              Every slash here is a real transaction you can open on the explorer.
              Accountability that never executes is a simulation.
            </p>
            {explorerHref && (
              <a
                href={explorerHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
              >
                Open a real slash on the explorer
              </a>
            )}
          </Appear>
        </div>
      </Band>

      {/* Why Casper */}
      <Band>
        <Appear className="max-w-2xl">
          <Label>Why Casper</Label>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
            Built where the truth is the chain
          </h2>
        </Appear>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['Typed on-chain events', 'Casper emits typed events the listener reads directly, so the projection stays faithful to the chain.'],
            ['Final and deterministic', 'A resolved slash is settled, not pending. The outcome is a fact, not a guess.'],
            ['Room for many small bonds', 'Costs stay low enough that bonding every action, not just large ones, is practical.'],
          ].map(([t, d], i) => (
            <Appear key={t} delay={i * 0.06}>
              <div className="h-full rounded-lg border border-rule bg-surface p-5">
                <h3 className="font-semibold text-bone">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </Appear>
          ))}
        </div>
      </Band>

      {/* Roadmap */}
      <Band>
        <Appear className="max-w-2xl">
          <Label>Roadmap</Label>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
            Where this goes next
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            Built for operators of on-chain invoice financing and factoring
            pools, then real-world asset payout pools more broadly.
          </p>
        </Appear>
        <div className="mt-10 max-w-2xl">
          <Roadmap />
        </div>
      </Band>

      {/* Closing */}
      <Band className="border-t border-rule">
        <Appear className="max-w-2xl">
          <h2 className="text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
            No bond, no action.
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            Try the demo now, or leave your email and we will reach out when
            Bondsman moves past testnet.
          </p>
          <div className="mt-8 space-y-6">
            <Link
              href="/demo"
              className="inline-block rounded-md bg-accent px-7 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
            >
              Try the live demo
            </Link>
            <EmailCapture />
          </div>
        </Appear>
      </Band>
    </>
  );
}

function Band({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-6 py-20 sm:py-24 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
