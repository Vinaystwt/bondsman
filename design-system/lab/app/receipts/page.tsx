// Receipt states lab (Task 19): all 5 `ReceiptStatus` union members
// rendered once each, in the order the union is declared, each labelled
// with its own variant name -- the "Receipt states (full set)" screenshot
// frame Part2's acceptance criteria calls for. `ReceiptPanel`
// (design-system/lab/components/ReceiptPanel.tsx) is imported and reused
// verbatim; no state is skipped and none is collapsed into a generic
// "rejected" card -- the three destructive states each keep their own
// header text.
//
// The `tampered` snapshot passes a real field name (`paidQuoteId`) plus a
// signed/found value pair, rendered by `ReceiptPanel` as a `HashPill`-based
// before/after diff, per this task's brief.
//
// No `--accent` anywhere on this page or in ReceiptPanel.tsx. No
// `rounded-*` class.

import { ReceiptPanel, type ReceiptStatus } from '../../components/ReceiptPanel';

const STATES: ReceiptStatus[] = [
  'valid',
  'malformed',
  'tampered',
  'signature-failure',
  'unavailable',
];

export default function ReceiptsPage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Receipt states</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>ReceiptPanel</code> (
        <code>design-system/lab/components/ReceiptPanel.tsx</code>), one
        panel per <code>ReceiptStatus</code> union member -- five states
        total, each rendered exactly once below. Phase 2&apos;s{' '}
        <code>/verify</code> route (Part1 §13) is a thin wrapper around this
        component. <code>malformed</code>, <code>tampered</code>, and{' '}
        <code>signature-failure</code> are three distinct rejection reasons,
        each with its own header text and all three using{' '}
        <code>--destructive</code> -- none of them use{' '}
        <code>--consequential</code>, which stays reserved exclusively for
        the ResolvedSlash moment (PRINCIPLES.md Principle 3). These are
        verification-check failures, not the product&apos;s slash-resolution
        moment.
      </p>

      <p
        style={{ maxWidth: '72ch' }}
        className="border-2 border-boundary p-4 bg-surface-raised"
      >
        <strong className="text-ink">Annotation:</strong>{' '}
        <span className="text-muted">
          The <code>tampered</code> snapshot below passes a real field name (
          <code>paidQuoteId</code>) along with the value the receipt&apos;s
          signed payload actually attests to (&quot;Signed&quot;) and the
          value found on the tampered receipt under check (&quot;Found&quot;),
          rendered as a <code>HashPill</code>-based diff pair rather than a
          bare field name alone.
        </span>
      </p>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STATES.map((status) => (
          <div key={status} className="flex flex-col gap-2">
            <span className="text-data text-muted font-mono">{status}</span>
            {status === 'tampered' ? (
              <ReceiptPanel
                status={status}
                tamperedField="paidQuoteId"
                expected="0x9f2a3c7d8e1b4f6a2c5d8e9f1a3b5c7d"
                actual="0x9f2a3c7d8e1b4f6a2c5d8e9f1a3b5c00"
              />
            ) : (
              <ReceiptPanel status={status} />
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
