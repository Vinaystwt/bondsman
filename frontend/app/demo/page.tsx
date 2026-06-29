import type { Metadata } from 'next';
import Link from 'next/link';
import ArenaClient from '@/components/arena/ArenaClient';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Demo',
  description:
    'Challenge a bonded payout on Casper testnet and watch the bond get slashed in real time.',
};

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-prose text-center">
        <Label>Live demo</Label>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Challenge a payout. Watch the bond go.
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          Bondsman makes an agent stake real capital before it can move money.
          Below are real actions on Casper testnet. One of them reused a claim
          that had already been paid. Challenge it, and the contract takes the
          bond. You do not need an account or any setup.
        </p>
      </div>

      <div className="mt-12">
        <ArenaClient />
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/how-it-works"
          className="text-sm text-copper underline decoration-rule underline-offset-4 hover:decoration-copper"
        >
          Understand how it works
        </Link>
      </div>
    </div>
  );
}
