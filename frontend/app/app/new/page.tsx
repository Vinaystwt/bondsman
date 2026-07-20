import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import {
  Container,
  Label,
  PanelGrid,
  SectionHeader,
  StatusPill,
} from '@/components/ui/Primitives';

export const metadata = {
  title: 'Create Bonded Action',
  description:
    'Create a live Bondsman bonded action through policy, payment, payer authorization and action monitoring.',
};

export const revalidate = 20;

const STEPS = [
  ['Choose policy', 'Delivery contradiction is the default executable path. Duplicate claim stays available as an advanced test vector.'],
  ['Describe action', 'Collect the principal amount, confidence, counterparty status, evidence source, tolerated loss, urgency and evidence signer.'],
  ['Calculate policy', 'Call the live Assurance API and show model risk plus deterministic minimum bond.'],
  ['Review parties', 'Separate payer, acting agent, bond funder, transaction submitter, evidence signer and watchdog.'],
  ['Connect payer', 'Connect Casper Wallet only when continuing to the paid quote.'],
  ['Payment requirement', 'Request the live 402 payment requirement and show amount, asset, network, pay to and timeout.'],
  ['Settle payment', 'Use wallet typed data signing for WCSPR x402 authorization and prevent duplicate attempts.'],
  ['Paid quote', 'Display the live payer bound single use quote.'],
  ['Sign authorization', 'Ask the payer to sign the human readable submit authorization.'],
  ['Create action', 'Submit the paid quote exactly once and route to the monitor.'],
] as const;

export default async function NewActionPage() {
  const templatesRes = await safeGet(() => api.assuranceTemplates());

  if (!templatesRes.reachable) {
    return (
      <Container className="py-16">
        <BackendDown />
      </Container>
    );
  }

  const executable = templatesRes.data.templates.filter((template) => template.executableNow);
  const blueprints = templatesRes.data.templates.filter((template) => !template.executableNow);

  return (
    <Container className="space-y-12 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Create bonded action"
        title="Policy first. Wallet only when execution begins."
        lede="This route is the operational home for the full action loop. Phase 4 adds the live policy form, then payment and authorization continue from the same staged surface."
      />

      <div className="rounded-md border border-rule bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>Implementation boundary</Label>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
              This shell does not simulate payment or action creation. Live payment and submit controls will appear only when their state machines are implemented.
            </p>
          </div>
          <StatusPill tone="info">No fake success</StatusPill>
        </div>
      </div>

      <PanelGrid cols={2} gap="lg">
        <section className="rounded-md border border-rule bg-surface p-5">
          <Label>Default executable path</Label>
          <h2 className="mt-2 text-xl font-semibold text-bone">
            Delivery contradiction
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Buyer signed delivery evidence can arrive after execution. If it contradicts the action inside the window, the watchdog can challenge and the contract can slash.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {executable.map((template) => (
              <StatusPill key={template.id} tone="ok">
                {template.name}
              </StatusPill>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-rule bg-surface p-5">
          <Label>Blueprints moved to Build</Label>
          <h2 className="mt-2 text-xl font-semibold text-bone">
            Adapter blueprints
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Treasury, DEX and x402 service delivery remain integration blueprints until their deployed adapters exist.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {blueprints.map((template) => (
              <StatusPill key={template.id} tone="info">
                {template.name}
              </StatusPill>
            ))}
          </div>
        </section>
      </PanelGrid>

      <section>
        <Label>Execution journey</Label>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="rounded-md border border-rule bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 font-mono text-xs text-accent">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-bone">{title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="rounded-md border border-rule bg-surface/60 p-5">
        <Label>Next implementation phase</Label>
        <p className="mt-2 text-sm text-muted">
          Phase 4 turns the first three steps into the live policy and bond flow. Build already contains the HTTP details for integrators.
        </p>
        <Link
          href="/build"
          className="mt-4 inline-flex rounded-md border border-rule px-4 py-2 text-sm text-bone transition-colors hover:border-accent/50"
        >
          Open Build
        </Link>
      </div>
    </Container>
  );
}
