# Responsive Rules and Content Density

This document turns `VISUAL_LANGUAGE.md`'s density direction — "one dominant
information zone plus at most one secondary rail... never a grid of ≥3
identical cards" (Territory A, "Density — instrument-dense, structured,
bounded") — into exact numbers. Every later task's mobile behavior, and Task
10's grid lab page, cite the numbers in this document by name; they are not
suggestions to be re-derived per component.

Read `VISUAL_LANGUAGE.md` first (the density/grid direction this document
implements) and `PRINCIPLES.md` Principle 4 (density bounded, no card sprawl)
for the rule these numbers exist to serve.

---

## 1. Breakpoints

Three tiers, exact pixel boundaries:

| Tier | Range | Tailwind prefix |
| --- | --- | --- |
| **Mobile** | `0–639px` | (no prefix; mobile is the default, unprefixed state) |
| **Tablet** | `640–1023px` | `sm:` |
| **Desktop** | `1024px+` | `lg:` |

**No Tailwind `screens` override is required.** Tailwind's default `sm`
(640px) and `lg` (1024px) breakpoints already land exactly on this system's
two tier boundaries — `sm:` *is* the mobile→tablet boundary and `lg:` *is*
the tablet→desktop boundary for this design system. Do not introduce a new
custom breakpoint name; use `sm:` and `lg:` as the two load-bearing prefixes
everywhere a component's mobile behavior is specified.

**`md:` (768px) is not a tier boundary in this system.** Tailwind ships it by
default and it remains available, but this system recognizes only three
density tiers. A component must not rely on `md:` as its primary responsive
decision point — if a layout needs a rule at 768px that isn't already implied
by the `sm:`/`lg:` split, that is a signal the component is trying to invent
a fourth tier, which Task 10's grid lab does not support and later component
tasks must not do either. `md:` may be used only for a minor visual nudge
inside an already-correct `sm:`/`lg:` structure (e.g. adjusting padding), never
to change which content is visible or how the primary-zone/rail structure is
arranged.

**`xl:` (1280px) and `2xl:` (1536px)** remain available for desktop-only
refinements (e.g. capping the maximum sheet width so the drafting-sheet
metaphor doesn't stretch edge-to-edge on very wide monitors) but do not gate
any density or layout decision — everything at `1024px+` is "desktop" for the
purposes of this document.

---

## 2. Layout per tier (Principle 4 applied)

Principle 4: one dominant information zone, at most one secondary rail, never
a repeated card grid.

- **Desktop (`1024px+`).** Full expression: the two-panel divider pattern
  (§18 — AI interpretation | policy panel, divided by one hairline rule
  carrying the mantra) renders side by side; the action monitor's persistent
  parties rail renders as a right-hand column alongside the primary
  state/timeline column.
- **Tablet (`640–1023px`).** The rail remains visible but narrows; if a
  two-panel divider pattern cannot hold both panels at readable width (see
  §3 body measure below) it stacks top-to-bottom with the hairline rule and
  mantra between them — it never collapses into a tab switcher, accordion,
  or drawer that hides one panel behind an interaction. Authority-separation
  visibility (Principle 6, PRINCIPLES.md) is not a desktop-only guarantee;
  both panels must stay simultaneously visible at every tier.
- **Mobile (`<640px`).** Single column. The primary zone renders first; the
  secondary rail (parties, metadata) stacks immediately below it as its own
  grouped section, separated by a hairline rule — not hidden behind a toggle.
  A rail is never traded for a drawer on mobile: collapsing the
  responsible-parties panel into an on-demand drawer would make Principle 6's
  visible authority separation conditional on a tap, which is a regression.
  Only *supplementary* detail that is not part of the authority-separation
  table (e.g. full raw event history beyond the last few timeline entries)
  may move into a Drawer on mobile to reclaim vertical space.

---

## 3. Density: characters per line

Two numbers, stated explicitly because Task 13 (hash pill) and every
component's mobile long-value rendering cite them directly.

### Body / prose text

**Body text max measure: ≤ 72 characters per line (`72ch`).** Applies to
paragraph prose — the AI interpretation panel's non-binding explanation,
policy descriptions, help text, empty-state and error copy. Implement as
`max-width: 72ch` (or Tailwind's `max-w-prose`, which is `65ch` — acceptable
as a slightly tighter default; `72ch` is the ceiling, not a floor) on the
containing block, at every tier. This is a hard ceiling, not a target to
approach loosely: a paragraph must never render wider than this measure even
on wide desktop viewports, because the drafting-sheet metaphor depends on
generous margin around dense content (VISUAL_LANGUAGE.md, "Generous margin
around the sheet"), not full-bleed text.

**Captions, annotation labels, small-caps mantra text: ≤ 40 characters per
line, single line, never wraps.** These are structural chrome (the divider
label, a panel's small-caps header, a timestamp caption) — the drafting-sheet
annotation register described in VISUAL_LANGUAGE.md, not reading content. If
a caption-role string would exceed 40 characters, the string is wrong for that
role, not the layout — with one named exception: the verbatim mantra ("AI
explains. Policy prices. Verifier checks. Watchdog challenges. Contract
settles.", 83 characters including periods) is exempt from this cap and is
always given its own full-width divider row (§18) rather than being squeezed
into a 40-character annotation slot.

### Monospace / hash / numeric text (Principle 1 faces)

Two sub-rules, because "monospace" in this system covers two different
content shapes: short auditable numbers, and long identifiers.

**Numeric monospace values (bond amounts, basis points, seconds, tabular
figures) are never truncated.** `Posted 2,800`, `Slashed 2,520 to reserve`,
`Reward 280 to challenger`, a challenge-window seconds figure — these are
short by construction and are the auditable value itself (Principle 1); they
always render in full, right-aligned, tabular, single line, regardless of
tier.

**Identifier monospace values (hash, address, transaction id) longer than 20
characters truncate to a fixed 6+4 form with a mandatory copy control.**
Exact rule:
- **≤ 20 characters:** render in full, inline, no truncation, no copy
  control required (e.g. a short verifier-tier code).
- **> 20 characters** — this covers every real hash/address/tx-id in the
  system (a policy hash, an analysis hash, a deployed verifier address at 42
  characters, a settlement tx hash at 66 characters all exceed 20): truncate
  to `0x` + first 6 hex characters + `…` + last 4 hex characters (e.g.
  `0x7f3a91…c92e`), rendered in the monospace face, and pair it with an
  explicit copy-to-clipboard control that copies the untruncated value. This
  is true at every tier, including desktop — truncation here is a legibility
  and scan-ability rule, not a mobile-only space-saving hack, so a hash pill
  does not "expand" into the full string at wider viewports.
- The truncated display form is never the vehicle for verification — the
  copy control exists precisely because eyeballing a 13-character abbreviated
  form (`0x` + 6 + `…` + 4) is not how a user should confirm a hash matches
  Casper. Full-value
  display (e.g. on `/proof/27`, where the whole point is an inspectable
  receipt) is a distinct, explicitly-opted-into rendering, not the default
  hash pill behavior; where a screen does show a full hash, it wraps inside
  its own monospace block at a fixed `40` characters per line (breaking only
  at hex-pair boundaries, never mid-byte) rather than overflowing or
  shrinking type size, and still carries the copy control.
- **Rules out:** letting a hash overflow its container and get clipped by
  `overflow: hidden` with no ellipsis and no copy control; shrinking font
  size to force a full hash onto one line on mobile; a "tap to reveal full
  hash" interaction that isn't the stated copy control (i.e. inventing a
  second, undocumented interaction for the same job).

---

## 4. Rail vs. Drawer

Ties directly to Task 15's `Drawer`/`Dialog` split and this document's
restatement of the workflow spec's Part 1 §9 Type 3 rule (as conveyed in the
task brief): drawers reveal detail; they never hold state that changes money.

**Rail — a persistent, non-dismissible column that is part of the page's
default layout**, not an overlay. Used for: the responsible-parties panel
(§19, compact grouped rows with expandable one-line detail) and the action
monitor's parties column (§22). A rail:
- Is always present at tablet and desktop (stacked, not hidden, on mobile —
  see §2 above).
- Has no open/close state, no backdrop, no focus trap, and cannot be
  dismissed — it is not optional content, it is part of what Principle 6
  requires to always be visible.
- Never contains an action that mutates state that changes money. A rail can
  show *that* a party exists and what it's attributed to; it triggers a
  Dialog (see below) if an interaction on it needs to actually do something
  state-changing.

**Drawer — a dismissible, non-blocking overlay that reveals additional
detail on demand.** Used for: transaction/receipt detail (Task 15's stated
instantiation). A Drawer:
- Opens from an explicit user action, closes on Escape or its own close
  control, and has no backdrop that blocks interaction with the rest of the
  page (per Task 15's `Drawer` spec: non-blocking, Escape closes).
- **Never holds, requests, or submits any state that changes money.** No
  submit-payment button, no challenge-submission control, no "confirm slash
  override" action, no form that authorizes a transaction — a Drawer may
  *display* a read-only receipt, a read-only past transaction's line items,
  or read-only expanded detail on an already-resolved event, but it cannot be
  the surface an irreversible or fund-moving action is confirmed on.
- If a flow needs the user to affirmatively commit to something that moves
  money or changes on-chain state (the submit-confirmation flow, a
  tamper-test flow), that flow uses the blocking `Dialog` component instead
  (Task 15: `blocking?: boolean` traps focus and disables Escape) — never a
  Drawer repurposed to feel more "serious" by adding a confirm button to it.

**The concrete distinguishing test:** if closing the overlay by pressing
Escape or clicking outside it would be an acceptable, side-effect-free thing
for the user to do at any point while it's open, it's a Drawer. If dismissing
it needs to be preventable (or needs an explicit "yes, I mean this," not just
"close"), it's a Dialog with `blocking`. A rail is neither — it never closes.

---

## 5. Self-check against `VISUAL_LANGUAGE.md` and `PRINCIPLES.md`

- **Density (VISUAL_LANGUAGE.md, Territory A):** one dominant zone plus at
  most one rail is preserved at every tier (§2); no tier introduces a card
  grid to solve a layout problem instead of a table, list, or stacked panel.
- **Principle 1 (numbers ≠ prose):** the two monospace sub-rules in §3 keep
  short auditable numbers full-precision and identify a single, explicit
  truncation threshold (20 characters) for long identifiers — nothing here
  shrinks or reformats a monospace value in a way that would make it
  unverifiable.
- **Principle 4 (density bounded):** §2's per-tier layout rules are the
  direct implementation of "one dominant information zone... at most one
  secondary rail... never a grid of ≥3 identical cards."
- **Principle 6 (authority named, not implied):** §2 explicitly forbids
  collapsing the two-panel divider or the parties rail behind a
  tab/accordion/drawer on any tier, since that would make visible authority
  separation conditional on an interaction.
- **Part 1 §9 Type 3 (drawers vs. dialogs):** §4's rail/drawer rule states
  the money-changing constraint as an explicit, testable rule (the Escape-key
  test), not just "use judgment."
