// Evidence labels lab (Task 20): `EvidenceLabel`
// (design-system/lab/components/EvidenceLabel.tsx) plus a side-by-side
// Live/Historical/Blueprint comparison that demonstrates PRINCIPLES.md
// Principle 2 directly, not just in prose.
//
// The three example frames below are deliberately NOT three identical
// cards with different labels stuck on -- that would be exactly the
// "rules out" case Principle 2 names ("putting a 'Live' or 'Historical'
// pill on every card as a substitute for construction"). Instead:
//   - Live and Historical both use the *same filled construction*
//     (solid `bg-surface-raised`, matching the logo mark's own filled,
//     not-stroked geometry) because both are real, settled-or-settling
//     content -- the fill signals "real," not "current."
//   - Live is told apart from Historical by *activity*, not colour or a
//     label: a live status dot plus a timestamp annotated "updates live"
//     vs. Historical's fixed, inert "Settled 14 Mar 2026" with no dot at
//     all.
//   - Blueprint is the one outline-only frame: no background fill, same
//     geometry -- a drawing of a thing, not the thing.
//
// `EvidenceLabel` itself only appears on the Historical and Blueprint
// frames. The Live frame carries no chip whatsoever -- per Part1 §25
// ("Live default is usually unlabelled") and this task's brief, Live is
// the *absence* of a label, which is exactly what `EvidenceLabelKind`'s
// two-member type enforces (there is no `'live'` variant to reach for).
//
// No `--accent` anywhere on this page. No `rounded-*` class. The one
// `--positive`-toned live dot mirrors the data-display page's `StatusDot`
// convention (a solid square, not a circle -- this system has zero curve
// commands).

import { EvidenceLabel } from '../../components/EvidenceLabel';

export default function EvidenceLabelsPage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Evidence labels</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>EvidenceLabel</code> (
        <code>design-system/lab/components/EvidenceLabel.tsx</code>) takes{' '}
        <code>{'{ kind: '}</code>
        <code>&apos;historical&apos;</code> | <code>&apos;blueprint&apos;</code>
        <code>{' }'}</code> -- there is no <code>&apos;live&apos;</code>{' '}
        member. Per PRINCIPLES.md Principle 2, Live/Historical/Blueprint
        differ by <em>construction</em> (filled vs. outline, activity vs.
        inertness), not by badge; this component is the narrow exception,
        reserved for the few screens (the template picker, a{' '}
        <code>/proof/N</code> header, <code>/build</code> sections) where
        Part1 §25 calls out genuine confusion risk. Most of the product
        renders none of these chips at all.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Construction, not badge -- the three examples side by side</h2>
        <p style={{ maxWidth: '72ch' }}>
          Live and Historical share the same <em>filled</em> container --
          both are real. Blueprint is the one <em>outline-only</em> frame --
          a drawing of a thing, not the thing. Live is told apart from
          Historical by the live dot and advancing timestamp, not by colour
          or a label -- notice the Live frame below carries{' '}
          <strong>no chip at all</strong>.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Live: filled, no EvidenceLabel -- construction alone (fill +
              activity) signals live, per Part1 §25. */}
          <div className="flex flex-col gap-3 border border-boundary bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <span className="font-sans text-body text-ink">Action #29</span>
              {/* no EvidenceLabel here -- this is the point being demonstrated */}
            </div>
            <span className="inline-flex items-center gap-2 font-sans text-body text-ink">
              <span aria-hidden className="h-2 w-2 bg-positive" />
              Evidence window open
            </span>
            <span className="text-data font-mono tabular-nums text-muted" style={{ fontSize: '0.8rem' }}>
              Updated 4s ago &middot; updates live
            </span>
          </div>

          {/* Historical: same filled construction as Live, but inert -- a
              fixed timestamp, no dot, no motion -- plus the EvidenceLabel
              chip since this page is the confusion-risk exception case. */}
          <div className="flex flex-col gap-3 border border-boundary bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <span className="font-sans text-body text-ink">Action #27</span>
              <EvidenceLabel kind="historical" />
            </div>
            <span className="font-sans text-body text-ink">ResolvedSlash</span>
            <span className="text-data font-mono tabular-nums text-muted" style={{ fontSize: '0.8rem' }}>
              Settled 27 Mar 2026, 19:22 UTC
            </span>
          </div>

          {/* Blueprint: outline-only, no fill -- same geometry, a drawing
              of a thing, not the thing. */}
          <div className="flex flex-col gap-3 border border-boundary bg-transparent p-4">
            <div className="flex items-center justify-between">
              <span className="font-sans text-body text-ink">
                latency-verifier-v2
              </span>
              <EvidenceLabel kind="blueprint" />
            </div>
            <span className="font-sans text-body text-muted">
              Proposed adapter -- not deployed
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Legend tooltip</h2>
        <p style={{ maxWidth: '72ch' }}>
          The &quot;?&quot; control on each chip reveals a one-line legend
          explanation, in real <code>:hover</code> and, for keyboard users,
          on real <code>:focus</code> of the trigger itself (a pure-CSS{' '}
          <code>group-focus-within</code> reveal, the same pattern the
          data-display page&apos;s <code>Tooltip</code> atom uses -- no
          mouse-only affordance). Try tabbing to each &quot;?&quot; below
          instead of hovering it.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <EvidenceLabel kind="historical" />
          <EvidenceLabel kind="blueprint" />
        </div>
      </section>
    </main>
  );
}
