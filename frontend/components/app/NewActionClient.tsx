'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AnalysisResult from '@/components/assurance/AnalysisResult';
import ScenarioForm from '@/components/assurance/ScenarioForm';
import CopyHash from '@/components/ui/CopyHash';
import { Label, StatusPill } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/States';
import { clientApi } from '@/lib/api';
import { formatIsoUtc, formatWcspr, truncateHash } from '@/lib/format';
import type {
  AssuranceAnalysis,
  AssuranceAnalyzeRequest,
  AssuranceTemplate,
  X402PaymentResponse,
} from '@/lib/types';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type ProbeState =
  | { kind: 'idle' }
  | { kind: 'loading'; requestedAt: string }
  | {
      kind: 'ready';
      requestedAt: string;
      status: number;
      x402?: X402PaymentResponse;
      other?: unknown;
      error?: string;
    };

interface Props {
  templates: AssuranceTemplate[];
  liveModelAvailable: boolean;
  liveQuoteProbeAvailable: boolean;
}

const STEP_LABELS: { step: Step; label: string }[] = [
  { step: 1, label: 'Choose policy' },
  { step: 2, label: 'Describe action' },
  { step: 3, label: 'Calculate policy' },
  { step: 4, label: 'Review parties' },
  { step: 5, label: 'Connect payer' },
  { step: 6, label: 'Payment terms' },
];

export default function NewActionClient({
  templates,
  liveModelAvailable,
  liveQuoteProbeAvailable,
}: Props) {
  const searchParams = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const defaultTemplate =
    templates.find((template) => template.id === requestedTemplate && template.executableNow) ??
    templates.find((template) => template.id === 'invoice_delivery') ??
    templates.find((template) => template.executableNow) ??
    null;

  const [selectedId, setSelectedId] = useState<string | null>(defaultTemplate?.id ?? null);
  const [step, setStep] = useState<Step>(defaultTemplate ? 2 : 1);
  const [analysis, setAnalysis] = useState<AssuranceAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });
  const stepRefs = useRef<Record<number, HTMLElement | null>>({});

  const executable = useMemo(
    () => templates.filter((template) => template.executableNow),
    [templates],
  );
  const primary = executable.find((template) => template.id === 'invoice_delivery') ?? executable[0] ?? null;
  const advanced = executable.filter((template) => template.id !== primary?.id);
  const selected = templates.find((template) => template.id === selectedId) ?? null;
  const quoteShape = analysis?.manifest.quoteRequestShape ?? null;
  const canProbe = Boolean(quoteShape && liveQuoteProbeAvailable);

  useEffect(() => {
    stepRefs.current[step]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  function chooseTemplate(id: string) {
    setSelectedId(id);
    setAnalysis(null);
    setProbe({ kind: 'idle' });
    setError(null);
    setStep(2);
  }

  async function runAnalysis(body: AssuranceAnalyzeRequest) {
    setRunning(true);
    setError(null);
    setProbe({ kind: 'idle' });
    try {
      const result = await clientApi.assuranceAnalyze(body);
      setAnalysis(result);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setRunning(false);
    }
  }

  async function requestPaymentRequirement() {
    if (!quoteShape) return;
    const requestedAt = new Date().toISOString();
    setProbe({ kind: 'loading', requestedAt });
    const result = await clientApi.liveQuoteProbe({
      amount: quoteShape.amount,
      faultClass: quoteShape.faultClass,
    });
    setProbe({ kind: 'ready', requestedAt, ...result });
    setStep(6);
  }

  return (
    <div className="space-y-10">
      <StepRail activeStep={step} maxStep={analysis ? 6 : selected ? 2 : 1} onGo={setStep} />

      {!liveModelAvailable && (
        <div className="rounded-md border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200">
          Live AI analysis is unavailable. The deterministic fallback will still calculate the policy.
        </div>
      )}

      <section ref={(node) => { stepRefs.current[1] = node; }} aria-labelledby="new-action-policy">
        <StepHeading
          step={1}
          label="LIVE POLICY"
          title="Choose the executable policy"
          body="Delivery contradiction is the default path for delayed objective evidence. Duplicate claim stays available for advanced testing."
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          {primary ? (
            <PolicyCard
              template={primary}
              selected={selectedId === primary.id}
              tone="primary"
              onSelect={() => chooseTemplate(primary.id)}
            />
          ) : (
            <EmptyState
              title="No executable policy available"
              body="The backend did not return a deployed policy template."
            />
          )}
          <div className="rounded-md border border-rule bg-surface p-5">
            <Label>Advanced test vectors</Label>
            <div className="mt-4 grid gap-3">
              {advanced.length > 0 ? (
                advanced.map((template) => (
                  <PolicyCard
                    key={template.id}
                    template={template}
                    selected={selectedId === template.id}
                    tone="compact"
                    onSelect={() => chooseTemplate(template.id)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted">No advanced executable vector is currently listed.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section ref={(node) => { stepRefs.current[2] = node; }} aria-labelledby="new-action-scenario">
        <StepHeading
          step={2}
          label="CONTROLLED TESTNET INPUT"
          title="Describe the intended action"
          body="The policy engine needs the principal, confidence, counterparty status, objective evidence, tolerated loss and urgency."
        />
        {selected ? (
          <ScenarioForm template={selected} running={running} onSubmit={runAnalysis} />
        ) : (
          <EmptyState title="Choose a policy" body="Select an executable policy to unlock the action form." />
        )}
        {error && (
          <p className="mt-4 rounded-md border border-slash/40 bg-slash/10 px-4 py-3 text-sm text-slash">
            {error}
          </p>
        )}
      </section>

      <section ref={(node) => { stepRefs.current[3] = node; }} aria-labelledby="new-action-policy-result">
        <StepHeading
          step={3}
          label="LIVE ANALYSIS"
          title="Calculate policy and minimum bond"
          body="AI risk interpretation stays separate from deterministic bond pricing and deployed verifier checks."
        />
        {analysis && selected ? (
          <AnalysisResult analysis={analysis} template={selected} />
        ) : (
          <EmptyState title="No policy result yet" body="Analyze the action to see the minimum bond." />
        )}
      </section>

      <section ref={(node) => { stepRefs.current[4] = node; }} aria-labelledby="new-action-parties">
        <StepHeading
          step={4}
          label="LIVE POLICY"
          title="Review responsible parties"
          body="The connected payer authorizes the paid quote. The configured backend accounts fund the bond and submit Casper transactions."
        />
        <PartyReview analysis={analysis} />
      </section>

      <section ref={(node) => { stepRefs.current[5] = node; }} aria-labelledby="new-action-connect">
        <StepHeading
          step={5}
          label="LIVE PAYMENT REQUIREMENT"
          title="Continue to paid quote"
          body="The next phase connects Casper Wallet, settles WCSPR through x402 and returns a payer bound quote."
        />
        <div className="rounded-md border border-rule bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>Payment boundary</Label>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
                This control requests the live payment requirement only. It does not settle payment, issue a paid quote or create an action.
              </p>
            </div>
            <StatusPill tone="info">No payment</StatusPill>
          </div>
          <button
            type="button"
            onClick={requestPaymentRequirement}
            disabled={!canProbe || probe.kind === 'loading'}
            className="mt-5 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {probe.kind === 'loading' ? 'Requesting terms' : 'Request payment requirement'}
          </button>
          {!quoteShape && (
            <p className="mt-3 text-xs text-muted">
              Calculate an executable policy before requesting payment terms.
            </p>
          )}
          {quoteShape && !liveQuoteProbeAvailable && (
            <p className="mt-3 text-xs text-muted">
              The backend reports that the live quote probe is unavailable.
            </p>
          )}
        </div>
      </section>

      <section ref={(node) => { stepRefs.current[6] = node; }} aria-labelledby="new-action-payment">
        <StepHeading
          step={6}
          label="LIVE PAYMENT REQUIREMENT"
          title="Review payment terms"
          body="A 402 response is the expected unpaid result. A paid quote appears only after wallet settlement in the next phase."
        />
        <PaymentRequirement probe={probe} />
      </section>
    </div>
  );
}

function StepRail({
  activeStep,
  maxStep,
  onGo,
}: {
  activeStep: Step;
  maxStep: number;
  onGo: (step: Step) => void;
}) {
  return (
    <ol className="grid gap-2 rounded-md border border-rule bg-surface/70 p-2 md:grid-cols-6">
      {STEP_LABELS.map((item) => {
        const enabled = item.step <= maxStep;
        const active = activeStep === item.step;
        return (
          <li key={item.step}>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onGo(item.step)}
              className={`flex h-full min-h-14 w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${
                active
                  ? 'bg-accent/10 text-accent'
                  : enabled
                    ? 'text-bone hover:bg-ink'
                    : 'text-muted/45'
              }`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current font-mono text-[0.65rem]">
                {item.step}
              </span>
              <span>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({
  step,
  label,
  title,
  body,
}: {
  step: number;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mb-4 flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 font-mono text-sm text-accent">
        {step}
      </span>
      <div>
        <Label>{label}</Label>
        <h2 className="mt-1 text-xl font-semibold text-bone">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

function PolicyCard({
  template,
  selected,
  tone,
  onSelect,
}: {
  template: AssuranceTemplate;
  selected: boolean;
  tone: 'primary' | 'compact';
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-full rounded-md border p-5 text-left transition-colors ${
        selected
          ? 'border-accent/60 bg-accent/[0.05]'
          : 'border-rule bg-surface hover:border-accent/40'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>{template.category}</Label>
        <StatusPill tone="ok">Executable</StatusPill>
      </div>
      <h3 className={`${tone === 'primary' ? 'text-2xl' : 'text-base'} mt-3 font-semibold text-bone`}>
        {template.name}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{template.description}</p>
      <dl className="mt-5 grid gap-3 border-t border-rule pt-4 text-xs sm:grid-cols-2">
        <MiniField label="Fault class">
          {template.supportedFaultClasses.join(', ')}
        </MiniField>
        <MiniField label="Evidence">
          {template.objectiveEvidence.join(', ')}
        </MiniField>
        <MiniField label="Adapter">
          {template.currentAdapter ?? 'not listed'}
        </MiniField>
      </dl>
    </button>
  );
}

function PartyReview({ analysis }: { analysis: AssuranceAnalysis | null }) {
  const faultClass = analysis?.policy.faultClass ?? 'pending policy';
  const verifier = analysis?.policy.verifier ?? 'pending policy';
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Party label="Payer" value="Connected Casper Wallet payer" note="Pays the x402 quote and signs submit authorization." />
      <Party label="Acting agent" value="Configured backend agent" note="Creates the bonded action after the paid quote is authorized." />
      <Party label="Bond funder" value="Configured backend agent account" note="Funds the bond on the current backend architecture." />
      <Party label="Transaction submitter" value="Backend deployer and agent accounts" note="Submits Casper transactions after payer authorization." />
      <Party label="Evidence signer" value="Buyer Ed25519 public key" note="Required for delivery contradiction submit evidence binding." />
      <Party label="Watchdog" value="Autonomous watchdog service" note={`Challenges objective faults through ${faultClass} and ${verifier}.`} />
    </div>
  );
}

function Party({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface p-4">
      <Label>{label}</Label>
      <p className="mt-2 font-medium text-bone">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{note}</p>
    </div>
  );
}

function PaymentRequirement({ probe }: { probe: ProbeState }) {
  if (probe.kind === 'idle') {
    return (
      <EmptyState
        title="No payment requirement requested"
        body="Request payment terms after policy calculation."
      />
    );
  }

  if (probe.kind === 'loading') {
    return (
      <div className="rounded-md border border-rule bg-surface p-5">
        <StatusPill tone="info">Live request</StatusPill>
        <p className="mt-3 text-sm text-muted">
          Requested at {formatIsoUtc(probe.requestedAt)}
        </p>
      </div>
    );
  }

  const req = probe.x402?.payment.accepts[0];
  const expected = probe.status === 402 && Boolean(req);

  return (
    <div className="rounded-md border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>LIVE PAYMENT REQUIREMENT</Label>
          <h3 className="mt-2 text-lg font-semibold text-bone">
            {expected ? 'Payment terms returned' : 'Unexpected response'}
          </h3>
          <p className="mt-2 text-sm text-muted">
            Requested at {formatIsoUtc(probe.requestedAt)}
          </p>
        </div>
        <StatusPill tone={expected ? 'ok' : 'warn'}>HTTP {probe.status}</StatusPill>
      </div>

      {probe.error && (
        <p className="mt-4 rounded border border-slash/40 bg-slash/10 px-3 py-2 text-sm text-slash">
          Network error while requesting payment terms.
        </p>
      )}

      {req ? (
        <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <MiniField label="Amount">{formatWcspr(req.amount)}</MiniField>
          <MiniField label="Asset">
            {req.extra?.symbol ?? 'WCSPR'}
          </MiniField>
          <MiniField label="Network">{req.network}</MiniField>
          <MiniField label="Pay to">
            <CopyHash value={req.payTo} label={truncateHash(req.payTo)} />
          </MiniField>
          <MiniField label="Asset package">
            <CopyHash value={req.asset} label={truncateHash(req.asset)} />
          </MiniField>
          <MiniField label="Timeout">{req.maxTimeoutSeconds}s</MiniField>
        </dl>
      ) : (
        <pre className="mt-4 max-h-56 overflow-auto rounded border border-rule bg-ink p-3 text-[11px] leading-relaxed text-bone">
          <code>{JSON.stringify(probe.other ?? probe.x402 ?? null, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="serial text-[0.58rem] text-muted">{label}</dt>
      <dd className="mt-1 break-all text-bone">{children}</dd>
    </div>
  );
}
