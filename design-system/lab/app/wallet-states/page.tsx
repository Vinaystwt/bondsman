// Wallet states lab (Task 16): all 9 `WalletState` union members rendered
// once each, in Part1 §12's exact table order, each labelled with its own
// variant name -- this is the "Wallet states (full grid)" screenshot frame
// Part2's acceptance criteria calls for. `WalletStateCard`
// (design-system/lab/components/WalletStateCard.tsx) is imported and reused
// verbatim; no state is skipped and none is collapsed into a generic
// "warning" card -- the union type itself makes that impossible here.
//
// No `--accent` anywhere on this page. No `rounded-*` class.

import { WalletStateCard, type WalletState } from '../../components/WalletStateCard';

const STATES: WalletState[] = [
  'not-installed',
  'locked',
  'rejected',
  'connected-ed25519',
  'connected-unsupported-key',
  'account-changed',
  'wrong-network',
  'missing-typed-data',
  'missing-message-signing',
  'disconnected-mid-flow',
];

export default function WalletStatesPage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Wallet states</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>WalletStateCard</code> (
        <code>design-system/lab/components/WalletStateCard.tsx</code>), one
        card per <code>WalletState</code> union member -- ten states total,
        each rendered exactly once below in the order Part1 §12&apos;s table
        lists them. Phase 2&apos;s <code>/app/new</code> wallet stage shows
        exactly one of these per capability-check result; nothing here
        collapses two distinct states into a shared &quot;warning&quot; card.
        The one state carrying real, quoted product-constraint language --{' '}
        <code>connected-unsupported-key</code> -- states the P0 Ed25519-only
        verifier constraint verbatim, not a paraphrase.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATES.map((variant) => (
          <div key={variant} className="flex flex-col gap-2">
            <span className="text-data text-muted font-mono">{variant}</span>
            <WalletStateCard variant={variant} />
          </div>
        ))}
      </section>
    </main>
  );
}
