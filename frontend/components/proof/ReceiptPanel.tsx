'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/Primitives';
import CopyHash from '@/components/ui/CopyHash';
import { truncateHash } from '@/lib/format';
import type { PortableReceipt, ReceiptVerification } from '@/lib/types';

interface Props {
  receipt: PortableReceipt | null;
  verification: ReceiptVerification | null;
  actionId: string;
}

export default function ReceiptPanel({ receipt, verification, actionId }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const receiptJson = receipt ? JSON.stringify(receipt, null, 2) : null;

  async function copyJson() {
    if (!receiptJson) return;
    try {
      await navigator.clipboard.writeText(receiptJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  function downloadJson() {
    if (!receiptJson) return;
    const blob = new Blob([receiptJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bondsman-receipt-${actionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-md border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Portable receipt</Label>
          <p className="mt-1 text-sm text-muted">
            Signed by the Bondsman receipt key. Anyone can reverify it against{' '}
            <code className="rounded bg-ink px-1 py-0.5 text-xs text-bone">
              /api/receipt/{actionId}/verify
            </code>
            .
          </p>
        </div>
        <span
          className={`serial rounded border px-2.5 py-1 text-[0.6rem] ${
            verification?.valid
              ? 'border-accent/40 bg-accent/10 text-accent'
              : verification?.valid === false
              ? 'border-slash/40 bg-slash/10 text-slash'
              : 'border-rule bg-ink text-muted'
          }`}
        >
          {verification?.valid
            ? 'verification passed'
            : verification?.valid === false
            ? 'verification failed'
            : 'verification unavailable'}
        </span>
      </div>

      {receipt ? (
        <>
          <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Schema">{receipt.schemaId}</Field>
            <Field label="Protocol">
              {receipt.protocol} v{receipt.version}
            </Field>
            <Field label="Network">{receipt.network}</Field>
            <Field label="Outcome">
              <span
                className={
                  receipt.outcome === 'SLASHED' ? 'text-slash' : 'text-accent'
                }
              >
                {receipt.outcome}
              </span>
            </Field>
            <Field label="Signer public key">
              <span className="font-mono text-xs text-bone/90 break-all">
                {receipt.signerPublicKey}
              </span>
            </Field>
            <Field label="Signature">
              <span className="font-mono text-xs text-bone/90 break-all">
                {truncateHash(receipt.signature)}
              </span>
            </Field>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyJson}
              className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-bone transition-colors hover:border-accent/50"
            >
              {copied ? 'Copied' : 'Copy receipt JSON'}
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-bone transition-colors hover:border-accent/50"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded border border-rule bg-ink px-3 py-1.5 text-xs text-muted transition-colors hover:text-bone"
            >
              {expanded ? 'Hide raw receipt' : 'Show raw receipt'}
            </button>
          </div>

          {expanded && receiptJson && (
            <pre className="mt-4 max-h-[28rem] overflow-auto rounded border border-rule bg-ink p-4 text-[11px] leading-relaxed text-bone">
              <code className="font-mono">{receiptJson}</code>
            </pre>
          )}

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Any change to a signed field invalidates the signature. Tamper with a
            single character in the JSON and the verifier returns valid: false.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">Receipt unavailable right now.</p>
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
    <div className="border-t border-rule pt-2 first:border-t-0 first:pt-0 sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(2)]:pt-0">
      <dt className="serial text-[0.58rem] text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-bone break-all">{children}</dd>
    </div>
  );
}
