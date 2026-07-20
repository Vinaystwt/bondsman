'use client';

import { useState } from 'react';
import { Label, StatusPill } from '@/components/ui/Primitives';
import { clientApi } from '@/lib/api';
import { formatIsoUtc } from '@/lib/format';
import type { QuoteCheckResponse } from '@/lib/types';

/**
 * Quote single use check. Confirms the canonical Action 27 paid quote is
 * consumed and would be rejected on a second submission. Read only. Never
 * calls the submit route.
 */
export default function QuoteSingleUseCheck({
  quoteHash,
  actionId,
}: {
  quoteHash: string;
  actionId: string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QuoteCheckResponse | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  async function run() {
    setRunning(true);
    setErrored(false);
    try {
      const res = await clientApi.quoteConsumptionCheck(quoteHash);
      setResult(res);
      setCheckedAt(new Date().toISOString());
    } catch {
      setErrored(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Step 3 · Quote single use</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            Test that the paid quote cannot be reused
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Asks the backend whether this paid quote would accept another
            submission. Read only. Never calls the submit route.
          </p>
        </div>
        <StatusPill tone="info">READ ONLY CHECK</StatusPill>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
        >
          {running ? 'Checking…' : 'Test single use protection'}
        </button>
        {checkedAt && (
          <span className="text-xs text-muted">
            Last checked {formatIsoUtc(checkedAt)}
          </span>
        )}
      </div>

      {errored && (
        <p className="mt-4 text-sm text-slash">
          The check failed. Try again in a moment.
        </p>
      )}

      {result && !errored && (
        <dl className="mt-5 grid gap-3 rounded-md border border-rule bg-ink px-4 py-4 text-sm sm:grid-cols-2">
          <Field label={`Quote consumed by action`}>
            <span className="font-mono text-accent">
              No. {String(result.consumedActionId ?? actionId).padStart(4, '0')}
            </span>
          </Field>
          <Field label="New submission accepted">
            <span
              className={
                result.wouldAcceptNewSubmission ? 'text-slash' : 'text-accent'
              }
            >
              {result.wouldAcceptNewSubmission ? 'Yes' : 'No'}
            </span>
          </Field>
          <Field label="Expected result">
            <span className="font-mono text-bone">
              {result.expectedRejectionCode ?? 'not reported'}
            </span>
          </Field>
          <Field label="Status">
            <span className="font-mono text-bone">{result.status}</span>
          </Field>
          <div className="sm:col-span-2">
            <p className="text-sm leading-relaxed text-muted">
              {result.explanation}
            </p>
          </div>
        </dl>
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
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
