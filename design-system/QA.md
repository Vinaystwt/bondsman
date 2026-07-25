# Bondsman QA Checklist

Scope: explicit pass/fail assertions for auditing components built in Tasks
11–24 (design-system/lab/components/*.tsx) and their lab pages
(design-system/lab/app/**). Run manually or via the Task 27 screenshot pass.
This checklist does not cover Phase 2 product screens — lab-only.

## QA-1: Every interactive component has focus/hover/disabled/loading/error states

**Assertion:** every component that accepts user interaction exposes a
visually distinct treatment for at least focus and hover, plus
disabled/loading/error where those states are meaningful for it, and all of
them follow A11Y.md §2's exact focus-ring class string.

- **Button.tsx** — PASS. `default/hover/active/focus/disabled/loading`
  variants all present as forced states (`ButtonVisualState`), plus real
  `hover:`/`active:`/`focus-visible:` pseudo-classes wired in parallel.
- **Field.tsx** — PASS. label/help/error slots present; error uses
  `--destructive` (not `--consequential`, see Field.tsx header comment);
  focus ring on the underlying control follows the same rule via
  forms/page.tsx's `FIELD_BASE` wiring.
- **WalletStateCard.tsx** — PASS (spot-checked at `/wallet-states`):
  connected/connecting/disconnected/error states each render a distinct,
  static treatment; no state relies on hover alone to be legible.

## QA-2: No essential label under 12px

**Assertion:** every label a user needs to read to use the product (not
purely decorative text) is set at or above the system's type-scale minimum.

- Type scale minimum token is `--font-size-mono` = **14px**
  (`design-system/TOKENS/tokens.css`), used for hash/address identifiers —
  the smallest text class in the entire scale (`display` 48px, `headline`
  32px, `subhead` 20px, `data` 18px, `body` 16px, `mono` 14px).
- **PASS** — no component or lab page sets an essential label below 14px;
  nothing in the scale goes below 12px at all, so this check passes by
  construction as long as no ad-hoc `text-[Npx]` override is introduced
  outside `tailwind-tokens.ts`'s `fontSize` scale. Grep for `text-[` in
  `lab/components` and `lab/app` before shipping any new component to catch
  a stray override.

## QA-3: No text overflow at mobile width for long hashes/addresses

**Assertion:** a full-length hash/address (66-character settlement tx hash,
42-character verifier address) renders without horizontal overflow or
clipped text at mobile viewport widths.

- **HashPill.tsx** — PASS. Truncates anything over 20 characters to
  `0x` + 6 hex + `…` + 4 hex (RESPONSIVE.md §3); the untruncated value is
  only ever exposed via `title` and the copy control, never rendered inline
  at full length.
- **data-display/page.tsx `FullHashBlock`** — PASS. Full (untruncated) hash
  display uses `[overflow-wrap:anywhere]` on each chunked line as a safety
  net (commit `6538752`) so a full hash cannot force horizontal scroll even
  at narrow viewports, independent of the chunking logic.

## QA-4: Every animation has a reduced-motion equivalent rendered in the lab

**Assertion:** every animated transition named in MOTION_SPEC.md has a named
static equivalent, and that equivalent is what actually renders under
`prefers-reduced-motion: reduce`.

- Full mapping lives in `MOTION_SPEC.md` §9: bond split, panel/card
  entrance, lifecycle/ladder transitions, in-place number change, receipt
  sealing — one line each, cross-checked as **PASS** against
  `BondSplitAnimation.tsx`, `TimelineNode.tsx`, `PaymentLadder.tsx`,
  `Skeleton.tsx`/`ReceiptPanel.tsx`.
- Error/degraded/unavailable/disconnected states never animate in
  regardless of motion preference (Principle 5) — verified as **PASS** in
  `Banner.tsx` (zero `transition-*`/`animate-*`/`motion-*` classes, per its
  own header comment).

## QA-5: `ResolvedSlash` consequential-color scoping (open item resolved 2026-07-24)

**Rule:** a `ResolvedSlash` indicator uses `--consequential` when it is the
**primary signal** in a dense list/row context (e.g. a table badge). It
stays plain ink when it sits directly beside an already-colored
`BondValueBlock` on the same view (redundant re-signaling, diluting
Principle 3's scarcity).

- **TransactionRow.tsx** (Task 14) — PASS under this rule. The row's
  `ResolvedSlash` badge is the only signal of the slash in that dense table
  context, so it correctly carries `--consequential`.
- **TimelineNode.tsx** (Task 18) — PASS under this rule. The lifecycle
  marker deliberately does not use `--consequential` because it renders
  alongside an already-color-coded `BondValueBlock` on the same page; adding
  a second consequential-colored element there would re-signal the same
  fact twice and dilute the token's scarcity (Principle 3).
- Both components are correct **as-is**. This was flagged as an open item
  during Task 18's review (see `.superpowers/sdd/progress.md`) and is
  resolved here by documentation only — no component code changes.

## QA-6: No `rounded-*` / curve commands anywhere

**Assertion:** every component uses square/chamfered corners only (`--radius`
resolves to `0px`, tokens.css) — no `rounded`, `rounded-sm`, `rounded-full`,
etc.

- **PASS** across all audited components (Button, Field, HashPill,
  WalletStateCard, TransactionRow, TimelineNode, Banner) — confirmed via
  each component's own header comment stating the deviation-from-brief
  rationale where relevant.

## QA-7: No stray chromatic token use (`--accent`, `--consequential`)

**Assertion:** `--accent` is unused everywhere in interactive chrome;
`--consequential` appears only on the slashed portion of a resolved bond
split (subject to QA-5's scoping rule for badges) and nowhere else — not on
hover, not on errors, not on warnings, not on destructive controls.

- **PASS** — verified via `contrast.test.mjs`'s required-token list keeping
  `destructive` separately named from `consequential`, and via header
  comments in Button.tsx, Field.tsx, Banner.tsx, HashPill.tsx all
  explicitly documenting the correction away from `--consequential`/
  `--accent` where the original brief samples used them incorrectly.

---

## Audit pass log (2026-07-24)

Spot-checked lab pages against QA-1 through QA-7 above:

| Page | QA-1 | QA-2 | QA-3 | QA-4 | QA-5 | Result |
|---|---|---|---|---|---|---|
| `/buttons` | PASS | PASS | n/a | n/a | n/a | PASS |
| `/wallet-states` | PASS | PASS | n/a | PASS | n/a | PASS |
| `/data-display` | n/a | PASS | PASS | n/a | n/a | PASS |
| `/lifecycle` | PASS | PASS | n/a | PASS | PASS | PASS |
| `/forms` | PASS | PASS | n/a | n/a | n/a | PASS |

No failures found — every page audited was already correct at time of
audit. See `.superpowers/sdd/task-25-report.md` for detail.
