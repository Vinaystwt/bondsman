'use client';

import { useMemo, useState } from 'react';
import { Label, StatusPill } from '@/components/ui/Primitives';
import CopyHash from '@/components/ui/CopyHash';
import { formatMoney, truncateHash } from '@/lib/format';
import type {
  AssuranceAnalysis,
  AssuranceRiskFactor,
  AssuranceTemplate,
} from '@/lib/types';

/**
 * Four layer analysis result:
 *   1. AI interpretation (live model or deterministic fallback, honestly labelled)
 *   2. Deterministic policy (bond, formula, verifier)
 *   3. Verifier and evidence (executable vs blueprint)
 *   4. Integration manifest (copy, download, view schema)
 */
export default function AnalysisResult({
  analysis,
  template,
}: {
  analysis: AssuranceAnalysis;
  template: AssuranceTemplate;
}) {
  return (
    <div className="space-y-6">
      <ModelLayer analysis={analysis} />
      <PolicyLayer analysis={analysis} />
      <VerifierLayer analysis={analysis} template={template} />
      <ManifestLayer analysis={analysis} />
    </div>
  );
}

function ModelLayer({ analysis }: { analysis: AssuranceAnalysis }) {
  const m = analysis.modelAnalysis;
  const isLive = m.source === 'live_model';
  const isFallback = m.source === 'deterministic_fallback';
  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Layer 1 · AI interpretation</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            {isLive ? 'Live AI risk interpretation' : 'Deterministic fallback interpretation'}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {isLive && m.model ? `Model: ${m.model}` : null}
            {isFallback ? 'Live model unavailable for this analysis.' : null}
          </p>
        </div>
        <StatusPill tone={isLive ? 'ok' : 'warn'}>
          {isLive ? 'LIVE MODEL' : 'DETERMINISTIC FALLBACK'}
        </StatusPill>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-bone">{m.summary}</p>
      <div className="mt-5 grid gap-3">
        {m.riskFactors.map((rf) => (
          <RiskFactorRow key={rf.code} factor={rf} />
        ))}
      </div>
      <dl className="mt-6 grid gap-4 border-t border-rule pt-4 text-sm sm:grid-cols-3">
        <Field label="Model confidence">
          <span className="font-mono text-bone tabular">
            {(m.confidence * 100).toFixed(0)}%
          </span>
        </Field>
        <Field label="Recommended decision">
          <span className="text-bone">{m.recommendedDecision.replace(/_/g, ' ')}</span>
        </Field>
        <Field label="Analysis source">
          <span className="font-mono text-bone">{m.source}</span>
        </Field>
      </dl>
    </section>
  );
}

function RiskFactorRow({ factor }: { factor: AssuranceRiskFactor }) {
  const tone =
    factor.severity === 'high'
      ? 'fault'
      : factor.severity === 'medium'
        ? 'warn'
        : 'ok';
  return (
    <div className="grid gap-2 rounded border border-rule bg-ink p-3 text-sm sm:grid-cols-[9rem_1fr] sm:items-baseline">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={tone as 'fault' | 'warn' | 'ok'}>
          {factor.severity}
        </StatusPill>
        <span className="serial text-[0.6rem] text-muted">{factor.code}</span>
      </div>
      <p className="text-bone/90">{factor.explanation}</p>
    </div>
  );
}

function PolicyLayer({ analysis }: { analysis: AssuranceAnalysis }) {
  const p = analysis.policy;
  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Layer 2 · Deterministic policy prices the bond</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            Minimum bond calculated by the policy engine
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            The AI interprets the scenario. The deterministic policy calculates
            the minimum bond. Authority: {p.authority}. Formula: {p.formulaVersion}.
          </p>
        </div>
        <StatusPill tone="info">RISK TIER {p.riskTier.toUpperCase()}</StatusPill>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Estimated minimum bond" value={formatMoney(p.estimatedMinimumBond)} tone="accent" />
        <Metric label="Basis points" value={`${p.bondBasisPoints} bps`} />
        <Metric label="Challenge window" value={`${p.challengeWindowSeconds}s`} />
        <Metric label="Implementation" value={p.implementationStatus.replace(/_/g, ' ')} />
      </dl>
      {p.evidenceRequirements.length > 0 && (
        <div className="mt-5 border-t border-rule pt-4">
          <p className="serial text-[0.6rem] text-muted">Evidence requirements</p>
          <ul className="mt-2 space-y-1 text-sm text-bone/90">
            {p.evidenceRequirements.map((e) => (
              <li key={e} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function VerifierLayer({
  analysis,
  template,
}: {
  analysis: AssuranceAnalysis;
  template: AssuranceTemplate;
}) {
  const isExecutable = analysis.policy.executableNow;
  const p = analysis.policy;
  const m = analysis.manifest;
  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Layer 3 · Verifier and evidence</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            {isExecutable
              ? 'Deployed fault class and verifier'
              : 'Proposed fault class and verifier for this blueprint'}
          </h3>
        </div>
        <StatusPill tone={isExecutable ? 'ok' : 'info'}>
          {isExecutable ? 'EXECUTABLE TODAY' : 'INTEGRATION BLUEPRINT'}
        </StatusPill>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={isExecutable ? 'Fault class' : 'Current fault class'}>
          <span className="text-bone">
            {p.faultClass ?? <span className="text-muted">not deployed</span>}
          </span>
        </Field>
        <Field label={isExecutable ? 'Verifier' : 'Current verifier'}>
          <span className="text-bone">
            {p.verifier ?? <span className="text-muted">not deployed</span>}
          </span>
        </Field>
        <Field label="Adapter">
          <span className="text-bone">
            {template.currentAdapter ?? (
              <span className="text-muted">not deployed</span>
            )}
          </span>
        </Field>
        {!isExecutable && (
          <>
            <Field label="Proposed fault class">
              <span className="text-bone">
                {m.proposedFaultClass ?? template.proposedFaultClass ?? 'not proposed'}
              </span>
            </Field>
            <Field label="Proposed verifier">
              <span className="text-bone">
                {m.proposedVerifier ?? template.proposedVerifier ?? 'not proposed'}
              </span>
            </Field>
          </>
        )}
      </dl>
      {template.objectiveEvidence.length > 0 && (
        <div className="mt-5 border-t border-rule pt-4">
          <p className="serial text-[0.6rem] text-muted">Required evidence</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {template.objectiveEvidence.map((e) => (
              <li
                key={e}
                className="rounded border border-rule bg-ink px-2.5 py-1 text-bone"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ManifestLayer({ analysis }: { analysis: AssuranceAnalysis }) {
  const m = analysis.integrationManifest;
  const isExecutable = m.executableNow;
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const raw = useMemo(() => JSON.stringify(m, null, 2), [m]);

  async function copyManifest() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function downloadManifest() {
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bondsman-assurance-manifest-${m.template.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Layer 4 · Integration manifest</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            Signed integration manifest for this scenario
          </h3>
        </div>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Scenario hash">
          <CopyHash value={analysis.scenarioHash} label={truncateHash(analysis.scenarioHash)} />
        </Field>
        <Field label="Model analysis hash">
          <CopyHash value={m.modelAnalysisHash} label={truncateHash(m.modelAnalysisHash)} />
        </Field>
        <Field label="Policy result hash">
          <CopyHash value={m.policyResultHash} label={truncateHash(m.policyResultHash)} />
        </Field>
        <Field label="Manifest hash">
          <CopyHash value={m.manifestHash} label={truncateHash(m.manifestHash)} />
        </Field>
        <Field label="Casper network">{m.casperNetwork}</Field>
        <Field label="Amount">
          <span className="font-mono">
            {formatMoney(m.amount.value)} {m.amount.asset}
          </span>
        </Field>
      </dl>
      {isExecutable && m.quoteRequestShape && (
        <div className="mt-5 rounded border border-rule bg-ink p-4">
          <p className="serial text-[0.6rem] text-muted">Quote request shape</p>
          <pre className="mt-2 overflow-auto text-[11px] leading-relaxed text-bone">
            <code className="font-mono">
{`${m.quoteRequestShape.method} ${m.quoteRequestShape.path}
{
  "amount": "${m.quoteRequestShape.amount}",
  "faultClass": "${m.quoteRequestShape.faultClass}"
}`}
            </code>
          </pre>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyManifest}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink hover:bg-accent-strong"
        >
          {copied ? 'Copied' : 'Copy manifest'}
        </button>
        <button
          type="button"
          onClick={downloadManifest}
          className="rounded-md border border-rule bg-ink px-4 py-2 text-sm text-bone hover:border-accent/50"
        >
          Download manifest
        </button>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="rounded-md border border-rule bg-ink px-4 py-2 text-sm text-muted hover:text-bone"
        >
          {showRaw ? 'Hide schema and steps' : 'View schema and steps'}
        </button>
      </div>
      {showRaw && (
        <pre className="mt-4 max-h-96 overflow-auto rounded border border-rule bg-ink p-3 text-[11px] leading-relaxed text-bone">
          <code className="font-mono">{raw}</code>
        </pre>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="serial text-[0.6rem] text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-bone break-all">{children}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'bone',
}: {
  label: string;
  value: string;
  tone?: 'bone' | 'accent';
}) {
  const toneClass = tone === 'accent' ? 'text-accent' : 'text-bone';
  return (
    <div className="rounded-md border border-rule bg-ink px-4 py-3">
      <dt className="serial text-[0.6rem] text-muted">{label}</dt>
      <dd className={`mt-2 font-mono text-lg tabular ${toneClass}`}>{value}</dd>
    </div>
  );
}
