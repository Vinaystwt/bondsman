import Link from 'next/link';
import BondsmanLogo from '@/components/brand/BondsmanLogo';
import BondedExecutionAnimation, {
  type HealthMode,
} from '@/components/landing/BondedExecutionAnimation';
import { Container, StatusPill } from '@/components/ui/Primitives';
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
        ? 'Live execution temporarily paused'
        : 'Backend unavailable. Showing cached evidence.';

  const pillTone =
    healthMode === 'healthy'
      ? 'ok'
      : healthMode === 'degraded'
        ? 'warn'
        : 'neutral';

  return (
    <section className="relative overflow-hidden border-b border-rule">
      <Container className="py-14 lg:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <BondsmanLogo size={26} variant="mark" />
              <StatusPill tone={pillTone as 'ok' | 'warn' | 'neutral'}>
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    healthMode === 'healthy'
                      ? 'bg-accent'
                      : healthMode === 'degraded'
                        ? 'bg-yellow-400'
                        : 'bg-muted'
                  }`}
                />
                {liveLabel}
              </StatusPill>
            </div>

            <p className="serial mt-8 text-[0.66rem] text-muted">
              Bonded execution assurance
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl font-semibold leading-[1.03] tracking-tight text-bone sm:text-6xl">
              Make the agent answerable before it acts.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
              Bondsman requires economic collateral before an autonomous financial action, then settles objective failure on Casper. Live x402 settlement, deterministic bond policy and portable signed receipts.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/proof"
                className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
              >
                Verify the live proof
              </Link>
              <Link
                href="/assurance"
                className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-accent/50"
              >
                Design an assurance policy
              </Link>
            </div>

            <ul className="mt-8 grid gap-2 text-xs text-muted sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                Live AI risk interpretation
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                Deterministic bond policy
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                Casper testnet contracts
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
                Portable signed receipts
              </li>
            </ul>

            {healthMode === 'degraded' && degradedReason && (
              <p className="mt-6 max-w-prose rounded-md border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-xs leading-relaxed text-yellow-200">
                {degradedReason}
              </p>
            )}
          </div>

          <div className="lg:pl-2">
            <BondedExecutionAnimation
              data={toAnimationData(canonical)}
              healthMode={healthMode}
              degradedReason={degradedReason ?? null}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
