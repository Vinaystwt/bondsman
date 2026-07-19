import { Label } from '@/components/ui/Primitives';

interface Item {
  head: string;
  points: string[];
}

const COLUMNS: { title: string; tone: 'accent' | 'muted' | 'slash'; items: Item }[] = [
  {
    title: 'Live on Casper testnet',
    tone: 'accent',
    items: {
      head: 'These are on-chain facts you can reopen on testnet.cspr.live.',
      points: [
        'x402 WCSPR settlement transaction',
        'Paid quote hash and consumption',
        'Bond posting and payout execution',
        'Watchdog challenge transaction',
        'Slash resolution and reserve credit',
        'Reputation update from protocol rule',
        'Signed portable receipt',
      ],
    },
  },
  {
    title: 'Controlled testnet inputs',
    tone: 'muted',
    items: {
      head: 'These are controlled fixtures the pipeline reads from.',
      points: [
        'The invoice record itself',
        'The purchase premise behind the payout',
        'The buyer-signed delivery rejection attestation',
      ],
    },
  },
  {
    title: 'Future production work',
    tone: 'muted',
    items: {
      head: 'What still needs to land before real mainnet capital.',
      points: [
        'Real invoice pool integrations',
        'External oracle networks for evidence',
        'Formal security review',
        'Production csprUSD and mainnet assets',
      ],
    },
  },
];

const TONE: Record<'accent' | 'muted' | 'slash', string> = {
  accent: 'text-accent',
  muted: 'text-bone',
  slash: 'text-slash',
};

export default function WhatIsReal({ className }: { className?: string }) {
  return (
    <section
      aria-label="What is real"
      className={`rounded-md border border-rule bg-surface/60 p-6 ${className ?? ''}`}
    >
      <Label>What is real</Label>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Bondsman runs on Casper testnet. This split is what a judge should trust
        as an on-chain fact, what comes from a controlled testnet fixture, and
        what is still ahead of a mainnet product.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {COLUMNS.map((c) => (
          <div key={c.title} className="border-t border-rule pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0 first:border-none first:pl-0">
            <h3 className={`text-sm font-semibold ${TONE[c.tone]}`}>{c.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{c.items.head}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-bone/90">
              {c.items.points.map((p) => (
                <li key={p} className="flex gap-2 leading-snug">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                      c.tone === 'accent' ? 'bg-accent' : 'bg-muted'
                    }`}
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
