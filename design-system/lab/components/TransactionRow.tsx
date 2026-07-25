// TransactionRow: one row of an on-chain transaction ledger table --
// Bonded/Executed/Challenged/ResolvedSlash-style rows across the ledger,
// verifier registry, and action tables this task adds to
// app/data-display/page.tsx, and later reused verbatim by Phase 2's
// `/app/actions/[id]` monitor (Part1 §22) for its own ledger. Consumes
// `HashPill` (Task 13, components/HashPill.tsx) verbatim for the hash
// column rather than re-truncating hashes here.
//
// Deviation from the Task 14 brief's sample, documented the same way
// HashPill.tsx documents its own: the brief put both `block` and
// `timestamp` in the same `text-data text-muted` face. This system's own
// Principle 1 ("numbers and hashes are not prose") and RESPONSIVE.md §3's
// challenge-window example draw a sharper line than that: "the seconds
// figure is monospace, the readable form is not, because one is a
// machine-checkable value and the other is a human-readable gloss on it."
// `block` is exactly the machine-checkable case -- an auditable, tabular
// figure like a bond amount or basis-point value -- so it keeps the
// monospace `text-data` face with `tabular-nums` and comma grouping.
// `timestamp` here is the human-readable gloss (e.g. "21 Mar 2026, 09:12
// UTC"), not a raw block-time integer, so it renders in the prose `text-body`
// face instead of borrowing monospace for a value nobody is meant to verify
// digit-by-digit.
//
// No `--accent` anywhere (ink/boundary/muted only, matching HashPill's own
// "no third colour" rule) and no `rounded-*` (this system has zero curve
// commands; the row's only geometry is the plain `border-b` hairline).

import { HashPill } from './HashPill';

export function TransactionRow({
  type,
  hash,
  block,
  timestamp,
  cspLiveHref,
}: {
  type: string;
  hash: string;
  block: number;
  timestamp: string;
  cspLiveHref: string;
}) {
  return (
    <tr className="border-b border-boundary">
      <td className="py-2 pr-4 text-body text-ink font-sans">{type}</td>
      <td className="py-2 pr-4">
        <HashPill hash={hash} href={cspLiveHref} />
      </td>
      <td className="py-2 pr-4 text-data font-mono tabular-nums text-muted">
        {block.toLocaleString()}
      </td>
      <td className="py-2 text-body text-muted font-sans">{timestamp}</td>
    </tr>
  );
}
