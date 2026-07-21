import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import {
  CANONICAL_ACTION_27_PROOF,
  CANONICAL_ACTION_27_RECEIPT_VERIFICATION,
} from '@/lib/canonical-action-27-fallback';
import Hero from '@/components/landing/Hero';
import CanonicalSummary from '@/components/proof/CanonicalSummary';
import WhatIsReal from '@/components/proof/WhatIsReal';
import Diagram from '@/components/Diagram';
import Appear from '@/components/ui/Appear';
import {
  Container,
  Label,
  PanelGrid,
  Section,
  SectionHeader,
  StatusPill,
} from '@/components/ui/Primitives';

export const revalidate = 30;

type HealthMode = 'healthy' | 'degraded' | 'unreachable';

function resolveHealth(
  res: Awaited<ReturnType<typeof safeGet<Awaited<ReturnType<typeof api.health>>>>>,
): { mode: HealthMode; reason: string | null } {
  if (!res.reachable) return { mode: 'unreachable', reason: null };
  const h = res.data as unknown as {
    ok?: boolean;
    spending?: { code?: string; tripped?: boolean };
    integrator?: { running?: boolean; limitation?: string | null };
  };
  if (h.ok === true) return { mode: 'healthy', reason: null };
  const reasons: string[] = [];
  if (h.spending?.tripped) reasons.push(`spend circuit ${h.spending.code ?? 'tripped'}`);
  if (h.integrator?.limitation) reasons.push(String(h.integrator.limitation));
  if (h.integrator && h.integrator.running === false) reasons.push('integrator paused');
  return {
    mode: 'degraded',
    reason: reasons.length ? reasons.join(' · ') : 'protection limits reached',
  };
}

export default async function Home() {
  const [healthRes, canonicalRes] = await Promise.all([
    safeGet(() => api.health()),
    safeGet(() => api.canonicalProof()),
  ]);

  const { mode: healthMode, reason: degradedReason } = resolveHealth(healthRes);
  const liveCanonical = canonicalRes.reachable ? canonicalRes.data : null;
  const canonical = liveCanonical ?? CANONICAL_ACTION_27_PROOF;
  const canonicalId = canonical?.actionId ?? '27';

  const receiptRes = liveCanonical
    ? await safeGet(() => api.receiptVerify(canonicalId))
    : ({ reachable: false, data: null } as const);
  const receiptValid = receiptRes.reachable
    ? receiptRes.data.valid
    : CANONICAL_ACTION_27_RECEIPT_VERIFICATION.valid;

  return (
    <>
      <Hero
        healthMode={healthMode}
        degradedReason={degradedReason}
        canonical={canonical}
      />

      {/* Problem */}
      <Section id="problem" tone="raised">
        <Container>
          <SectionHeader
            eyebrow="Problem"
            title="Autonomous finance needs a cost for being wrong."
            lede="Agents can already request payments, quotes and execution. The missing step is collateral posted before the action, with a rule for what happens when the outcome fails."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div className="rounded-lg border border-rule bg-surface p-6">
              <Label>Before Bondsman</Label>
              <p className="mt-4 text-2xl font-semibold leading-tight text-bone">
                The agent can be approved, paid and wrong, while the loss stays outside the system.
              </p>
            </div>
            <div className="rounded-lg border border-rule bg-ink p-6">
              <Label>After Bondsman</Label>
              <p className="mt-4 text-2xl font-semibold leading-tight text-bone">
                The agent acts only after a paid quote and a bond. If objective evidence proves failure, the bond pays the consequence.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Product loop */}
      <Section id="product-loop">
        <Container>
          <SectionHeader
            eyebrow="Product loop"
            title="One loop from intent to receipt"
            lede="Bondsman turns a financial action into a priced commitment, a locked bond, a monitored outcome and a signed receipt."
          />
          <PanelGrid cols={4} className="mt-10" gap="lg">
            <ProductStep
              n="01"
              title="Price the action"
              body="The scenario becomes a fault class, verifier and minimum bond."
            />
            <ProductStep
              n="02"
              title="Bind the payer"
              body="The paid quote is tied to the wallet that settled it."
            />
            <ProductStep
              n="03"
              title="Lock collateral"
              body="Casper holds the bond before the agent action is accepted."
              primary
            />
            <ProductStep
              n="04"
              title="Settle consequence"
              body="A valid challenge turns failure into a slash, reward and receipt."
            />
          </PanelGrid>
        </Container>
      </Section>

      {/* Create action */}
      <Section id="create-action" tone="raised">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <Label>Create action</Label>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
                Create a bonded action in the browser.
              </h2>
              <p className="mt-5 max-w-prose leading-relaxed text-muted">
                Start without a wallet. Describe the action, review the priced policy, then connect Casper Wallet only when you are ready to pay for a quote and submit a real action.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/app/new"
                  className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Create bonded action
                </Link>
                <Link
                  href="/build"
                  className="rounded-md border border-rule px-5 py-2.5 text-sm text-bone transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  See integration guide
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-rule bg-surface p-6">
              <Label>Example action</Label>
              <div className="mt-4 space-y-4">
                <PreviewRow label="Action" value="Supplier payment" />
                <PreviewRow label="Risk tier" value="High" />
                <PreviewRow label="Minimum bond" value="2,800 csprUSD" tone="accent" />
                <PreviewRow label="Evidence" value="Signed delivery attestation" />
                <div className="flex items-center justify-between border-t border-rule pt-3 text-xs">
                  <span className="text-muted">Wallet</span>
                  <StatusPill tone="info">CONNECT ONLY TO EXECUTE</StatusPill>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Real historical consequence */}
      <Section id="real-consequence">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Label>Real historical consequence</Label>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
                The AI was wrong and lost its own money.
              </h2>
              <p className="mt-5 max-w-prose text-base leading-relaxed text-muted">
                The approver accepted the action. Later, signed buyer evidence proved that delivery failed. The independent watchdog challenged the action. The Casper contract slashed the posted bond. The result is preserved in a signed portable receipt.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/proof/27"
                  className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Inspect Action 27
                </Link>
              </div>
            </div>
            <div>
              <CanonicalSummary proof={canonical} receiptValid={receiptValid} />
            </div>
          </div>
        </Container>
      </Section>

      {/* Developer integration */}
      <Section id="developer-integration" tone="raised">
        <Container>
          <SectionHeader
            eyebrow="Developer integration"
            title="Integrate the paid product loop."
            lede="Agents can discover Bondsman through A2A, use MCP tools for design and verification, or call the paid HTTP surface directly."
          />
          <PanelGrid cols={4} className="mt-10" gap="lg">
            <AuthorityCard
              title="Design"
              body="Read templates and price a scenario before any payment is required."
              tag="NO WALLET"
            />
            <AuthorityCard
              title="Pay quote"
              body="Settle the quote fee with the same payer that will authorize submit."
              tag="X402"
            />
            <AuthorityCard
              title="Submit"
              body="Send the payer signed authorization with an idempotency key."
              tag="SIGNED"
            />
            <AuthorityCard
              title="Verify"
              body="Poll the action, verify the receipt and retain portable proof."
              tag="RECEIPT"
            />
          </PanelGrid>
          <Appear className="mt-12">
            <Diagram
              name="agent-economy"
              size="full"
              alt="An external agent pays a quote through x402. The approver posts a bond and executes. The watchdog submits a challenge with signed delivery evidence. The contract slashes the bond and splits the collateral into a reward and a reserve credit."
            />
          </Appear>
        </Container>
      </Section>

      {/* Casper value */}
      <Section id="casper" tone="ruled">
        <Container>
          <SectionHeader
            eyebrow="Casper value"
            title="Bonds are useful because Casper can hold and settle them."
            lede="The chain is not decoration. Casper holds collateral, records challenges, resolves slashes and gives agents receipts they can carry across integrations."
          />
          <PanelGrid cols={3} className="mt-10">
            <FactCard
              title="Real x402 settlement"
              body="Every paid quote settles WCSPR on casper:casper-test through the x402 v2 exact scheme."
              status="LIVE"
            />
            <FactCard
              title="MCP tools"
              body="A published MCP package exposes design, verification and paid HTTP tools for external agents."
              status="LIVE"
              statusTone="ok"
            />
            <FactCard
              title="A2A agent card"
              body="A well known agent card advertises the bonded execution skills to any A2A aware agent."
              status="LIVE"
              statusTone="ok"
            />
            <FactCard
              title="Policy manifest"
              body="A signed manifest carries the fault class, verifier, evidence source and bond policy an integrator needs."
              status="READY"
              statusTone="info"
            />
            <FactCard
              title="Delivery adapter"
              body="Invoice and procurement delivery are supported by the historical verifier path and ready for partner integration."
              status="SUPPORTED"
              statusTone="info"
            />
            <FactCard
              title="Adapter blueprints"
              body="Treasury guardrails, DEX execution and x402 paid service delivery remain adapter blueprints, not deployed customer flows."
              status="BLUEPRINT"
              statusTone="info"
            />
          </PanelGrid>
        </Container>
      </Section>

      {/* Honest scope */}
      <Section>
        <Container>
          <WhatIsReal />
        </Container>
      </Section>

      {/* Final CTA */}
      <Section tone="ruled">
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
              No bond, no action.
            </h2>
            <p className="mt-5 max-w-prose leading-relaxed text-muted">
              Bondsman ships as an A2A agent, an MCP endpoint and a paid HTTP surface. Any autonomous agent can discover it, buy a quote through x402 and act under an economic accountability layer settled on Casper.
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
                Open the Proof Console
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function ProductStep({
  n,
  title,
  body,
  primary = false,
}: {
  n: string;
  title: string;
  body: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border p-6 ${
        primary
          ? 'border-accent/40 bg-accent/[0.05]'
          : 'border-rule bg-surface'
      }`}
    >
      <span className={`font-mono text-sm ${primary ? 'text-accent' : 'text-muted'}`}>
        {n}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-bone">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function AuthorityCard({
  title,
  body,
  tag,
}: {
  title: string;
  body: string;
  tag: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-rule bg-surface p-6">
      <StatusPill tone="info">{tag}</StatusPill>
      <h3 className="mt-4 text-lg font-semibold text-bone">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function FactCard({
  title,
  body,
  status,
  statusTone = 'ok',
}: {
  title: string;
  body: string;
  status: string;
  statusTone?: 'ok' | 'info' | 'warn';
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-rule bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-bone">{title}</h3>
        <StatusPill tone={statusTone}>{status}</StatusPill>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'accent';
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={`font-mono tabular ${tone === 'accent' ? 'text-accent' : 'text-bone'}`}
      >
        {value}
      </span>
    </div>
  );
}
