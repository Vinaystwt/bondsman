'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Label, StatusPill } from '@/components/ui/Primitives';
import TemplateGrid from './TemplateGrid';
import ScenarioForm from './ScenarioForm';
import AnalysisResult from './AnalysisResult';
import { clientApi } from '@/lib/api';
import type {
  AssuranceAnalysis,
  AssuranceAnalyzeRequest,
  AssuranceTemplate,
} from '@/lib/types';

type Step = 1 | 2 | 3;

interface Props {
  templates: AssuranceTemplate[];
  liveModelAvailable: boolean;
}

export default function StudioClient({ templates, liveModelAvailable }: Props) {
  const searchParams = useSearchParams();
  const queryTemplateId = searchParams.get('template');

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (queryTemplateId && templates.some((t) => t.id === queryTemplateId)) {
      return queryTemplateId;
    }
    return null;
  });
  const [step, setStep] = useState<Step>(() => (queryTemplateId ? 2 : 1));
  const [analysis, setAnalysis] = useState<AssuranceAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  useEffect(() => {
    if (step === 2 && step2Ref.current) {
      step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (step === 3 && step3Ref.current) {
      step3Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step]);

  function selectTemplate(id: string) {
    setSelectedId(id);
    setAnalysis(null);
    setError(null);
    setStep(2);
  }

  async function runAnalysis(body: AssuranceAnalyzeRequest) {
    setRunning(true);
    setError(null);
    setErrorDetail(null);
    try {
      const res = await clientApi.assuranceAnalyze(body);
      setAnalysis(res);
      setStep(3);
    } catch (err) {
      setError('The analysis request failed. Try adjusting the inputs and analysing again.');
      setErrorDetail(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-10">
      <StepIndicator step={step} onGo={setStep} enabledSteps={selected ? 3 : 1} />

      {!liveModelAvailable && (
        <div className="rounded-md border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200">
          The live model is currently unavailable. Analysis will run against the
          deterministic fallback and will be labelled accordingly.
        </div>
      )}

      {/* Step 1 · Choose action */}
      <section aria-labelledby="assurance-step-1">
        <div className="mb-4 flex items-baseline gap-3">
          <StepPill number={1} active={step === 1} done={step > 1} />
          <div>
            <h2 id="assurance-step-1" className="text-xl font-semibold text-bone">
              Choose the action
            </h2>
            <p className="text-sm text-muted">
              Bondsman ships two adapters that are executable today and three
              blueprints ready for a design partner.
            </p>
          </div>
        </div>
        <TemplateGrid
          templates={templates}
          selectedId={selectedId}
          onSelect={selectTemplate}
        />
      </section>

      {/* Step 2 · Scenario */}
      <div ref={step2Ref}>
        <section aria-labelledby="assurance-step-2">
          <div className="mb-4 flex items-baseline gap-3">
            <StepPill number={2} active={step === 2} done={step > 2} />
            <div>
              <h2 id="assurance-step-2" className="text-xl font-semibold text-bone">
                Describe the scenario
              </h2>
              <p className="text-sm text-muted">
                Give the model something it can reason about. Money enters as
                human readable csprUSD; the frontend converts to base units.
              </p>
            </div>
          </div>
          {selected ? (
            <ScenarioForm
              template={selected}
              running={running}
              onSubmit={runAnalysis}
            />
          ) : (
            <p className="rounded border border-dashed border-rule bg-surface/40 p-6 text-sm text-muted">
              Choose an action above to unlock the scenario form.
            </p>
          )}
          {error && (
            <div className="mt-4 rounded-md border border-slash/40 bg-slash/10 px-4 py-3 text-sm text-slash">
              <p>{error}</p>
              {errorDetail && (
                <details className="mt-2 text-xs text-slash/80">
                  <summary className="cursor-pointer">Technical details</summary>
                  <pre className="mt-2 overflow-auto text-[11px]">{errorDetail}</pre>
                </details>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Step 3 · Result */}
      <div ref={step3Ref}>
        <section aria-labelledby="assurance-step-3">
          <div className="mb-4 flex items-baseline gap-3">
            <StepPill number={3} active={step === 3} done={false} />
            <div>
              <h2 id="assurance-step-3" className="text-xl font-semibold text-bone">
                Review the assurance policy
              </h2>
              <p className="text-sm text-muted">
                Interpretation, deterministic pricing, verifier status and a
                portable integration manifest.
              </p>
            </div>
          </div>
          {analysis && selected ? (
            <>
              <AnalysisResult analysis={analysis} template={selected} />
              <div className="mt-6 flex flex-wrap gap-3 rounded-md border border-rule bg-surface/60 p-5">
                <Label>Next</Label>
                {analysis.policy.executableNow ? (
                  <>
                    <Link
                      href="/proof"
                      className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                    >
                      Open the live proof for this fault class
                    </Link>
                    <Link
                      href="/build"
                      className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                    >
                      View integration steps
                    </Link>
                    <span className="text-sm text-muted">
                      Copy the quote request shape from the manifest above.
                    </span>
                  </>
                ) : (
                  <>
                    <Link
                      href="/build"
                      className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                    >
                      Read the integration blueprint
                    </Link>
                    <span className="text-sm text-muted">
                      Ship the proposed adapter to make this action executable.
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="rounded border border-dashed border-rule bg-surface/40 p-6 text-sm text-muted">
              Analyse a scenario to see the AI interpretation, the deterministic
              policy pricing and the signed integration manifest.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  onGo,
  enabledSteps,
}: {
  step: Step;
  onGo: (s: Step) => void;
  enabledSteps: number;
}) {
  const items: { n: Step; label: string }[] = [
    { n: 1, label: 'Choose an action' },
    { n: 2, label: 'Describe the scenario' },
    { n: 3, label: 'Review the assurance policy' },
  ];
  return (
    <ol className="grid gap-3 rounded-md border border-rule bg-surface/60 p-3 md:grid-cols-3">
      {items.map((it) => {
        const active = it.n === step;
        const enabled = it.n <= enabledSteps || it.n === 1;
        return (
          <li key={it.n}>
            <button
              type="button"
              onClick={() => enabled && onGo(it.n)}
              disabled={!enabled}
              className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'bg-accent/10 text-accent'
                  : enabled
                    ? 'text-bone hover:bg-ink'
                    : 'text-muted/50'
              }`}
            >
              <StepPill number={it.n} active={active} done={it.n < step} compact />
              <span className="text-sm">{it.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepPill({
  number,
  active,
  done,
  compact = false,
}: {
  number: number;
  active: boolean;
  done: boolean;
  compact?: boolean;
}) {
  const size = compact ? 'h-7 w-7 text-[0.7rem]' : 'h-10 w-10 text-sm';
  const tone = done
    ? 'border-accent/60 bg-accent/20 text-accent'
    : active
      ? 'border-accent/60 bg-accent/10 text-accent'
      : 'border-rule bg-ink text-muted';
  return (
    <span
      aria-hidden="true"
      className={`grid ${size} place-items-center rounded-full border font-mono ${tone}`}
    >
      {done ? '✓' : number}
    </span>
  );
}
