// TimelineNode: one entry in the 7-node action lifecycle timeline (Part1
// §22 -- Initiated, Bonded, Executed, Evidence window, Challenged,
// ResolvedSlash/ResolvedRefund, Receipt sealed), reused verbatim by
// app/data-display/page.tsx's lifecycle demo and, per the Task 14 brief,
// by Phase 2's `/app/actions/[id]` monitor's own timeline column (§22).
//
// Deviations from the Task 14 brief's sample, documented the same way
// HashPill.tsx/TransactionRow.tsx document theirs:
//
// 1. No `rounded-full`. This system has zero curve commands anywhere
//    (tokens.css: "Corners are cut (chamfered), not rounded"), and
//    page.tsx's own `StatusDot` already made the same call ("a small solid
//    square, not a circle... a round dot would be the one uncut curve on
//    the page"). The marker below is a plain square, matching StatusDot's
//    `h-2 w-2` sizing convention (bumped slightly to `h-2.5 w-2.5` to read
//    clearly as a timeline node rather than an inline status dot).
//
// 2. No `bg-accent` for the `current` state. `--accent` is reserved-unused
//    (tokens.css, locked per Checkpoint A) and this task's own brief is
//    explicit that "current" must read through ink-weight or `--positive`,
//    never accent. This system's established grammar for emphasis without
//    a third colour is ink weight + motion (Button.tsx: "ink weight, rules,
//    and motion of the value, not a third colour"), so `current` is the
//    fully-saturated `--ink` marker plus a pulse -- the same "genuinely
//    still happening" signal Principle 2 assigns to Live content ("a
//    polling/update affordance... because it is still changing"), applied
//    here to a single in-progress node rather than a whole page. `complete`
//    instead takes the quiet, non-celebratory `--positive` role (tokens.css:
//    "a passed check, not a fanfare") -- exactly the register a settled,
//    already-passed lifecycle step needs, with no motion (Principle 5: only
//    the live/current step ever moves). `upcoming` steps down to `--muted`
//    at reduced opacity, the same inert treatment Button.tsx's `disabled`
//    state and this page's `StatusDot`/`inert` variant already use for
//    "present but not yet relevant." `--consequential` never appears here:
//    the interface has no slash-specific status, so this component has no
//    path to render it, keeping the slash accent scoped to the one real
//    ResolvedSlash context on the page (Principle 3).
//
// 3. A connecting rail. The brief's sample was a bare `<li>` with no visual
//    link between nodes, which reads as an unordered list rather than a
//    lifecycle. Each node draws a hairline connector in `--boundary` below
//    its marker down to the next node; the last node in the list hides its
//    trailing connector via `group-last:hidden` so the rail never dangles
//    past `Receipt sealed`.

import { HashPill } from './HashPill';

export type TimelineNodeStatus = 'complete' | 'current' | 'upcoming';

const MARKER_CLASS: Record<TimelineNodeStatus, string> = {
  complete: 'bg-positive',
  current: 'bg-ink animate-pulse',
  upcoming: 'bg-muted opacity-40',
};

const LABEL_CLASS: Record<TimelineNodeStatus, string> = {
  complete: 'text-ink',
  current: 'text-ink font-medium',
  upcoming: 'text-muted',
};

export function TimelineNode({
  label,
  status,
  hash,
}: {
  label: string;
  status: TimelineNodeStatus;
  hash?: string;
}) {
  return (
    <li className="group relative flex gap-3 pb-6 last:pb-0">
      <span className="flex flex-col items-center">
        <span
          aria-hidden
          className={['h-2.5 w-2.5 shrink-0', MARKER_CLASS[status]].join(' ')}
        />
        <span className="mt-1 w-px flex-1 bg-boundary group-last:hidden" />
      </span>
      <span className="flex flex-col items-start gap-1 pt-px">
        <span className={['text-body font-sans', LABEL_CLASS[status]].join(' ')}>
          {label}
        </span>
        {hash && <HashPill hash={hash} />}
      </span>
    </li>
  );
}
