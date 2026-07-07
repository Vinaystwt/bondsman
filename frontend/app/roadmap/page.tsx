import type { Metadata } from 'next';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'Where Bondsman goes after this testnet build.',
};

interface Milestone {
  phase: string;
  title: string;
  items: string[];
}

const TIMELINE: Milestone[] = [
  {
    phase: 'Now',
    title: 'Testnet accountability loop',
    items: [
      'Bonded invoice actions on Casper testnet.',
      'Wallet signed challenges with backend resolution.',
      'Deterministic watchdog catches duplicate claims.',
      'Local MCP server exposes action, reputation, deployment, bond quote, and challenge tools.',
    ],
  },
  {
    phase: 'Next',
    title: 'Operator tools and proof center',
    items: [
      'Operator console for action review, reserve health, and slash economics.',
      'Proof center with replayable action timelines and explorer evidence.',
      'Publish ready MCP package with bin, README, and examples.',
      'Sandbox x402 verification path documented for service integration.',
    ],
  },
  {
    phase: 'Later',
    title: 'Underwriting and policy layer',
    items: [
      'Underwriting pool with reserve analytics and loss history.',
      'Policy templates for challenge windows, tiers, and fault classes.',
      'Delivery attestation, due date, and amount mismatch proof adapters.',
      'Portable agent reputation across operator pools.',
    ],
  },
  {
    phase: 'Mainnet path',
    title: 'Production settlement',
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
            <li key={m.phase} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-1.5 grid h-3 w-3 place-items-center rounded-full border border-accent bg-ink"
              >
                <span className="h-1 w-1 rounded-full bg-accent" />
              </span>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="serial text-[0.62rem] text-muted">{m.phase}</span>
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

      <section aria-label="Roadmap links" className="rounded-md border border-rule bg-surface p-6">
        <Label>Explore</Label>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href="/docs" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Read the production roadmap
          </a>
          <a href="/build" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Open the MCP build page
          </a>
          <a href="/app" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Explore the testnet deployment
          </a>
        </div>
      </section>
    </div>
  );
}
