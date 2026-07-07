import type { Metadata } from 'next';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'Where Bondsman goes after this testnet build.',
};

interface Milestone {
  quarter: string;
  title: string;
  items: string[];
}

const TIMELINE: Milestone[] = [
  {
    quarter: 'Q3 2026',
    title: 'Mainnet',
    items: [
      'Mainnet contracts and real csprUSD.',
      'Oracle-backed delivery attestation replaces the mocked delivery flag on invoices.',
      'Reserved bond posting from operator-owned pools.',
    ],
  },
  {
    quarter: 'Q4 2026',
    title: 'Pool operator pilot',
    items: [
      'One live invoice-financing pool operator, real invoice inflow.',
      'x402-metered verification once the reference token implements the settlement entry point.',
      'Operator dashboard with slash economics reporting.',
    ],
  },
  {
    quarter: 'Q1 2027',
    title: 'Multi-fault-class proofs',
    items: [
      'Fault classes beyond duplicate claims: missing delivery attestation, expired due date, amount mismatch.',
      'Proof adapters so operators can add their own contract-checked rules.',
      'Bond tier premiums reflecting fault-class severity.',
    ],
  },
  {
    quarter: 'Q2 2027',
    title: 'Policy marketplace',
    items: [
      'Configurable challenge windows and bond tiers per operator.',
      'A portable agent reputation passport that follows an agent between operators.',
      'Public policy templates operators can pin.',
    ],
  },
];

const EXPLORATION: { label: string; description: string }[] = [
  { label: 'Operator and underwriter modes', description: 'Distinct roles: the operator that funds a pool and the underwriter that stakes on top.' },
  { label: 'Gas abstraction', description: 'Sponsored testnet and mainnet gas so a first-time challenger can act without buying CSPR.' },
  { label: 'Time-lapse replay', description: 'A scrubbable timeline that replays every action, bond, and slash on a pool.' },
  { label: 'X slash bot', description: 'A public feed that posts every slash with the challenger address and reward.' },
  { label: 'Notifications', description: 'Push and email alerts for new duplicates in the pool an agent is watching.' },
  { label: 'SDK', description: 'A typed client wrapping the MCP tools for agents that prefer function-call ergonomics.' },
  { label: 'Multi-model approvers', description: 'A/B approver policies to compare model families on the same invoice pool.' },
  { label: 'Insurance analytics', description: 'Historic slash rates by agent, pool, and fault class, feeding underwriter models.' },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Roadmap</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Where this goes after testnet
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          A described plan, not a claim of what is built. Everything below
          this line is future work.
        </p>
      </header>

      <section aria-label="Timeline" className="space-y-6">
        <ol className="relative space-y-8 border-l border-rule pl-6">
          {TIMELINE.map((m) => (
            <li key={m.quarter} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-1.5 grid h-3 w-3 place-items-center rounded-full border border-accent bg-ink"
              >
                <span className="h-1 w-1 rounded-full bg-accent" />
              </span>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="serial text-[0.62rem] text-muted">{m.quarter}</span>
                <h3 className="text-xl font-semibold text-bone">{m.title}</h3>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                {m.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Exploration" className="space-y-6 border-t border-rule pt-10">
        <div className="space-y-2">
          <Label>Future exploration</Label>
          <h2 className="text-2xl font-semibold text-bone">Directions, not commitments</h2>
          <p className="text-sm leading-relaxed text-muted">
            Named ideas we would build next given time and support. Not on the
            timeline yet. Not something you can use today.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXPLORATION.map((e) => (
            <li key={e.label} className="rounded-md border border-rule bg-surface px-4 py-3">
              <p className="text-sm font-medium text-bone">{e.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{e.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Ask" className="rounded-md border border-accent/30 bg-accent/5 p-6">
        <Label>Grant and incubation ask</Label>
        <h2 className="mt-2 text-2xl font-semibold text-bone">
          Bring bonded accountability to Casper mainnet
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-bone">
          Bondsman is testnet-complete. The mainnet migration, the operator
          pilot, and the x402 integration need funded engineering time and a
          Casper builder partnership. We are looking for grant support and
          incubation across the Q3 2026 mainnet cut and the Q4 2026 operator
          pilot.
        </p>
        <p className="mt-3 text-xs text-muted">
          Reach out through the Casper builder channels or the contact on the
          docs page.
        </p>
      </section>
    </div>
  );
}
