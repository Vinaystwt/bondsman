import type { Metadata } from 'next';
import Link from 'next/link';
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
    title: 'Testnet accountability loop',
    items: [
      'Bonded invoice actions on Casper testnet.',
      'Wallet signed challenges with backend resolution.',
      'Deterministic watchdog catches duplicate claims.',
      'Published MCP server (@vinaystwt/bondsman-mcp) exposes action, reputation, deployment, bond quote, and challenge tools.',
    ],
  },
  {
    quarter: 'Q4 2026',
    title: 'Agent operator tools and proof center',
    items: [
      'Operator console for action review, reserve health, and slash economics.',
      'Proof center with replayable action timelines and explorer evidence.',
      'Sandbox x402 verification path documented for service integration.',
    ],
  },
  {
    quarter: 'Q1 2027',
    title: 'Underwriting and policy layer',
    items: [
      'Underwriting pool with reserve analytics and loss history.',
      'Policy templates for challenge windows, tiers, and fault classes.',
      'Delivery attestation, due date, and amount mismatch proof adapters.',
      'Portable agent reputation across operator pools.',
    ],
  },
  {
    quarter: 'Q2 2027 and beyond',
    title: 'Mainnet path',
    items: [
      'Mainnet contracts and production csprUSD integration.',
      'Oracle backed delivery attestation for real invoice workflows.',
      'x402 settlement once the token and facilitator path support production payments.',
      'Agent and challenger reputation APIs for integrators.',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Roadmap</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Bondsman product roadmap
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          The path from a working testnet accountability loop to production
          settlement, operator tooling, and portable agent reputation.
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

      <section aria-label="Next steps" className="rounded-md border border-rule bg-surface p-6">
        <Label>Next steps</Label>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/build" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Open the MCP build page
          </Link>
          <Link href="/app" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Explore the testnet deployment
          </Link>
          <Link href="/app/arena" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Try a challenge in the Arena
          </Link>
        </div>
      </section>
    </div>
  );
}
