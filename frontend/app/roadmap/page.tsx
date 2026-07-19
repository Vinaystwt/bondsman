import type { Metadata } from 'next';
import Link from 'next/link';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'Where Bondsman goes after this Buildathon submission.',
};

interface Milestone {
  quarter: string;
  title: string;
  status: 'shipped' | 'now' | 'next';
  items: string[];
}

const TIMELINE: Milestone[] = [
  {
    quarter: 'Shipped · Buildathon',
    status: 'shipped',
    title: 'Bonded execution loop on Casper testnet',
    items: [
      'BondsmanControllerV2 with bond vault, invoice pool and receipt signer live.',
      'Real x402 WCSPR settlement through the CSPR.cloud facilitator.',
      'Paid quote issuance, single-use consumption and payer-signed submit authorization.',
      'Deterministic watchdog with independent challenge submission.',
      'Delivery-contradiction verifier and duplicate-claim verifier both on chain.',
      'Portable receipt with public-key signature and independent verify endpoint.',
      'A2A agent card and MCP endpoint for autonomous agent integration.',
    ],
  },
  {
    quarter: 'Now · Post-buildathon',
    status: 'now',
    title: 'Operator tooling and coverage transparency',
    items: [
      'Operator console for action review, reserve health and slash economics.',
      'Public canonical-proof feed and coverage endpoint for integrators.',
      'Delivery evidence tooling for real buyer signers.',
      'Portable receipt viewer and third-party verifier packages.',
    ],
  },
  {
    quarter: 'Next · Underwriting and policy',
    status: 'next',
    title: 'Underwriting pool and portable reputation',
    items: [
      'Underwriting pool with reserve analytics and loss history.',
      'Policy templates for challenge windows, tiers and fault classes.',
      'Additional fault verifiers: due-date mismatch, amount mismatch, oracle-backed attestation.',
      'Portable agent reputation across operator pools.',
    ],
  },
  {
    quarter: 'Later · Mainnet path',
    status: 'next',
    title: 'Production capital and external oracles',
    items: [
      'Mainnet controller and production csprUSD integration.',
      'External oracle networks for delivery attestation.',
      'Formal security review of the controller and verifiers.',
      'Agent reputation APIs for integrators and marketplaces.',
    ],
  },
];

const STATUS: Record<Milestone['status'], { label: string; className: string }> = {
  shipped: {
    label: 'shipped',
    className: 'border-accent/40 bg-accent/10 text-accent',
  },
  now: {
    label: 'now',
    className: 'border-rule bg-ink text-bone',
  },
  next: {
    label: 'next',
    className: 'border-rule bg-surface text-muted',
  },
};

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Roadmap</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          From a settled bonded loop to mainnet capital.
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          The Buildathon submission proves the bonded execution loop end to end
          on Casper testnet. This is what comes next.
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
                <span
                  className={`serial rounded border px-2 py-0.5 text-[0.55rem] ${STATUS[m.status].className}`}
                >
                  {STATUS[m.status].label}
                </span>
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
          <Link
            href="/proof"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Read the canonical proof
          </Link>
          <Link
            href="/build"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Integrate with Bondsman
          </Link>
        </div>
      </section>
    </div>
  );
}
