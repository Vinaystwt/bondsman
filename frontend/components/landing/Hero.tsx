import Link from 'next/link';
import Seal from '@/components/Seal';
import ExecRail from '@/components/proof/ExecRail';
import BondedExecutionAnimation, {
  type HealthMode,
} from '@/components/landing/BondedExecutionAnimation';
import type { CanonicalProof } from '@/lib/types';

interface HeroProps {
  healthMode: HealthMode;
  degradedReason?: string | null;
  canonical: CanonicalProof | null;
}

function toAnimationData(proof: CanonicalProof | null) {
  if (!proof) return null;
  return {
    actionId: proof.actionId,
    paymentAmountBase: proof.payment?.paymentAmount ?? '0',
    settlementTx: proof.payment?.settlementTransaction ?? null,
    quoteHash: proof.paidQuote?.quoteHash ?? null,
    bondBase: proof.bond,
    challengerRewardBase: proof.economicImpact.challengerReward,
    reserveCreditBase: proof.economicImpact.reserveCredit,
    watchdogChallengeTx:
      proof.timeline.find((s) => s.stage === 'challenge')?.txHash ?? null,
    resolveTx:
      proof.timeline.find((s) => s.stage === 'resolve')?.txHash ?? null,
  };
}

export default function Hero({ healthMode, degradedReason, canonical }: HeroProps) {
  const liveLabel =
    healthMode === 'healthy'
      ? 'Live on Casper testnet'
      : healthMode === 'degraded'
      ? 'Execution temporarily paused'
      : 'Backend unreachable · showing cached evidence';

  const liveTone =
    healthMode === 'healthy'
      ? 'text-accent'
      : healthMode === 'degraded'
      ? 'text-amber-300'
      : 'text-muted';

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* LEFT: positioning + copy */}
          <div>
            <div className="flex items-center gap-2.5">
              <Seal state="idle" size={26} withText={false} title="Bondsman" />
              <span
                className={`serial inline-flex items-center gap-2 text-[0.66rem] ${liveTone}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    healthMode === 'healthy'
                      ? 'bg-accent'
                      : healthMode === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-muted'
                  }`}
                />
                {liveLabel}
              </span>
            </div>

            <p className="serial mt-8 text-[0.66rem] text-muted">
              Bonded execution for autonomous finance
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl font-semibold leading-[1.03] tracking-tight text-bone sm:text-6xl">
              Make the agent answerable before it acts.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
              Bondsman requires autonomous financial agents to post a
              risk-priced bond before moving capital. Verified faults slash the
              bond, reward the watchdog and create a portable proof.
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

            {healthMode === 'degraded' && degradedReason && (
              <p className="mt-6 max-w-prose rounded-md border border-amber-400/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">
                {degradedReason}
              </p>
            )}
          </div>

          {/* RIGHT: animated execution instrument */}
          <div className="lg:pl-2">
            <BondedExecutionAnimation
              data={toAnimationData(canonical)}
              healthMode={healthMode}
              degradedReason={degradedReason ?? null}
            />
          </div>
        </div>

        <div className="mt-10 border-t border-rule pt-6">
          <p className="serial text-[0.6rem] text-muted">Execution rail</p>
          <ExecRail className="mt-3" />
        </div>
      </div>
    </section>
  );
}
