import Link from 'next/link';
import Seal from '@/components/Seal';
import ExecRail from '@/components/proof/ExecRail';

interface HeroProps {
  reachable: boolean;
  controllerVersion?: string;
}

export default function Hero({ reachable, controllerVersion }: HeroProps) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="flex items-center gap-2.5">
          <Seal state="idle" size={26} withText={false} title="Bondsman" />
          <span className="serial inline-flex items-center gap-2 text-[0.66rem] text-accent">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                reachable ? 'bg-accent' : 'bg-muted'
              }`}
            />
            {reachable ? 'Live on Casper testnet' : 'Backend unreachable · showing cached evidence'}
          </span>
          {controllerVersion && (
            <span className="serial hidden text-[0.6rem] text-muted sm:inline">
              controller {controllerVersion}
            </span>
          )}
        </div>

        <p className="serial mt-8 text-[0.66rem] text-muted">
          Bonded execution for autonomous finance
        </p>
        <h1 className="mt-3 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-tight text-bone sm:text-6xl">
          Make the agent answerable before it acts.
        </h1>
        <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-muted">
          Bondsman requires autonomous financial agents to post a risk-priced
          bond before moving capital. Verified faults slash the bond, reward the
          watchdog and create a portable proof.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/proof"
            className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
          >
            Inspect the live proof
          </Link>
          <Link
            href="/build"
            className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-accent/50"
          >
            See how agents integrate
          </Link>
        </div>

        <div className="mt-10 border-t border-rule pt-6">
          <p className="serial text-[0.6rem] text-muted">Execution rail</p>
          <ExecRail className="mt-3" />
        </div>
      </div>
    </section>
  );
}
