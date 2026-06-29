import Link from 'next/link';
import Seal from '@/components/Seal';

// Placeholder landing. The composed scroll is built in a later step.
export default function Home() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-32 text-center">
      <Seal state="stamp" size={120} />
      <h1 className="mt-8 font-display text-5xl font-semibold tracking-tight">
        No bond, no action.
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-muted">
        Bondsman makes an autonomous agent stake real capital before it can move
        your money, and takes it when the agent is wrong.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/app"
          className="rounded border border-copper/50 bg-copper/10 px-5 py-2.5 text-sm font-medium text-copper hover:bg-copper/20"
        >
          Launch app
        </Link>
        <Link
          href="/demo"
          className="rounded border border-rule px-5 py-2.5 text-sm text-bone hover:border-copper/50"
        >
          Try the demo
        </Link>
      </div>
    </div>
  );
}
