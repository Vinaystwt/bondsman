# Principles

This document is the rulebook. Every later component task's "done" bar includes
one question: *does this violate a PRINCIPLES.md rule?* If a component cannot
be justified against what follows, it does not ship, no matter how polished it
looks in isolation.

## Strategy

Bondsman's previous frontend was, in the workflow spec's own words, "a
marketing shell dressed as an app; it broke the moment a real user tried to do
anything" (Part1 §1). The rebuild exists to prevent that failure from
recurring at the design-system level, not just the code level. A design system
that optimises for looking impressive in a still screenshot — hero gradients,
soft cards, marketing-site rhythm — will regenerate the exact shell the
executive verdict condemns, just with better spacing. This system instead
exists to make Bondsman legible as what Part1 §1-2 says it actually is: **an
operational instrument with a homepage attached**, not a landing page with an
app appended. The homepage is short and mechanical; the instrument — the
policy panel, the action monitor, the receipt, the verifier — is where the
product lives, and it must look like it is reporting on a real settlement
system, not selling one.

Concretely, this system has to do two jobs Part1 makes non-negotiable:

**1. Keep the authority-separation table (Part1 §4) visually legible on every
screen where it applies.** Bondsman's entire credibility rests on the fact
that no single actor in the system is trusted to both decide and settle:

| Authority | Owns |
| --- | --- |
| Live AI model | Non-binding interpretation, risk factors, confidence, recommendation |
| Deterministic policy | Risk tier, basis points, minimum bond, challenge window, verifier selection |
| On-chain verifier | Objective outcome of the fault check |
| Watchdog | Independent challenge submission |
| Casper contracts | Slash / refund, state transitions, receipt sealing |
| Payer wallet | x402 payment authorisation, submit authorisation |
| Configured backend acting agent | Action creation, bond funding, transaction submission, gas |

A component that visually merges two rows of this table into one undivided
block (e.g. presenting the AI's recommendation and the policy's price as a
single unstyled paragraph) is a regression, even if every word on the page is
accurate. Separation has to be seen, not just written.

**2. Carry the mantra verbatim, every time it applies.** Part1 §4 is explicit:
*"AI explains. Policy prices. Verifier checks. Watchdog challenges. Contract
settles."* This is the one sentence Bondsman is allowed to repeat identically
across the product, and the system must never generate a paraphrase of it
("AI decides," "the AI recommends and the contract confirms," etc.) — Part1
§4 reserves the verb "decides" for nobody in this system; only the verifier
"checks" and the contract "settles."

Everything below operationalises those two jobs into rules concrete enough
that a reviewer — human or agent — can point at a screen and say which rule it
passes or fails.

## Principles

### 1. Numbers and hashes are not prose

**Rule.** Any value that is a hash, address, transaction id, bond amount, or
basis-point figure renders in the system's monospace numeral face with
tabular figures; prose text never borrows that face, and the monospace face
never carries prose.

**Rules in:** the policy hash (`0x7f3a…`), the analysis hash, a deployed
verifier address, `Posted 2,800` / `Slashed 2,520 to reserve` / `Reward 280 to
challenger` in the slash economics block (§23), a settlement tx hash with its
copy control, the challenge window shown in both seconds and readable form
(§18) — the seconds figure is monospace, the readable form ("48 hours") is
not, because one is a machine-checkable value and the other is a
human-readable gloss on it.

**Rules out:** setting a headline or a marketing sentence in the monospace
face for a "techy" look; rendering a bond amount in the same proportional
face as the sentence around it just because it's short; truncating a hash
inline in a sentence ("the receipt at 0x7f3a is now final") without switching
faces at the truncation boundary. If a number can be independently verified
against Casper or a signature, it gets the monospace treatment; if it is the
system's own prose describing that number, it does not.

### 2. Live, Historical, and Blueprint differ in construction, not just in label

Per Part1 §25, badges are reserved for genuine confusion risk (the template
picker, the `/proof/27` header, `/build` sections) — most of the product must
communicate evidence class without a badge on every element. The system
resolves this with two orthogonal, structural signals instead of a label:

**Rule (fill).** Content that is real and settled — Live or Historical — is
rendered as a solid, filled container, matching the logo mark's own
construction (`LOGO_READING.md`: "filled … not stroked — there is no outline
path"). Content that is Blueprint — a proposed adapter, an unbuilt verifier,
a template that cannot execute — is rendered as an outline-only container:
same geometry, no fill. A blueprint is a drawing of a thing, not the thing;
the container should look like a drawing.

**Rule (activity).** Within the filled (real) category, Live is distinguished
from Historical by presence of activity, not colour: Live content carries a
polling/update affordance (a timestamp that visibly advances, a connection
state) because it is still changing; Historical content is inert by
construction — its timestamp is fixed ("Settled 14 Mar 2026"), nothing on it
ticks, and it never shows a live-connection indicator, because Action 27 is
not still happening.

**Rules in:** a Blueprint row in the `/app/new` template picker rendered as an
outlined card with no background fill, sitting next to filled, solid
executable rows; `/proof/27` rendered as a fully filled, solid layout with a
static "Historical" header and no polling dot anywhere on the page; the
action monitor (§25: "no label needed — the whole monitor is live by
definition") needing no badge at all because its filled construction plus
visible polling state already say "live" structurally.

**Rules out:** a dashed border or "coming soon" ribbon as the blueprint
treatment (decorative, not structural); putting a "Live" or "Historical" pill
on every card as a substitute for this construction; giving Historical
content the same live-updating timestamp component as Live content and
relying on a badge alone to tell them apart.

### 3. Consequence is a split, not a colour

Part1 §23-24 already establishes that the slash header uses "the
`consequential` treatment … not decorative red, an intentional accent that
only appears at consequence," and that refund is deliberately quieter.
`LOGO_READING.md` gives the system the physical vocabulary to do this without
inventing a new red: the mark is already built from two components — pillars
and base slabs — each already drawn as two separate pieces divided by a gap,
at both the top and bottom of the mark, "structural, not decorative." That gap
is the resolution motif.

**Rule (motion of the motif).** A bond in flight renders as a single sealed
block (no gap). At resolution — slash *or* refund — the block splits open
along that same gap geometry. The split itself means "resolved." It carries
no judgment about good or bad; both outcomes split.

**Rule (colour is exclusive to slash).** Only when the split resolves as a
slash does the accent colour reserved for consequence appear, and only on the
slashed portion. That colour is used nowhere else in the entire system — not
on form-validation errors, not on destructive buttons, not on warning
banners, not on hover states. Its scarcity is the point: if it appears
anywhere on screen, real economic slashing happened on Casper. A refund
resolves with the identical split geometry rendered in neutral ink — same
shape, no accent — which is what makes it "deliberately less dramatic than
the slash experience" (§24) without looking unfinished.

**Rules in:** the bond-split animation firing at `ResolvedSlash` with the
slashed piece taking the consequential accent and the reserve/challenger
figures in monospace beside it; the same split firing at `ResolvedRefund` in
plain ink with no accent anywhere on the frame; the static (non-animated)
resolved frame remaining legible as slash-vs-refund purely from accent
presence/absence, per §23's "the static frame remains truthful without
animation."

**Rules out:** a red "error-style" banner anywhere in the product that is not
an actual slash (e.g. using the consequential accent for a failed API call or
a form error); a green "success" treatment on refund (refund is quiet, not
celebratory — Part1 §24 explicitly rejects "consequences always happen" as a
framing); reusing red/green as a general status-colour pair elsewhere in the
system (destructive buttons get a distinct, separately-named token, never the
same value as the slash accent).

### 4. Density is bounded — no generic card sprawl

**Rule.** A screen has one dominant information zone and at most one
secondary rail; it is never built by stacking three or more visually
identical cards as the primary layout strategy. If a screen's content is
naturally a set of comparable items, the system chooses a table, a grouped
list with typographic hierarchy, or the two-panel divider pattern (§18)
before it chooses a repeated card grid.

**Rules in:** the policy result screen as two adjacent panels — AI
interpretation, deterministic policy — separated by one divider carrying the
mantra (§18), not two stacked "insight cards"; the responsible-parties panel
(§19) as compact grouped rows with expandable one-line detail, not one card
per party; the action monitor (§22) as a primary state/timeline column plus
one persistent parties rail, not a dashboard of metric cards.

**Rules out:** a "dashboard" home for `/app` composed of N uniform metric
cards with no hierarchy between them; an actions list rendered as an infinite
grid of identical cards where every action looks equally important regardless
of state (pending vs. slashed vs. refunded actions must look different, per
Principle 3 — a uniform card grid erases that); reaching for a card as the
default wrapper for any group of ≥3 related values instead of asking whether
a table or list communicates the relationship better.

### 5. Motion stops at the edge of trouble

**Rule.** The instant the UI enters an error, degraded, unavailable, or
disconnected state, all motion is suppressed — no spinners, no shimmer
skeletons, no pulsing retry indicators, no continuing ambient animation.
Degraded states render as static, fully legible frames. This rule is binding
on the motion spec produced later (Task 24): that spec may define what moves
during healthy states, but it may not define anything that moves during
unhealthy ones.

**Rules in:** the bond-split animation (Principle 3) playing only during a
live, healthy transition to a resolved state, per §23 — "the bond split
animation is required in the monitor when transitioning live. The static
frame remains truthful without animation"; a "backend unavailable" or
"reconnecting" banner appearing instantly with no fade-in, no shimmer
placeholder standing in for missing data, and no spinner implying imminent
recovery; a stale action monitor showing a plain "Restored from your last
session" note (§25) as inert text, not an animated recovery sequence.

**Rules out:** an animated skeleton screen as the "graceful" fallback for a
failed or slow request; a loading spinner layered on top of a degraded-state
banner; any hover, entrance, or ambient motion applied to a component that is
currently rendering stale, disconnected, or error data, even if that motion
is otherwise standard for that component type when healthy.

### 6. Authority is named, not implied

**Rule.** Wherever two or more rows of the authority-separation table (see
Strategy, from Part1 §4) are visually adjacent, the mantra — *"AI explains.
Policy prices. Verifier checks. Watchdog challenges. Contract settles."* —
appears verbatim, not paraphrased, and no component uses the word "decides"
to describe the AI model or a challenger.

**Rules in:** the §18 policy-result divider carrying the mantra text exactly;
the action monitor's timeline entries each attributed to the specific actor
that owns them ("Policy priced the bond," "Watchdog submitted a challenge,"
"Contract settled: refund") rather than a generic "System" actor; the AI
interpretation panel labelled non-binding with its recommendation framed as
"recommended decision," never "the AI's decision."

**Rules out:** compressing the AI panel and the policy panel into a single
box with one heading, which erases the boundary Part1 §4 requires be visible;
copy anywhere that says the AI "decided," "approved," or "authorised" an
action; a shortened or reworded mantra (e.g. "AI thinks, policy prices,
chain settles") used for space reasons — if it doesn't fit verbatim, the
layout is wrong, not the sentence.
