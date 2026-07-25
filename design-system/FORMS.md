# Forms

This document is the form-system rulebook: how fields group, how a field's
own label/help/error text stack, how a multi-stage flow (Part1 §16's
`/app/new` model is the concrete future case, though no such flow exists in
this design system yet) shows progress, and how a form's primary/secondary
actions pair up. It sits alongside `PRINCIPLES.md` — a form that violates a
rule below is wrong even if every individual control (Task 11's `Button`,
Task 12's `Field` and the samples on `/forms`) is itself correctly built.

## 1. Grouping: related fields share a labelled fieldset

**Rule.** Fields that are answers to one logical question — a set of radio
options, a set of checkboxes, an address entered as separate street/city/
postal inputs, a date split into day/month/year — are grouped inside a
single `<fieldset>` with one `<legend>` (or equivalent accessible group
name), not presented as N independent `Field`s that merely sit near each
other in the layout. The group gets one help/error message that applies to
the whole group, not one per member field.

This is the pattern `design-system/lab/app/forms/page.tsx`'s radio-group
sample demonstrates concretely: two `<input type="radio">` options share one
`<fieldset>`, `Field`'s own label text ("Challenge window") stays the visual
heading every other control uses, and the `<legend>` (visually hidden, same
text) carries the group's real accessible name — because `<label for>`
cannot target a `<fieldset>` element, only a labelable control.

**Rules in:** a challenge-window choice as one radio fieldset with one error
("Select a challenge window before continuing"); a set of "notify me by"
checkboxes (email / on-chain event / none) as one fieldset; a policy-terms
acceptance checkbox standing alone (it is one field, not a group, so it uses
`Field` directly with no surrounding fieldset).

**Rules out:** four separately-labelled `Field`s for what is really one
address, each with its own help text repeating "part of your funding
address"; a radio group with no `<fieldset>`/`<legend>` at all, relying on
visual indentation alone to imply the options are related; an error message
duplicated on every option in a group instead of stated once for the group.

## 2. Label / help / error hierarchy

**Rule.** Every field has at most three text elements, in this fixed
priority order: **label** (always shown), **help** (shown only when there is
no error), **error** (shown instead of help, never alongside it). This is
exactly what `Field` (`design-system/lab/components/Field.tsx`) enforces in
code — `{help && !error && …}` before `{error && …}` — so no page can
accidentally show a stale help string and a live error message stacked on
top of each other.

Error text always renders in `--destructive` with `role="alert"`, **never**
`--consequential`. `PRINCIPLES.md` Principle 3 is explicit that the
consequential accent is reserved exclusively for the slash moment and names
"form-validation errors" as one of its own out-of-bounds cases — reusing it
here would mean every rejected form on the site visually claims a real
economic slash just happened. `--accent` is equally off the table for any
part of this hierarchy (label, help, or error text, or the control's focus
ring): per the token contract in `design-system/TOKENS/tokens.css`, `--accent`
is not used in components 7-23 at all; focus and emphasis are carried by
`--ink`/`--boundary` weight, never a third colour.

**Rules in:** a field showing its help text at rest, then swapping to a
`role="alert"` error the instant validation fails, with the help text gone
(not hidden-but-present, actually removed from the DOM so a screen reader
doesn't announce both); a field with no help copy at all showing only its
label until an error appears.

**Rules out:** showing both help and error at once ("Enter your address."
followed immediately by "Not a valid address." in a second line); an error
message with no `role="alert"` (or equivalent live-region wiring) that a
screen-reader user only discovers by re-reading the form; any error, on any
field, anywhere, rendered in `--consequential`.

## 3. Per-stage progress affordance

This system does not yet have a real multi-stage form flow — Part1 §16's
`/app/new` model is the concrete case a later phase will build — so this
rule is stated abstractly now for that implementation to follow, rather than
retrofitted from a component that doesn't exist yet:

**Rule.** A multi-stage flow shows a progress indicator sitting above the
currently active stage, listing every stage by name in order. The active
stage is expanded in full (its actual fields, not a summary). Every
completed stage collapses to a one-line summary of what was entered, paired
with an explicit "Edit" control that reopens it — never a bare checkmark
with no way back in, and never a completed stage left fully expanded
alongside the active one (that regresses to a single long scroll, which is
exactly the ambiguity a stage flow exists to remove). An upcoming
(not-yet-reached) stage is named in the indicator but rendered inert — no
fields, no summary, nothing implying it can be jumped to out of order until
the stages before it are complete.

**Rules in:** stage 3 of 9 active with its own fields open; stages 1-2 each
collapsed to a single summary line ("Risk tier: Standard — Edit") stacked
above it; stages 4-9 named in the indicator strip but otherwise blank.

**Rules out:** a progress bar with only a percentage and no stage names; a
completed stage that silently discards its entered values if the user goes
back (an "Edit" control implies the values are still there to edit, not
re-entered from scratch); every stage rendered expanded at once with the
indicator as pure decoration.

## 4. Primary / secondary action pairing

**Rule.** A form's primary action (the one that advances state — "Continue,"
"Fund bond," "Submit challenge") is right-aligned or sits at the bottom of
the form, using `Button`'s `primary` variant. Where a secondary action
exists ("Back," "Cancel," "Save draft"), it sits immediately beside the
primary action in the `secondary` or `quiet` variant — never `primary`.
**Two `primary`-variant buttons are never adjacent.** A screen with two
equally-weighted actions has to pick which one actually advances the user
forward and demote the other, because `primary`'s solid `--ink` fill
(`components/Button.tsx`: "a solid ink fill… filled = real, settled
construction") is this system's one visual signal for "the thing that moves
this forward" — two of them side by side erases that signal entirely.

**Rules in:** "Back" (`quiet`) and "Continue" (`primary`) side by side,
Continue on the right; a lone "Fund bond" `primary` button bottom-right with
no sibling action; "Cancel" (`secondary`) and "Revoke access" (`destructive`)
paired when the primary action of that specific screen is itself a
destructive one — `destructive` is a distinct variant from `primary` and may
stand alone as the screen's one emphasized action, but still never appears
doubled up with a second `destructive` or a `primary` beside it.

**Rules out:** "Save draft" and "Continue" both rendered `primary`; a
secondary action rendered larger, bolder, or positioned before (to the left
of, or above) the primary action, implying it's the recommended path; three
or more same-weight buttons in a row with no visual hierarchy between them.
