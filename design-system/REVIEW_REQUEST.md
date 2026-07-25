# Phase 1 Review Request

Phase 1 of the Bondsman design-system rebuild (Tasks 1-27) is complete. This
is the stop point: **do not begin Phase 2** (production build against
`frontend/`) until you've reviewed the material below and explicitly approved
the visual direction.

## 1. What was decided: the visual territory

`VISUAL_LANGUAGE.md` explored three distinct territories and scored each
against the candidate-quality list (accountable, exact, financial,
consequential, calm, premium, technical, human-readable, instrument-like,
editorial, architectural, durable, restrained):

- **A — Structural Ledger** (selected): a precise working drawing of a
  settlement machine that also keeps accounts. Cool ink-on-paper, filled vs.
  outline construction, chamfered corners, hairline drafting rules, hard
  grotesque/monospace split.
- **B — Settlement Terminal** (rejected): a dark operational console,
  monospace-forward. Most "live"-feeling of the three, but its dark ground
  inverts the logo's own ink-on-transparent construction, and it sits one
  careless gradient away from the entire anti-slop list (neon crypto,
  cyberpunk, generic dashboard).
- **C — Bearer Instrument** (rejected): a warm-paper printed-certificate
  register with a transitional serif. Strong on premium/editorial, but a
  humanist serif directly contradicts the mark's zero-curve, mechanical
  posture, and the metaphor has no natural home for a live-updating monitor.

**Why A won, in short:** the approved mark is filled (not stroked), has zero
curve commands, and carries two measured chamfer angles (~41.7° on the
pillars, 62.68° on the base slabs). Territory A is the only one of the three
whose corner treatment and filled/outline logic can be *derived* from those
exact numbers rather than invented — it doesn't decorate the mark's grammar,
it *is* the mark's grammar at page scale. The mark is also already built from
two components split by a centreline gap, which is the exact geometry
Bondsman's bond-split-at-resolution mechanism needs (a sealed slab in flight,
dividing into slashed/reward/refund at `ResolvedSlash`). Neither B (dark
ground fights the mark's light-native construction) nor C (curved serif
fights the mark's zero-curve posture) can make that same claim.

Chroma is rationed to exactly two reserved roles — `--consequential` (used
only on the slashed portion at resolution) and `--destructive` (separately
named, never conflated) — with everything else (links, focus, live state)
expressed through ink weight, rules, and motion rather than a third color.
Full reasoning, the described sample screens, and the anti-slop
item-by-item declaration are in `VISUAL_LANGUAGE.md`.

## 2. How to review it yourself

Run the lab locally:

```bash
npm run design-lab
```

(from the repo root; equivalent to `npm install && npm run dev` inside
`design-system/lab/`). Serves at **http://localhost:4400**, with 18 routes
covering every component and system rule — buttons, forms, wallet/payment/
lifecycle states, receipts, evidence labels, data display, color, typography,
grid, spacing, icons, motion, overlays, mobile nav, logo usage, and
banners/states.

## 3. Screenshot set (`design-system/SCREENSHOTS/`)

All 18 files, captured against the running lab:

| File | Shows |
|---|---|
| `home.png` | Lab index page — route list and system overview |
| `color.png` | Full color ramp: ground, ink, the two reserved chromatic roles, neutral scale |
| `typography.png` | Grotesque (prose/UI) and monospace (numbers/hashes) type scale side by side |
| `spacing.png` | Spacing scale tokens |
| `grid-desktop.png` | Layout grid at desktop viewport |
| `grid-tablet.png` | Layout grid at tablet viewport |
| `grid-mobile.png` | Layout grid at mobile viewport |
| `buttons.png` | Button variants and forced states (default/hover/active/focus/disabled/loading) |
| `forms.png` | Field component: label/help/error slots, focus ring, validation states |
| `wallet-states.png` | WalletStateCard: connected/connecting/disconnected/error |
| `payment-ladder.png` | PaymentLadder component states |
| `lifecycle.png` | TimelineNode lifecycle states, incl. `ResolvedSlash` scoping |
| `receipts.png` | ReceiptPanel — the sealed-document receipt treatment |
| `evidence-labels.png` | EvidenceLabel component |
| `banners-states.png` | Banner component across states (error/degraded/unavailable are static, no motion) |
| `mobile-nav.png` | MobileNavSheet on mobile viewport |
| `bond-split-motion.png` | The bond-split animation at `ResolvedSlash` (the territory's signature moment) |
| `motion-reduced.png` | Same transitions under `prefers-reduced-motion: reduce` |

## 4. Open questions / trade-offs to decide before Phase 2

1. **`--accent` is reserved and unused.** It's defined in `TOKENS/tokens.css`
   (a technical blue, `#1f5c8b`) but not consumed by any of the Tasks 7-23
   components — the stated direction is that links/focus/live-state use ink
   weight and motion, not a third color. **Confirm this holds through the
   Phase 2 production build.** If a real future need for a third chromatic
   role emerges in `frontend/`, it should use this token deliberately, not be
   reached for casually — but if it turns out nothing ever needs it, consider
   whether it should be removed from the contract instead of carried forward
   as permanent dead weight.
2. **The `ResolvedSlash` / `--consequential` scoping rule (`QA.md` QA-5).**
   Current rule: `--consequential` is used when a `ResolvedSlash` indicator
   is the *primary* signal in a dense context (e.g. `TransactionRow`'s table
   badge), but stays plain ink when it sits beside an already-colored
   `BondValueBlock` on the same view (`TimelineNode`), to avoid re-signaling
   the same fact twice. **Confirm this is the right call** — it's a judgment
   call about scarcity vs. redundancy, not a mechanically derived rule, and
   it was resolved by documentation rather than a code change, so it's worth
   a second look before it's load-bearing in production.
3. **The territory hasn't been built at the specific route contexts Phase 2
   targets yet** — most notably the dense `/app/actions/[id]` monitor (Part 1
   §22), which combines `TransactionRow`, `TimelineNode`, and the bond-split
   motion together for the first time outside the lab's isolated
   demonstrations. The lab shows each component in isolation; it does not
   prove the territory holds up when they're composed at that route's
   density. Worth a specific check early in Phase 2 Day 3 rather than
   assuming it transfers cleanly.
4. **Dark mode is secondary and only lab-demonstrated at the token/component
   level**, not built out as a full alternate lab experience — it's "the same
   drawing on dark stock," per `VISUAL_LANGUAGE.md`, but confirm that's
   sufficient scope for Phase 2, or whether a fuller dark-mode pass is
   expected.
5. **Chamfered corners are a deliberate, meaning-derived choice** (cut at the
   mark's own ~41.7°/62.68° angles), but they're also adjacent to a
   cyberpunk-HUD visual cliché on the anti-slop list. `VISUAL_LANGUAGE.md`
   pre-empts this as a borderline call and argues it resolves to "not the
   anti-slop item" because the angles are measured from this specific mark
   and used sparingly/structurally rather than on every control. Worth the
   project owner's own gut-check against the rendered lab, not just the
   written argument.

## Next step

Review `design-system/SCREENSHOTS/`, run the lab locally, and explicitly
approve (or request changes to) the visual direction before Phase 2 begins.
Once approved, Phase 2 will be re-planned in detail using the sequencing
already sketched in the task plan (`.superpowers/sdd/task-28-brief.md`,
"Phase 2: Production Build").
