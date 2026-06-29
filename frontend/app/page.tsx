import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import Hero from '@/components/landing/Hero';
import EmailCapture from '@/components/landing/EmailCapture';
import Appear from '@/components/ui/Appear';
import { Label } from '@/components/ui/Primitives';
import Money from '@/components/ui/Money';
import StatusBadge from '@/components/ui/StatusBadge';
import LifecycleDiagram from '@/components/diagrams/LifecycleDiagram';
import { serial } from '@/lib/format';
import type { ActionSummary } from '@/lib/types';

export default async function Home() {
  // Feature the highest-amount slash, read from the chain.
  const res = await safeGet(() => api.actions());
  let featured: ActionSummary | undefined;
  if (res.reachable) {
    featured = res.data
      .filter((a) => a.status === 'ResolvedSlash')
      .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  }

  return (
    <>
      <Hero />

      {/* The problem */}
      <Band>
        <Appear className="mx-auto max-w-3xl text-center">
          <Label>The problem</Label>
          <p className="mt-4 font-display text-3xl leading-snug text-bone sm:text-4xl">
            An agent can approve a payout in milliseconds. Today it risks nothing
            when it is wrong.
          </p>
          <p className="mx-auto mt-5 max-w-prose leading-relaxed text-muted">
            Software is starting to move money on its own. When it makes a
            confident mistake, the loss lands on someone else. Bondsman puts the
            agent&apos;s own capital on the line first, so being wrong has a cost
            that lands where the decision was made.
          </p>
        </Appear>
      </Band>

      {/* Lifecycle */}
      <Band>
        <Appear className="mx-auto max-w-2xl text-center">
          <Label>The lifecycle</Label>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            One path, two endings
          </h2>
          <p className="mx-auto mt-4 max-w-prose leading-relaxed text-muted">
            Every action is bonded, executed, and then open to challenge. It ends
            with the bond returned, or the bond taken.
          </p>
        </Appear>
        <Appear delay={0.1} className="mx-auto mt-10 max-w-4xl">
          <LifecycleDiagram />
        </Appear>
      </Band>

      {/* Live demo preview */}
      <Band>
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <Appear>
            <Label>See it happen</Label>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Catch a wrong payout yourself
            </h2>
            <p className="mt-4 max-w-prose leading-relaxed text-muted">
              The demo is open to anyone, with no account and no setup. Pick a
              bonded payout, press challenge, and watch the contract take the
              bond on Casper testnet. Every step links to the public explorer.
            </p>
            <Link
              href="/demo"
              className="mt-6 inline-block rounded-md border border-copper bg-copper/15 px-6 py-3 font-medium text-copper transition-colors hover:bg-copper/25"
            >
              Open the demo
            </Link>
          </Appear>

          <Appear delay={0.1}>
            {featured ? (
              <Link
                href={`/app/actions/${featured.actionId}`}
                className="group block rounded-md border border-rule bg-surface p-6 transition-colors hover:border-void/50"
              >
                <div className="flex items-center justify-between">
                  <span className="serial text-[0.62rem] text-muted">
                    {serial(featured.actionId)}
                  </span>
                  <StatusBadge status={featured.status} />
                </div>
                <p className="mt-4 font-mono text-3xl text-bone tabular">
                  <Money atomic={featured.amount} />
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  This payout reused a claim that had already been paid. The
                  contract found the duplicate. The bond is gone.
                </p>
                <span className="mt-4 inline-block text-sm text-copper">
                  See the full action
                </span>
              </Link>
            ) : (
              <div className="rounded-md border border-dashed border-rule bg-surface/40 p-8 text-center text-sm text-muted">
                Start the backend with{' '}
                <span className="font-mono text-copper">npm run api</span> to load
                a live action here.
              </div>
            )}
          </Appear>
        </div>
      </Band>

      {/* Use case */}
      <Band>
        <Appear className="mx-auto max-w-3xl">
          <Label>The use case</Label>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Paying invoices, without paying twice
          </h2>
          <p className="mt-5 leading-relaxed text-muted">
            An agent processing accounts payable approves invoices for payment.
            The expensive, common failure is paying the same invoice twice: a
            duplicate slips through and the money is gone. Bondsman gives every
            invoice a claim hash, a fingerprint of what it claims. When a payout
            reuses a fingerprint that was already paid, the contract proves the
            duplicate and slashes the bond. The agent loses its own stake before
            anyone else loses a cent.
          </p>
        </Appear>
      </Band>

      {/* Why Casper */}
      <Band>
        <Appear className="mx-auto max-w-2xl text-center">
          <Label>Why Casper</Label>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built where the truth is the chain
          </h2>
        </Appear>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            {
              t: 'Typed on-chain events',
              d: 'Casper emits typed events the listener reads directly, so the projection stays faithful to the chain.',
            },
            {
              t: 'Final and deterministic',
              d: 'A resolved slash is settled, not pending. The outcome is a fact, not a guess.',
            },
            {
              t: 'Room for many small bonds',
              d: 'Costs stay low enough that bonding every action, not just large ones, is practical.',
            },
          ].map((c, i) => (
            <Appear key={c.t} delay={i * 0.08}>
              <div className="h-full rounded-md border border-rule bg-surface p-5">
                <h3 className="font-display text-lg text-bone">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
              </div>
            </Appear>
          ))}
        </div>
      </Band>

      {/* Roadmap */}
      <Band>
        <Appear className="mx-auto max-w-3xl">
          <Label>Roadmap</Label>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Where this goes next
          </h2>
          <ul className="mt-6 space-y-4">
            {[
              ['Mainnet settlement', 'Move to mainnet with a real settlement token in place of the testnet mock.'],
              ['Real invoice feeds', 'Connect a live accounts payable source so invoices are not seeded.'],
              ['More provable fraud', 'Add fraud classes the contract can prove beyond the duplicate claim.'],
              ['Open watchers', 'Widen the challenger role so more parties are paid to catch wrong payouts.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="serial mt-1 shrink-0 text-[0.7rem] text-copper">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="block font-medium text-bone">{t}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </Appear>
      </Band>

      {/* Closing CTA */}
      <Band className="border-t border-rule">
        <Appear className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            No bond, no action.
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            Try the demo now, or leave your email and we will reach out when
            Bondsman moves past testnet.
          </p>
          <div className="mt-8 flex flex-col items-center gap-6">
            <Link
              href="/demo"
              className="rounded-md border border-copper bg-copper/15 px-7 py-3 font-medium text-copper transition-colors hover:bg-copper/25"
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
