# Bondsman Design System Rebuild — Spec

_Status: approved for implementation planning_
_Date: 2026-07-21_

## Why

The existing frontend (`frontend/`) has ~15 commits of prior work (hero animation,
Proof Console, Assurance Studio, wallet/payment flow, brand mark replacement) built
against an earlier brand concept (`brand.md`, 2026-06-29: warm document-grade,
Fraunces/Hanken Grotesk/Plex Mono, copper/sage/void). The user has a newer set of
governing documents that supersede that work:

- `Bondsman_Part1_Workflow_Spec.md` — full workflow/IA/journey spec (8 routes, wallet
  authority separation, payment ladder, action lifecycle, evidence classification).
- `Bondsman_Part2_Claude_Code_Design_System_Prompt.md` — a standalone, highly
  prescriptive prompt for building a design system laboratory before any production
  page work, on a dedicated `design-system` branch.

Hackathon: Casper Agentic Buildathon 2026 Final Round. Confirmed live from the
event page (dorahacks.io): deadline **2026-07-26 23:59 UTC** (5 days from today),
tags Casper / Agentic / DeFi / Real-World Assets / x402. Judging criteria explicitly
include **"User Experience & Design"** as its own line, alongside Technical Execution,
Working Smart Contracts, and Real-World Applicability. Design system investment is
directly scored, not incidental.

User decision (confirmed): run the **full Part2 process as written** — no scope
trim — despite the 5-day clock, and pre-sequence the production build order now so
there is no re-planning pause after visual review is approved.

## What supersedes what

- `brand.md` (root) and `frontend/tailwind.config.ts` / `frontend/app/globals.css`
  current values are **not authoritative**. Per Part2 explicitly: do not import prior
  tokens, colors, spacing, typography, or component patterns. They may be read only
  to know what is being replaced.
- The approved logo is `design-inputs/bondsman-logo-final.png` (transparent, current)
  with `design-inputs/bondsman-logo-reference.png` as a white-background reference —
  same mark, not a different candidate. Do not modify these files. The current
  `frontend/components/brand/BondsmanLogo.tsx` SVG reconstruction (path data
  `M400 195H492V300H430L359 364V677H263V317L400 195ZM...`) is a reasonable vector
  source to reuse for precision, but its hardcoded `--accent` copper fill is a
  leftover from the old brand and is not to be treated as the logo's canonical color.

## Preliminary logo reading (full write-up happens in `LOGO_READING.md` during execution)

Fully rectilinear construction, zero curves, chamfered (angled-cut) corners instead of
rounded ones. Two arch-shaped pillars with a **gap notch at the top** between them: a
solid central square (collateral block) sits below; two base slabs at the bottom are
**separated by a gap**. Solid ink fill, no gradient, no stroke — the mark is drawn
filled, meaning small sizes should stay filled, not stroked. The two built-in splits
(top notch, bottom gap) are structurally coincident with the product's own memorable
moment — "the bond splits at resolution" — which is a legitimate, non-arbitrary
argument to carry into the visual language rather than a stretch reading.

## Scope: full Part2 deliverable list

All 31 numbered deliverables in Part2 apply, unmodified: strategy/principles,
visual language (3 territories explored, 1 selected), typography/color/spacing/grid
systems, all component primitives and specialized state families (wallet, payment
ladder, action lifecycle, receipts, evidence labels), motion spec, a11y, copy tone,
QA rules, the runnable `lab/`, and the full screenshot set to `SCREENSHOTS/`. Directory
layout, branch name (`design-system`), and stop point (request visual review, no
production work) are exactly as specified in Part2 — no deviation.

## Process boundary (per user decision)

Unlike a strict reading of Part2's stop point, the implementation plan will also
pre-sequence **what production work happens after approval** — which of the 8 routes
get built in what order against the 5-day clock — so approval of the visual direction
does not require a second planning pass. Actual production coding does not start
until the user has reviewed the lab and screenshots and explicitly approves.

## Out of scope / explicit non-goals

- No production route changes before visual-review approval.
- No public deployment of `/design-system/lab/`.
- No modification or deletion of the approved logo files.
- Do not mix incompatible visual grammar (Part2's anti-slop rules apply verbatim,
  including the generic-AI/crypto-visual ban list).
