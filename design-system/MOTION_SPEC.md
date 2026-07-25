# Bondsman Motion Spec

Territory A, "Structural Ledger" (VISUAL_LANGUAGE.md). This is the timing/
easing contract Claude Design's later animation session (Part2 deliverable
31) reads directly — no other file in this system defines timing values.
Every duration and easing name below is a literal token from
`design-system/TOKENS/tokens.css` (Task 6); this spec does not invent new
values.

## 1. Motion principles

1. **Motion reports state, it never performs it.** Every animation in this
   system exists to make a real state transition legible (a bond splitting,
   a number changing, a step advancing). Nothing moves purely for delight —
   there is no ambient motion, no idle looping, no ornamental parallax.
2. **The mark's own geometry is the only motion vocabulary.** Where
   something visually "opens" or "divides," it follows the two-splits
   structure LOGO_READING.md already documents (pillars/base slabs divided
   by a gap) — the bond-split animation is a moving version of a shape that
   already exists at rest, not a new gesture invented for this task.
3. **Consequence is slower and more deliberate than routine feedback.**
   Routine UI feedback (hover, focus, a ladder step advancing) is fast and
   quiet; the one moment that represents real economic consequence (a
   resolved bond) is the longest, most choreographed animation in the
   system, and it is choreographed exactly once — see §6.
4. **Every animated state has a static equivalent that is independently
   truthful.** No animation may be the only place a state is legible.
   Reduced motion, a slow connection, or a screenshot must all read
   correctly with zero motion (see §9).
5. **Motion stops the instant the interface is not healthy.** Per
   PRINCIPLES.md Principle 5, no motion of any kind — including entrance,
   hover, or ambient motion that would otherwise be standard for a healthy
   instance of that same component — plays while an error, degraded,
   unavailable, or disconnected state is on screen.

## 2. Timing ranges (Task 6 tokens, verbatim)

| Token | Value | Band | Used for |
|---|---|---|---|
| `--duration-short` | `120ms` | micro-feedback | hover/focus state changes, ladder step advancing, in-place number shifts |
| `--duration-medium` | `240ms` | local transitions | entrance of a panel/card already in view, state-to-state lifecycle marker changes, receipt seal micro-motion |
| `--duration-long` | `480ms` | the one consequence animation | the bond split (§6) only |

No animation in this system uses a duration outside these three values.
Anything that reads as "should take longer than 480ms" (e.g. a settlement
countdown) is a progress *indicator* driven by real elapsed time, not a
CSS/JS animation duration (see §5).

## 3. Easing families

- **`--ease-standard`** — `cubic-bezier(0.2, 0, 0, 1)`. A fast-out,
  no-overshoot curve. Used for anything routine and reversible: hover/focus
  transitions, ladder step advances, lifecycle marker swaps, panel
  entrances. It should feel efficient and slightly clipped — a UI doing its
  job, not making an announcement.
- **`--ease-emphasized`** — `cubic-bezier(0.3, 0, 0.1, 1)`. A slower
  in-and-out curve with more hang time at the start and end. Reserved for
  the bond-split animation and nothing else. Its extra dwell at both ends is
  what makes the split read as deliberate rather than a UI glitch — this is
  the one place in the system where motion is allowed to feel weighty.

## 4. Entrance behaviour

Panels, cards, and rows that enter an already-open screen (e.g. a new
timeline node appearing, a receipt panel mounting) fade and shift up
slightly: `opacity 0 → 1`, `translateY(4px) → 0`, `--duration-medium`,
`--ease-standard`. Nothing scales, bounces, or overshoots on entrance.
Content that is present on first paint (initial page load) does not
animate in at all — entrance motion is reserved for content appearing
*after* the user is already looking at the screen, not for page load itself.

## 5. State transitions

- **Lifecycle-to-lifecycle** (Initiated → Bonded → Executed → Challenged →
  ResolvedSlash/ResolvedRefund): the marker's fill/outline and label
  crossfade over `--duration-medium` with `--ease-standard`. The marker
  never "travels" between positions — each lifecycle state is a distinct
  visual treatment (Task 18), not a token moving along a track, so the
  transition is a crossfade between two fixed treatments, not a slide.
- **Payment-ladder-to-ladder** (one `PaymentState` position becoming
  current): the outgoing position's emphasis (ink weight) fades to the
  DONE treatment and the incoming position gains ink weight, both over
  `--duration-short` with `--ease-standard`. This is the fastest state
  transition in the system because it is the most frequent and most
  routine.

## 6. Progress behaviour

Progress is never simulated. A challenge countdown or a settlement-pending
wait is driven by the real remaining time/real pending status, not an
animation loop:

- **Challenge countdown**: the numeric time-remaining figure updates in
  place on a 1-second cadence using the in-place number-change treatment
  (§10) — no animated progress bar, no easing curve "smoothing" the
  countdown, because the countdown's value is real and must never visually
  lead or lag the real clock.
- **Settlement pending**: rendered as a static "Settlement pending" label
  with no spinner and no shimmer. Per Principle 2 and Principle 5, an
  indeterminate wait does not get an animated placeholder implying activity
  the UI cannot actually confirm; it gets an honest static state that
  updates the instant real state changes.

## 7. Consequence behaviour — the bond split (choreographed)

This is the one `--duration-long` / `--ease-emphasized` animation in the
system, and it fires exactly once per action, at the live transition into
`ResolvedSlash` or `ResolvedRefund` (never on a static/replayed view of an
already-resolved action — see §9). Choreography, in order, against
`BondValueBlock`'s actual props (`posted`, `asset`, `resolution: {slashed,
reward, refund}`):

1. **Hold.** The undivided `BondValueBlock` (no `resolution` prop) sits on
   screen exactly as it has throughout the bonded/executed/challenged
   lifecycle — a single sealed block reading `Posted {posted} {asset}`. No
   motion yet; this beat is a deliberate pause immediately before the
   `resolution` prop becomes available, so the split reads as caused by the
   real state change, not as decoration layered on top of it.
2. **Divide.** Over `--duration-long` (480ms) with `--ease-emphasized`, the
   block visually separates along the same gap geometry the mark's own
   pillars/base slabs use (LOGO_READING.md) into three segments — Slashed
   to reserve, Challenger reward, Payer refund — matching the three fields
   of the `resolution` object. The divider lines (`divide-x`/`divide-y` in
   `BondValueBlock`) are what animate open; the outer border does not move.
3. **Count, don't cut.** Each of the three resulting figures animates from
   its pre-resolution value (0, since none of the three fields exist before
   resolution) up to its final `resolution.slashed` / `resolution.reward` /
   `resolution.refund` value across the same 480ms window, rather than
   jump-cutting straight to the resolved number. The three figures count
   concurrently, not staggered — resolution is a single event, not three
   sequential ones.
4. **Colour resolves last.** If `resolution.slashed > 0` (a slash), the
   `Slashed to reserve` figure's `--consequential` colour reaches full
   opacity only as the count finishes, coinciding with the number settling
   on its final value rather than appearing at the start of the divide.
   This keeps the accent tied to the *number being true*, not to the
   container merely opening. A refund resolution (`slashed === 0`) never
   introduces colour at any point in the sequence — the figure counts to
   `0` in plain `--muted`, per Principle 3.

Total elapsed choreography time is exactly `--duration-long` (480ms) from
hold to settled; there is no additional stagger between the divide and the
count — they are the same 480ms window, because a bond that appears to
"open" before its numbers are correct would itself be the interface lying
about a state.

## 8. Receipt-sealing behaviour

A receipt transitioning into a `valid` state (e.g. after a successful
verify check) gets a brief, quiet "settle" treatment: the panel's border
weight steps from its resting 2px to itself (no scale/shadow change) while
the status line crossfades in, over `--duration-medium` with
`--ease-standard`. This deliberately echoes "sealed" without borrowing the
bond-split's `--ease-emphasized`/`--duration-long` treatment — a receipt
being valid is a routine confirmation, not the system's one consequence
event, so it must not compete with the bond split for visual weight. The
four rejection states (`malformed`, `tampered`, `signature-failure`,
`unavailable`) never animate in at all (see §9/§11).

## 9. Reduced-motion mapping

One line per animation type, naming its static equivalent under
`prefers-reduced-motion` (or `useReducedMotion()` in the React lab):

- **Bond split (§7)** → the three-segment resolved `BondValueBlock` renders
  immediately at its final divided state with final numbers, no divide, no
  count-up, no colour fade-in.
- **Panel/card entrance (§4)** → content appears at `opacity 1` /
  final position with no fade or shift.
- **Lifecycle/ladder state transitions (§5)** → the new treatment (marker
  fill, ink weight) applies instantly with no crossfade.
- **In-place number change (§10)** → the new value replaces the old value
  with no shift/emphasis frame.
- **Receipt sealing (§8)** → the settled border/status line render in their
  final state with no crossfade.

## 10. In-place number change behaviour

When a number that is already on screen updates (a countdown tick, a
figure correcting after a re-fetch), it shifts with subtle emphasis, not a
bounce or glow: the digits translate a few pixels vertically and back
(`--duration-short`, `--ease-standard`) while briefly gaining `text-ink`
weight before returning to their resting weight. There is no scale change,
no colour flash, and no elastic/spring overshoot — the number must read as
"this value updated," not as a celebratory event, which matters
particularly for the challenge countdown where the update is just a clock
ticking, not news.

## 11. Mobile motion simplification

On mobile (single-column layouts, per RESPONSIVE.md), the bond split's
divider animates only along the vertical axis (`divide-y`, matching
`BondValueBlock`'s own mobile-first `grid-cols-1 divide-y` layout before
its `sm:` breakpoint switches to `divide-x`) — there is no additional
diagonal or cross-axis motion invented for small screens. Entrance motion
(§4) drops its vertical shift on mobile and uses opacity only, since a
translateY entrance competes with scroll-driven reflow on narrow viewports
where content is more likely to already be shifting. No animation gains
complexity on mobile; simplification only ever removes an axis or a
component of motion, never adds one.

## 12. Motion-prohibited states

Per PRINCIPLES.md Principle 5 ("Motion stops at the edge of trouble"): the
instant the UI enters an error, degraded, unavailable, or disconnected
state, all motion is suppressed — no spinners, no shimmer skeletons, no
pulsing retry indicators, no continuing ambient animation, and no hover,
entrance, or ambient motion applied to a component currently rendering
stale, disconnected, or error data, even if that motion is otherwise
standard for that component type when healthy. This is binding on every
section above: nothing in this spec may be read as authorizing motion
during an unhealthy state, because motion at that moment is precisely
**"any time the interface would lie about a state"** — implying activity,
progress, or recovery the system cannot actually confirm.

## 13. Homepage mechanism storyboard

No production homepage exists yet; this storyboard is a reasonable design
invention for how the mechanism ("post a bond → an action executes →
independent verification → resolve") should read as a six-frame motion
sequence on first load, using only the vocabulary already defined above.

**Frame 1 — Undivided block at rest.**
On stage: a single sealed `BondValueBlock`-style slab, centered, reading
"Posted 2,800 csprUSD," on the paper ground with no supporting copy yet.
Enters: nothing (this is first paint — no entrance motion, per §4). Exits:
nothing. Dwells: ~1200ms. Timing: static. Still-frame description: one
solid chamfered block, no gap, no colour — establishes "a bond is a single
sealed thing."

**Frame 2 — Mechanism labels arrive.**
On stage: the same block, now smaller/repositioned toward one side. Enters:
three short labels ("AI explains. Policy prices. Verifier checks.") fade
and shift up beside it, staggered by `--duration-short` per label, each
using `--duration-medium`/`--ease-standard`. Exits: nothing. Dwells:
~1000ms after the last label settles. Timing: ~600ms total entrance.
Still-frame description: block on one side, three short mechanism labels
stacked beside it in ink, no colour.

**Frame 3 — Challenge tension.**
On stage: block + labels from Frame 2, now joined by a fourth label,
"Watchdog challenges." Enters: the fourth label, same treatment as Frame 2
(`--duration-medium`/`--ease-standard`). A countdown-style figure appears
beneath the block using the in-place number-change treatment (§10) ticking
down a few times to suggest a live challenge window. Exits: nothing.
Dwells: ~1500ms. Timing: label entrance 240ms; countdown ticks at
`--duration-short` each. Still-frame description: block, four mechanism
labels, one ticking numeric figure beneath it — nothing has resolved yet.

**Frame 4 — Resolution triggers (the bond split).**
On stage: the same block. Enters: the fifth label, "Contract settles,"
using the same `--duration-medium` treatment. Immediately after, the block
plays the full bond-split choreography from §7 in its slash variant: hold,
divide, count, colour-resolves-last, over `--duration-long`/
`--ease-emphasized`. Exits: the countdown figure from Frame 3 (fades out
at `--duration-short` just before the split begins — a live countdown and
a resolved value should never be on screen at once). Dwells: ~800ms after
the split settles. Timing: 480ms for the split itself. Still-frame
description: the block now divided into three labelled segments, one in
`--consequential`, the mantra's five labels all present in a column beside
it.

**Frame 5 — Refund variant (contrast beat).**
On stage: a second, independent block instance, undivided, reading "Posted
1,050 csprUSD." Enters: fades in at `--duration-medium`/`--ease-standard`
beside/below the first (resolved) block, establishing this is a different
action, not a replay. It then plays the same §7 choreography but in its
refund variant (`slashed: 0`) — identical divide/count timing, no colour
introduced. Exits: nothing. Dwells: ~1000ms. Timing: 480ms for its own
split. Still-frame description: two resolved blocks side by side, same
split geometry, only one carrying colour — the frame that makes Principle
3's "colour is exclusive to slash" legible at a glance.

**Frame 6 — Settle to static index.**
On stage: both resolved blocks from Frames 4-5, plus the five-line mantra,
now composed as a calm, final resting layout (e.g. what a real homepage
hero would hold). Enters: nothing further animates — this frame is the
storyboard's static destination, reached once, not looped or replayed.
Exits: none of the intermediate labels/countdown remain on stage past this
point. Dwells: indefinite (this is the resting state a visitor scrolls
past). Timing: no animation; this is the true still frame. Still-frame
description: two divided blocks (one slash, one refund) and the mantra
text as plain, legible ink — the entire mechanism readable with zero
motion, satisfying §9's requirement that every animated sequence have an
independently truthful static equivalent.
