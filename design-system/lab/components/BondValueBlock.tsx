// BondValueBlock: "the bond block" -- VISUAL_LANGUAGE.md's own name for this
// exact component ("the bond block is a single chamfered slab in flight; at
// resolution it splits along the centreline gap, reusing the mark's own
// two-splits geometry", tokens.css: "--chamfer-primary ... the bond block").
// Reused verbatim by Phase 2's `/app/actions/[id]` monitor (Part1 §22-24) and
// Task 24's motion prototype, per this task's brief.
//
// Two states, matching Principle 3 exactly:
// - No `resolution`: the bond is still in flight -- one sealed, undivided
//   block. Just `Posted`.
// - `resolution` present: the block has resolved. It renders as three
//   divided segments (`divide-x`, not just a `gap`) so the *split itself* is
//   visible structurally -- Principle 3's "rule (motion of the motif)": "at
//   resolution -- slash or refund -- the block splits open along that same
//   gap geometry. The split itself means 'resolved.' It carries no judgment
//   about good or bad; both outcomes split." A refund resolution renders the
//   identical three-way split in plain ink; a slash resolution renders the
//   identical split with one exception, below.
//
// `--consequential` appears in exactly one place in this whole component:
// the `Slashed to reserve` figure, and only when `resolution.slashed > 0`
// (Principle 3, "rule (colour is exclusive to slash)": "Only when the split
// resolves as a slash does the accent colour ... appear, and only on the
// slashed portion. ... A refund resolves with the identical split geometry
// rendered in neutral ink -- same shape, no accent."). When `slashed` is 0
// (the refund case), that figure stays plain `--muted` like an inert zero,
// never `--consequential` -- there is nothing to colour because nothing was
// slashed. Reward and refund figures are never `--consequential`, in either
// resolution: the accent's scarcity is the point (Principle 3: "if it
// appears anywhere on screen, real economic slashing happened").
//
// No `--accent` anywhere. Figures use the monospace `text-data` face with
// `tabular-nums` (Principle 1: "Posted 2,800 / Slashed 2,520 to reserve /
// Reward 280 to challenger ... in the slash economics block" is Principle
// 1's own named example) -- a deviation from the brief's sample, which put
// the figure in the prose `text-headline` face; this system reserves that
// face for headings, not auditable amounts. No `rounded-*` class, matching
// every prior component (Task 7-17): the mark has zero curve commands, and
// this system has so far expressed "chamfered, not rounded" as a documented,
// deferred detail rather than a literal `clip-path` on every container (see
// e.g. HashPill.tsx's own note) -- this component follows that same
// established precedent rather than introducing a one-off polygon no other
// component uses.

export function BondValueBlock({
  posted,
  asset,
  resolution,
}: {
  posted: number;
  asset: string;
  resolution?: { slashed: number; reward: number; refund: number };
}) {
  if (!resolution) {
    return (
      <div
        className="border-2 border-boundary bg-surface-raised p-4"
        data-resolution="none"
      >
        <span className="text-data text-muted font-sans">Posted</span>
        <p className="text-headline text-ink font-sans">
          <span className="font-mono tabular-nums">{posted.toLocaleString()}</span>{' '}
          {asset}
        </p>
      </div>
    );
  }

  const isSlash = resolution.slashed > 0;

  return (
    <div
      className="grid grid-cols-1 divide-y divide-boundary border-2 border-boundary bg-surface-raised sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      data-resolution={isSlash ? 'slash' : 'refund'}
    >
      <div className="flex flex-col gap-1 p-4">
        <span className="text-data text-muted font-sans">Slashed to reserve</span>
        <p
          className={`text-headline font-sans ${isSlash ? 'text-consequential' : 'text-muted'}`}
        >
          <span className="font-mono tabular-nums">
            {resolution.slashed.toLocaleString()}
          </span>{' '}
          {asset}
        </p>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-data text-muted font-sans">Challenger reward</span>
        <p className="text-headline text-ink font-sans">
          <span className="font-mono tabular-nums">
            {resolution.reward.toLocaleString()}
          </span>{' '}
          {asset}
        </p>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-data text-muted font-sans">Payer refund</span>
        <p className="text-headline text-ink font-sans">
          <span className="font-mono tabular-nums">
            {resolution.refund.toLocaleString()}
          </span>{' '}
          {asset}
        </p>
      </div>
    </div>
  );
}
