// Payment ladder states lab (Task 17): all 6 `PaymentState` union positions
// rendered as distinct static snapshots -- one `PaymentLadder` per possible
// `current` value -- so the "Payment ladder (full sequence)" screenshot
// shows every position at once, each snapshot showing the whole ladder with
// that position's state applied.
//
// No `--accent` anywhere on this page or in PaymentLadder.tsx. No
// `rounded-*` class.

import { PaymentLadder, type PaymentState } from '../../components/PaymentLadder';

const STATES: PaymentState[] = [
  'required',
  'payload-prepared',
  'signature-received',
  'settlement-pending',
  'settled',
  'quote-returned',
];

export default function PaymentStatesPage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Payment ladder states</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>PaymentLadder</code> (
        <code>design-system/lab/components/PaymentLadder.tsx</code>), one
        snapshot per possible <code>current</code> value -- six positions
        total, each snapshot below shows the full ladder with that position
        marked current. Phase 2&apos;s <code>/app/new</code> payment stage
        drives this directly off backend state (Part1 §20): positions before{' '}
        <code>current</code> are done (muted, struck through), positions
        after are upcoming (muted, reduced opacity), and the current position
        is set apart by ink weight -- bold, not colour.
      </p>

      <p
        style={{ maxWidth: '72ch' }}
        className="border-2 border-boundary p-4 bg-surface-raised"
      >
        <strong className="text-ink">Annotation:</strong>{' '}
        <span className="text-muted">
          Only <code>settled</code> ever receives the confirmed/success
          treatment (<code>text-positive</code>), and only in the fifth
          snapshot below, where it is the current position. In every other
          snapshot <code>settled</code> is either upcoming or (never, in this
          set) done, and renders with the same muted styling as any other
          non-current state -- it carries no special color outside the
          moment it is actually confirmed.
        </span>
      </p>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STATES.map((current) => (
          <div key={current} className="flex flex-col gap-2">
            <span className="text-data text-muted font-mono">{current}</span>
            <div className="border-2 border-boundary p-4 bg-surface-raised">
              <PaymentLadder current={current} />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
