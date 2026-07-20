import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
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
  const canonical = canonicalRes.reachable ? canonicalRes.data : null;
  const canonicalId = canonical?.actionId ?? '27';

  const receiptRes = canonical
    ? await safeGet(() => api.receiptVerify(canonicalId))
    : ({ reachable: false, data: null } as const);
  const receiptValid = receiptRes.reachable ? receiptRes.data.valid : null;

  return (
    <>
      <Hero
        healthMode={healthMode}
        degradedReason={degradedReason}
        canonical={canonical}
      />

      {/* Choose your path */}
      <Section id="choose" tone="raised">
        <Container>
          <SectionHeader
            eyebrow="Get started"
            title="Choose what you want to do"
            lede="Three ways in. Understand the mechanism, verify the real proof, or design accountability for your own agent."
          />
          <PanelGrid cols={3} className="mt-10">
            <PathCard
              href="#how-it-works"
              eyebrow="Understand"
              title="Understand the product"
              body="See why autonomous actions need economic accountability."
            />
            <PathCard
              href="/proof"
              eyebrow="Verify"
              title="Verify the real proof"
              body="Inspect a real x402 payment, bonded action, slash and signed receipt."
              primary
            />
            <PathCard
              href="/assurance"
              eyebrow="Design"
              title="Design protection for an agent"
              body="Describe your own agent action and receive an assurance policy."
            />
          </PanelGrid>
        </Container>
      </Section>

      {/* The memorable failure story */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Label>The story</Label>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
                The AI was wrong and lost its own money.
              </h2>
              <p className="mt-5 max-w-prose text-base leading-relaxed text-muted">
                The approver accepted the action. Later, signed buyer evidence proved that delivery failed. The independent watchdog challenged the action. The Casper contract slashed the posted bond. The result is preserved in a signed portable receipt.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/proof"
                  className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
                >
                  Inspect Action 27
                </Link>
              </div>
            </div>
            <div>
              {canonical ? (
                <CanonicalSummary proof={canonical} receiptValid={receiptValid} />
              ) : (
                <div className="rounded-lg border border-dashed border-rule bg-surface/40 p-8 text-sm leading-relaxed text-muted">
                  <p className="text-bone">Live canonical proof unavailable</p>
                  <p className="mt-2">
                    The backend is not responding right now. Action No. 0027 remains settled on Casper testnet. Try again in a moment.
                  </p>
                  <Link
                    href="/proof"
                    className="mt-4 inline-block text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                  >
                    Open the Proof Console
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Container>
      </Section>

      {/* How Bondsman works */}
      <Section id="how-it-works" tone="raised">
        <Container>
          <SectionHeader
            eyebrow="How it works"
            title="Four authorities. One accountable action."
            lede="Bondsman separates model interpretation from deterministic pricing, an independent watchdog and Casper contracts that hold the collateral."
          />
          <PanelGrid cols={4} className="mt-10" gap="lg">
            <AuthorityCard
              title="AI interpretation"
              body="The model reads the scenario and identifies meaningful risk. It does not calculate the bond and it does not verify evidence."
              tag="MODEL DRIVEN"
            />
            <AuthorityCard
              title="Policy engine"
              body="The deterministic policy calculates the minimum bond and selects the supported evidence rules for the fault class."
              tag="DETERMINISTIC"
            />
            <AuthorityCard
              title="Watchdog"
              body="The autonomous watchdog observes objective evidence and independently submits a valid challenge when it applies."
              tag="INDEPENDENT"
            />
            <AuthorityCard
              title="Casper contracts"
              body="The contracts hold the collateral, resolve the fault and settle the final economic consequence on chain."
              tag="ON CHAIN"
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

      {/* Design your own */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <Label>Assurance Studio</Label>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
                Design accountability for your own agent.
              </h2>
              <p className="mt-5 max-w-prose leading-relaxed text-muted">
                Describe an autonomous action. The live model interprets the risk. The deterministic policy prices the minimum bond. You receive a portable integration manifest.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/assurance"
                  className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
                >
                  Design your own policy
                </Link>
                <Link
                  href="/build"
                  className="rounded-md border border-rule px-5 py-2.5 text-sm text-bone transition-colors hover:border-accent/50"
                >
                  See the integration guide
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-rule bg-surface p-6">
              <Label>Example result</Label>
              <div className="mt-4 space-y-4">
                <PreviewRow label="Action" value="Supplier payment" />
                <PreviewRow label="Risk tier" value="High" />
                <PreviewRow label="Minimum bond" value="2,800 csprUSD" tone="accent" />
                <PreviewRow label="Evidence" value="Signed delivery attestation" />
                <div className="flex items-center justify-between border-t border-rule pt-3 text-xs">
                  <span className="text-muted">Status</span>
                  <StatusPill tone="ok">EXECUTABLE TODAY</StatusPill>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Casper ecosystem */}
      <Section id="casper" tone="ruled">
        <Container>
          <SectionHeader
            eyebrow="Casper ecosystem"
            title="Built as reusable Casper agent infrastructure"
            lede="Bondsman is more than one hackathon proof. Its surfaces plug directly into how Casper agents will discover services, price risk and prove outcomes."
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
              title="Assurance manifest"
              body="A signed manifest carries the fault class, verifier, evidence source and bond policy an integrator needs."
              status="READY"
              statusTone="info"
            />
            <FactCard
              title="RWA adapter"
              body="Invoice or procurement delivery is executable today against the deployed verifier."
              status="EXECUTABLE TODAY"
              statusTone="ok"
            />
            <FactCard
              title="DeFi and treasury blueprints"
              body="Treasury guardrails, DEX execution and x402 paid service delivery are blueprints ready for a design partner."
              status="INTEGRATION BLUEPRINT"
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

function PathCard({
  href,
  eyebrow,
  title,
  body,
  primary = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between rounded-lg border p-6 transition-colors ${
        primary
          ? 'border-accent/40 bg-accent/[0.05] hover:border-accent/70 hover:bg-accent/10'
          : 'border-rule bg-surface hover:border-accent/40'
      }`}
    >
      <div>
        <Label className={primary ? 'text-accent' : undefined}>{eyebrow}</Label>
        <h3 className="mt-3 text-xl font-semibold text-bone">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm text-accent">
        Continue
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
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
