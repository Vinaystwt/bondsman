'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clientApi } from '@/lib/api';
import { Label, StatusPill } from '@/components/ui/Primitives';
import type { PortableReceipt, ReceiptVerification } from '@/lib/types';

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'valid'; result: ReceiptVerification }
  | { kind: 'invalid'; result: ReceiptVerification }
  | { kind: 'error'; message: string };

export default function ReceiptVerifier() {
  const searchParams = useSearchParams();
  const actionId = searchParams.get('actionId');
  const [body, setBody] = useState('');
  const [state, setState] = useState<VerifyState>({ kind: 'idle' });

  useEffect(() => {
    if (!actionId) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    clientApi.receipt(actionId)
      .then((receipt) => {
        if (cancelled) return;
        setBody(JSON.stringify(receipt, null, 2));
        setState({ kind: 'idle' });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error', message: 'Receipt is not available for this action yet.' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [actionId]);

  const parsed = useMemo(() => {
    if (!body.trim()) return null;
    try {
      return JSON.parse(body) as PortableReceipt;
    } catch {
      return null;
    }
  }, [body]);

  async function verify() {
    if (!parsed) {
      setState({ kind: 'error', message: 'Paste a valid Bondsman receipt JSON body.' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const result = await clientApi.verifyReceiptBody(parsed.actionId ?? '0', parsed);
      setState(result.valid ? { kind: 'valid', result } : { kind: 'invalid', result });
    } catch (error) {
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Verification failed.',
      });
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="rounded-md border border-rule bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Label>LIVE VERIFICATION</Label>
            <h2 className="mt-2 text-xl font-semibold text-bone">
              Receipt JSON
            </h2>
          </div>
          <StatusPill tone={parsed ? 'ok' : 'warn'}>
            {parsed ? 'Ready' : 'Waiting for JSON'}
          </StatusPill>
        </div>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={20}
          spellCheck={false}
          className="mt-4 min-h-[28rem] w-full resize-y rounded border border-rule bg-ink p-4 font-mono text-xs leading-relaxed text-bone focus:border-accent focus:outline-none"
          aria-label="Receipt JSON"
          placeholder='{"protocol":"bondsman","version":"3"}'
        />
      </div>

      <aside className="rounded-md border border-rule bg-surface p-5">
        <Label>Verifier result</Label>
        <div className="mt-4">
          {state.kind === 'idle' && (
            <p className="text-sm leading-relaxed text-muted">
              Paste a portable receipt or open this page with an action ID. Verification checks the signed receipt body.
            </p>
          )}
          {state.kind === 'loading' && (
            <p className="text-sm text-muted" role="status">Checking receipt...</p>
          )}
          {state.kind === 'valid' && (
            <div className="rounded-md border border-accent/30 bg-accent/10 p-4">
              <StatusPill tone="ok">Signature valid</StatusPill>
              <p className="mt-3 text-sm text-bone">The receipt signature verifies.</p>
            </div>
          )}
          {state.kind === 'invalid' && (
            <div className="rounded-md border border-slash/30 bg-slash/10 p-4">
              <StatusPill tone="fault">Signature invalid</StatusPill>
              <p className="mt-3 text-sm text-bone">
                {state.result.reason ?? 'The verifier rejected this receipt.'}
              </p>
            </div>
          )}
          {state.kind === 'error' && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4">
              <StatusPill tone="warn">Needs attention</StatusPill>
              <p className="mt-3 text-sm text-bone">{state.message}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={verify}
          disabled={state.kind === 'loading'}
          className="mt-5 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          Verify receipt
        </button>
      </aside>
    </section>
  );
}
