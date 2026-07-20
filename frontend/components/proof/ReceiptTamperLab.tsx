'use client';

import { useMemo, useState } from 'react';
import { Label, StatusPill } from '@/components/ui/Primitives';
import { clientApi } from '@/lib/api';
import { formatIsoUtc, truncateHash } from '@/lib/format';
import type { PortableReceipt, ReceiptVerification } from '@/lib/types';

type TamperOption =
  | 'none'
  | 'change_outcome'
  | 'change_settlement_tx'
  | 'change_quote_hash'
  | 'change_action_id'
  | 'change_bond'
  | 'change_evidence_root';

interface OptionSpec {
  id: TamperOption;
  label: string;
  apply: (r: PortableReceipt) => PortableReceipt;
}

const OPTIONS: OptionSpec[] = [
  {
    id: 'change_outcome',
    label: 'Change outcome',
    apply: (r) => ({
      ...r,
      outcome: r.outcome === 'SLASHED' ? 'REFUNDED' : 'SLASHED',
    }),
  },
  {
    id: 'change_settlement_tx',
    label: 'Change settlement transaction',
    apply: (r) => ({
      ...r,
      payment: r.payment
        ? {
            ...r.payment,
            settlementTransaction: replaceLastChar(r.payment.settlementTransaction),
          }
        : r.payment,
    }),
  },
  {
    id: 'change_quote_hash',
    label: 'Change quote hash',
    apply: (r) => ({
      ...r,
      paidQuote: r.paidQuote
        ? { ...r.paidQuote, quoteHash: replaceLastChar(r.paidQuote.quoteHash) }
        : r.paidQuote,
    }),
  },
  {
    id: 'change_action_id',
    label: 'Change action id',
    apply: (r) => ({ ...r, actionId: String(Number(r.actionId) + 1) }),
  },
  {
    id: 'change_bond',
    label: 'Change bond amount',
    apply: (r) => ({ ...r, bond: bumpAtomic(r.bond) }),
  },
  {
    id: 'change_evidence_root',
    label: 'Change evidence root',
    apply: (r) => ({
      ...r,
      deliveryEvidence: r.deliveryEvidence
        ? {
            ...r.deliveryEvidence,
            evidenceRoot: replaceLastChar(r.deliveryEvidence.evidenceRoot),
          }
        : r.deliveryEvidence,
    }),
  },
];

function replaceLastChar(value: string): string {
  if (!value) return value;
  const last = value.slice(-1);
  const swap = last === '0' ? '1' : '0';
  return value.slice(0, -1) + swap;
}

function bumpAtomic(value: string): string {
  try {
    return String(BigInt(value) + 1n);
  } catch {
    return value;
  }
}

interface Props {
  receipt: PortableReceipt;
  initialVerification: ReceiptVerification | null;
}

/**
 * Receipt verification and tamper lab. Starts with the original signed
 * receipt. The user can mutate one field and send the modified body to the
 * real verification endpoint. Signature verification fails on any tamper.
 */
/**
 * The receipt panel distinguishes three separate states:
 *   valid       — the verifier returned { valid: true }
 *   invalid     — the verifier returned { valid: false } with a reason
 *   unavailable — the verifier did not return a well formed response
 *
 * Unavailable never renders as SIGNATURE INVALID. Only a real verifier
 * response with valid=false may claim the cryptographic invalid state.
 */
export type VerificationState =
  | { kind: 'valid' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'unavailable'; reason: string };

export function verificationStateFrom(
  res: ReceiptVerification | null | undefined,
): VerificationState | null {
  if (res === null || res === undefined) return null;
  if (typeof res !== 'object') {
    return { kind: 'unavailable', reason: 'malformed verifier response' };
  }
  if (res.valid === true) return { kind: 'valid' };
  if (res.valid === false) {
    return {
      kind: 'invalid',
      reason: res.reason ?? 'signature verification failed',
    };
  }
  return {
    kind: 'unavailable',
    reason: 'malformed verifier response',
  };
}

export default function ReceiptTamperLab({
  receipt: original,
  initialVerification,
}: Props) {
  const [option, setOption] = useState<TamperOption>('none');
  const [state, setState] = useState<VerificationState | null>(
    verificationStateFrom(initialVerification),
  );
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [pending, setPending] = useState<null | 'verify' | 'apply' | 'reset'>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const currentReceipt = useMemo<PortableReceipt>(() => {
    if (option === 'none') return original;
    const spec = OPTIONS.find((o) => o.id === option);
    if (!spec) return original;
    return spec.apply(original);
  }, [option, original]);

  const isTampered = option !== 'none';
  const receiptJson = JSON.stringify(currentReceipt, null, 2);

  async function verifyOriginal() {
    setPending('verify');
    try {
      const res = await clientApi.receiptVerify(original.actionId);
      setState(verificationStateFrom(res));
      setVerifiedAt(new Date().toISOString());
    } catch {
      setState({ kind: 'unavailable', reason: 'backend request failed' });
      setVerifiedAt(new Date().toISOString());
    } finally {
      setPending(null);
    }
  }

  async function applyTamper(next: TamperOption) {
    setOption(next);
    if (next === 'none') {
      await verifyOriginal();
      return;
    }
    setPending('apply');
    try {
      const spec = OPTIONS.find((o) => o.id === next);
      if (!spec) return;
      const modified = spec.apply(original);
      const res = await clientApi.verifyReceiptBody(original.actionId, modified);
      setState(verificationStateFrom(res));
      setVerifiedAt(new Date().toISOString());
    } catch {
      setState({ kind: 'unavailable', reason: 'backend request failed' });
      setVerifiedAt(new Date().toISOString());
    } finally {
      setPending(null);
    }
  }

  function resetReceipt() {
    setOption('none');
    setState(verificationStateFrom(initialVerification));
    setVerifiedAt(null);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(original, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(original, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bondsman-receipt-${original.actionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const valid = state?.kind === 'valid';
  const invalid = state?.kind === 'invalid';
  const unavailable = state?.kind === 'unavailable';

  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Steps 8 and 9 · Receipt verify and tamper</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            Verify the signed receipt, then try to break it
          </h3>
          <p className="mt-2 max-w-prose text-sm text-muted">
            Every mutation is sent to the real verifier at{' '}
            <code className="rounded bg-ink px-1 py-0.5 text-xs text-bone">
              POST /api/receipt/{original.actionId}/verify
            </code>
            . The signature verification fails on any change.
          </p>
        </div>
        <StatusPill
          tone={
            valid ? 'ok' : invalid ? 'fault' : unavailable ? 'warn' : 'neutral'
          }
        >
          {valid
            ? 'SIGNATURE VALID'
            : invalid
              ? 'SIGNATURE INVALID'
              : unavailable
                ? 'VERIFICATION UNAVAILABLE'
                : 'NOT VERIFIED'}
        </StatusPill>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Field label="Schema">{original.schemaId}</Field>
        <Field label="Action">
          <span className="font-mono">
            No. {original.actionId.padStart(4, '0')}
          </span>
        </Field>
        <Field label="Outcome">
          <span
            className={
              currentReceipt.outcome === 'SLASHED' ? 'text-slash' : 'text-accent'
            }
          >
            {currentReceipt.outcome}
          </span>
        </Field>
        <Field label="Signer public key">
          <span className="font-mono text-xs break-all">
            {truncateHash(original.signerPublicKey)}
          </span>
        </Field>
        <Field label="Issued">{formatIsoUtc(original.issuedAt)}</Field>
        <Field label="Last verified">
          {verifiedAt ? formatIsoUtc(verifiedAt) : 'not yet run'}
        </Field>
      </dl>

      {invalid && (
        <div className="mt-5 rounded-md border border-slash/40 bg-slash/10 px-4 py-3 text-sm text-slash">
          {state?.kind === 'invalid' ? state.reason : ''}
        </div>
      )}
      {unavailable && (
        <div className="mt-5 rounded-md border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200">
          The verifier did not return a well formed response. Try again in a moment. Historical evidence remains settled on Casper testnet.
        </div>
      )}

      <div className="mt-6 border-t border-rule pt-5">
        <p className="serial text-[0.62rem] text-muted">Tamper lab</p>
        <p className="mt-2 text-sm text-muted">
          Modify a single field on a client side clone. The original receipt is
          never mutated. Any change should fail signature verification.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => applyTamper(o.id)}
              className={`rounded border px-3 py-2 text-left text-xs transition-colors ${
                option === o.id
                  ? 'border-slash/60 bg-slash/10 text-slash'
                  : 'border-rule bg-ink text-bone hover:border-slash/40'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={verifyOriginal}
            disabled={pending !== null}
            className="rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs text-accent hover:bg-accent/20 disabled:opacity-60"
          >
            {pending === 'verify' ? 'Verifying…' : 'Verify original'}
          </button>
          <button
            type="button"
            onClick={resetReceipt}
            className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-bone hover:border-accent/50"
          >
            Reset receipt
          </button>
          <button
            type="button"
            onClick={copyJson}
            className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-bone hover:border-accent/50"
          >
            {copied ? 'Copied' : 'Copy original JSON'}
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-bone hover:border-accent/50"
          >
            Download original JSON
          </button>
        </div>
      </div>

      <details className="mt-6 border-t border-rule pt-5 text-xs">
        <summary className="cursor-pointer text-bone/80 hover:text-accent">
          Technical fields ({isTampered ? 'modified' : 'original'} receipt JSON)
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded border border-rule bg-ink p-3 text-[11px] leading-relaxed text-bone">
          <code className="font-mono">{receiptJson}</code>
        </pre>
      </details>
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
