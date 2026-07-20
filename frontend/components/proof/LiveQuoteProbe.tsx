'use client';

import { useState } from 'react';
import { Label, StatusPill } from '@/components/ui/Primitives';
import CopyHash from '@/components/ui/CopyHash';
import { formatIsoUtc, truncateHash, formatWcspr } from '@/lib/format';
import { clientApi } from '@/lib/api';
import type { X402PaymentResponse } from '@/lib/types';

interface ProbeResult {
  status: number;
  x402?: X402PaymentResponse;
  other?: unknown;
  error?: string;
  requestedAt: string;
}

/**
 * Live x402 probe. Sends an unpaid POST /v1/actions/quote and treats HTTP 402
 * with an x402 v2 body as the expected successful result. No transaction is
 * created and no secret is exposed. The response is rendered as the settled
 * payment instrument so users can see the real WCSPR pay to account and asset
 * package.
 */
export default function LiveQuoteProbe({
  defaultAmount = '50000000000000',
  defaultFaultClass = 'delivery_contradiction',
}: {
  defaultAmount?: string;
  defaultFaultClass?: string;
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function run() {
    setRunning(true);
    const requestedAt = new Date().toISOString();
    try {
      const res = await clientApi.liveQuoteProbe({
        amount: defaultAmount,
        faultClass: defaultFaultClass,
      });
      setResult({ ...res, requestedAt });
    } finally {
      setRunning(false);
    }
  }

  const req = result?.x402?.payment?.accepts?.[0];
  const expected = result && result.status === 402;

  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Step 1 · Live x402 probe</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            Request payment terms from the paid quote surface
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Sends an unpaid request to <code className="rounded bg-ink px-1 py-0.5 text-xs text-bone">POST /v1/actions/quote</code>. Expects HTTP 402 with an x402 v2 payment requirement. No transaction is created.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="info">LIVE REQUEST</StatusPill>
          <StatusPill tone="ok">NO TRANSACTION CREATED</StatusPill>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {running ? 'Requesting live quote…' : 'Request a live quote'}
        </button>
        {result && (
          <span className="text-xs text-muted">
            Requested at {formatIsoUtc(result.requestedAt)}
          </span>
        )}
      </div>

      {result && (
        <div className="mt-5 rounded-md border border-rule bg-ink p-4">
          {result.error && (
            <p className="text-sm text-slash">
              Network error. The frontend could not reach the paid HTTP surface.
            </p>
          )}
          {!result.error && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusPill tone={expected ? 'ok' : 'warn'}>
                    HTTP {result.status}
                  </StatusPill>
                  {expected && (
                    <span className="text-xs text-muted">
                      This 402 is the expected successful result of the probe.
                    </span>
                  )}
                </div>
                {result.x402 && (
                  <span className="serial text-[0.6rem] text-muted">
                    x402 v{result.x402.payment.x402Version} · {result.x402.code}
                  </span>
                )}
              </div>
              {req && (
                <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Field label="Scheme">{req.scheme}</Field>
                  <Field label="Network">{req.network}</Field>
                  <Field label="Asset">
                    {req.extra?.name ?? 'WCSPR'} ({req.extra?.symbol ?? 'WCSPR'})
                  </Field>
                  <Field label="Asset package">
                    <CopyHash value={req.asset} label={truncateHash(req.asset)} />
                  </Field>
                  <Field label="Payment amount">
                    <span className="font-mono text-bone">
                      {formatWcspr(req.amount)}
                    </span>
                  </Field>
                  <Field label="Pay to account">
                    <CopyHash value={req.payTo} label={truncateHash(req.payTo)} />
                  </Field>
                  <Field label="Max timeout">
                    <span className="font-mono text-bone">
                      {req.maxTimeoutSeconds}s
                    </span>
                  </Field>
                </dl>
              )}
              {!req && (
                <pre className="mt-3 max-h-40 overflow-auto rounded border border-rule bg-ink p-3 text-[11px] leading-relaxed text-bone">
                  <code>{JSON.stringify(result.other, null, 2)}</code>
                </pre>
              )}
            </>
          )}
        </div>
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
