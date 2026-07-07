import type { Metadata } from 'next';
import Link from 'next/link';
import Appear from '@/components/ui/Appear';
import Diagram from '@/components/Diagram';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Demo',
  description:
    'See how Bondsman catches a wrong payout on Casper testnet, then try it yourself in the Challenge Arena.',
};

const STEPS = [
  {
    num: '01',
    title: 'The agent approves a payout',
    body: 'An AI agent reviews an invoice and decides to pay it. The contract forces the agent to lock a bond before the money moves.',
  },
  {
    num: '02',
    title: 'Someone spots a duplicate',
    body: 'The deterministic watchdog, or you, notices the invoice was already paid. The claim hash matches one that already settled.',
  },
  {
    num: '03',
    title: 'The contract slashes the bond',
    body: 'The challenge proves the duplicate on chain. The bond splits: half to whoever caught it, half to the protection reserve.',
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div className="max-w-2xl">
        <Label>Live demo</Label>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
          How the demo works
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-muted">
          Bondsman runs on Casper testnet with real transactions. The Challenge
          Arena lets you slash a bond yourself in one click, or watch an
          approver and a deterministic watchdog settle it. Here is what happens.
        </p>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <Appear key={s.num} delay={i * 0.06}>
            <li className="h-full rounded-lg border border-rule bg-surface p-6">
              <span className="serial text-[0.62rem] text-accent">{s.num}</span>
              <h3 className="mt-2 text-lg font-semibold text-bone">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          </Appear>
        ))}
      </ol>

      <Appear className="mt-14">
        <Diagram
          name="slash-split"
          alt="A slashed bond splits in half: one half to the challenger, one half to the reserve."
          className="max-w-xl"
        />
      </Appear>

      <Appear className="mt-14 max-w-2xl rounded-lg border border-rule bg-surface p-8">
        <h2 className="text-2xl font-semibold text-bone">Ready to try it</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          The Challenge Arena has a real bonded payout waiting. Challenge it
          yourself in one click, or watch the approver and watchdog settle it
          without a human in the loop.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app/arena"
            className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
          >
            Open the Challenge Arena
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-accent/50"
          >
            Read how it works
          </Link>
        </div>
      </Appear>
    </div>
  );
}
