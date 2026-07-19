import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import Hero from '@/components/landing/Hero';
import EmailCapture from '@/components/landing/EmailCapture';
import CanonicalSummary from '@/components/proof/CanonicalSummary';
import WhatIsReal from '@/components/proof/WhatIsReal';
import Appear from '@/components/ui/Appear';
import Diagram from '@/components/Diagram';
import { Label } from '@/components/ui/Primitives';

export const revalidate = 30;

export default async function Home() {
  const [healthRes, canonicalRes] = await Promise.all([
    safeGet(() => api.health()),
    safeGet(() => api.canonicalProof()),
  ]);

  const reachable = healthRes.reachable;
  const controllerVersion = healthRes.reachable
    ? healthRes.data.version
    : undefined;

  const canonical = canonicalRes.reachable ? canonicalRes.data : null;
  const canonicalId = canonical?.actionId ?? '27';

  const receiptRes = canonical
    ? await safeGet(() => api.receiptVerify(canonicalId))
    : { reachable: false, data: null } as const;
  const receiptValid = receiptRes.reachable ? receiptRes.data.valid : null;

  return (
    <>
      <Hero reachable={reachable} controllerVersion={controllerVersion} />

      {/* Canonical proof of action 27, above the fold on scroll. */}
      <Band>
        <Appear className="max-w-3xl">
          <Label>The proof, before the pitch</Label>
          <h2 className="mt-3 text-3xl font-semibold leading-snug tracking-tight text-bone sm:text-4xl">
            One external agent paid. Bondsman locked a bond. A watchdog
            challenged. The contract took the bond.
          </h2>
          <p className="mt-4 max-w-prose leading-relaxed text-muted">
            The card below is the canonical production proof for Action No.
            0027. It is not a mockup. Every hash opens on the Casper testnet
            explorer.
          </p>
        </Appear>
        <div className="mt-8">
          {canonical ? (
            <CanonicalSummary proof={canonical} receiptValid={receiptValid} />
          ) : (
            <div className="rounded-lg border border-dashed border-rule bg-surface/40 p-8 text-sm leading-relaxed text-muted">
              <p className="text-bone">Live canonical proof unavailable</p>
              <p className="mt-2">
                The backend is not responding right now. Action No. 0027 remains
                settled on Casper testnet. Try again in a moment, or open the
                receipt directly from the Proof Center.
              </p>
              <Link
                href="/proof"
                className="mt-4 inline-block text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
              >
                Open the Proof Center
              </Link>
            </div>
          )}
        </div>
      </Band>

      {/* Why a normal API response is not enough. */}
      <Band>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <Appear className="max-w-md">
            <Label>The gap</Label>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              An HTTP 200 is not accountability.
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              Autonomous financial agents already move real money. When one is
              wrong, the loss lands on someone downstream. Bondsman turns each
              consequential action into a bond posted before execution, a
              contradictory-evidence window after it, and a portable proof
              anyone can verify. The agent is answerable in economic terms, not
              apologetic ones.
            </p>
          </Appear>
          <Diagram
            name="lifecycle"
            alt="Bond, execute, challenge window, then refund or slash."
          />
        </div>
      </Band>

      {/* Architecture. Who does what. */}
      <Band>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Diagram
            name="agent-economy"
            alt="An external agent pays a paid quote. The approver posts a bond and executes. The deterministic watchdog challenges delayed contradiction evidence. The contract slashes the bond, funding the challenger and the reserve."
            className="order-2 lg:order-1"
          />
          <Appear className="order-1 max-w-md lg:order-2">
            <Label>Approver and watchdog</Label>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              Two accounts, one contract, no human referee.
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              A model-driven approver posts the bond and executes the payout. A
              deterministic watchdog runs independently and challenges when
              signed contradiction evidence arrives. The Casper contract, not
              the operator, decides the outcome.
            </p>
            <Link
              href="/how-it-works"
              className="mt-6 inline-block text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
            >
              How it works, end to end
            </Link>
          </Appear>
        </div>
      </Band>

      {/* Honest scope. */}
      <Band>
        <WhatIsReal />
      </Band>

      {/* Integration CTA. */}
      <Band className="border-t border-rule">
        <Appear className="max-w-3xl">
          <h2 className="text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
            No bond, no action.
          </h2>
          <p className="mt-5 max-w-prose leading-relaxed text-muted">
            Bondsman ships as an A2A agent and MCP endpoint. Any autonomous
            agent can discover it, buy a paid quote through x402, and act under
            an economic accountability layer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/build"
              className="rounded-md bg-accent px-7 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
            >
              Integrate with Bondsman
            </Link>
            <Link
              href="/proof"
              className="rounded-md border border-rule px-7 py-3 text-bone transition-colors hover:border-accent/50"
            >
              Open the proof
            </Link>
          </div>
          <div className="mt-8 border-t border-rule pt-6">
            <p className="text-xs text-muted">
              Get updates when Bondsman moves past testnet.
            </p>
            <div className="mt-3 max-w-md">
              <EmailCapture />
            </div>
          </div>
        </Appear>
      </Band>
    </>
  );
}

function Band({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-6 py-20 sm:py-24 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
