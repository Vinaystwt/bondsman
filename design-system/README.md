# Bondsman Design System

Phase 1 (design exploration + system definition) is complete. This directory
is the full deliverable: strategy, selected visual territory, tokens,
component library, and a runnable showcase lab — everything Phase 2 will
consume to build the production `frontend/`.

**Run the lab:** `npm run design-lab` from the repo root (or `npm install &&
npm run dev` inside `design-system/lab/`). Serves at http://localhost:4400.

**Start here if you're reviewing:** `REVIEW_REQUEST.md` — the summary of what
was decided, why, and what's still open before Phase 2 begins.

## Documents

- `README.md` — this file, the index.
- `REVIEW_REQUEST.md` — Phase 1 review summary: territory decision, how to
  run the lab, the screenshot set, and open questions for the project owner.
- `LOGO_READING.md` — measured geometry/construction reading of the approved
  logo mark; the factual basis every later document cites.
- `PRINCIPLES.md` — the six binding design-system principles derived from the
  logo reading and the product spec.
- `VISUAL_LANGUAGE.md` — the three territories explored, scored, and the
  selected territory ("Structural Ledger") with full justification.
- `COPY_TONE.md` — voice and copy rules (tone, terminology, error/empty-state
  phrasing).
- `RESPONSIVE.md` — breakpoint and layout rules across mobile/tablet/desktop.
- `FORMS.md` — form system: field states, validation, layout patterns.
- `ICONOGRAPHY.md` — icon construction rules derived from the mark's own
  geometry (no stock icon sets).
- `MOTION_SPEC.md` — motion spec (timings, easings, the bond-split animation)
  for hand-off to Claude Design, plus the reduced-motion equivalents map.
- `A11Y.md` — accessibility rules (focus rings, contrast, reduced motion,
  labeling).
- `QA.md` — pass/fail QA checklist audited against the lab components and
  pages, including the `ResolvedSlash` `--consequential` scoping rule.
- `LOGO_USAGE.md` — logo usage rules (clearspace, minimum size, favicon,
  misuse).
- `TOKENS/` — CSS variable source of truth (`tokens.css`), the Tailwind
  mapping (`tailwind-tokens.ts`), and the contrast test (`contrast.mjs` +
  `test/`); consumed by both the lab and, after approval, `frontend/`.
- `SCREENSHOTS/` — the 18 required review screenshots (see
  `REVIEW_REQUEST.md` for the full list with descriptions).
- `lab/` — the runnable Next.js showcase (18 routes covering every component
  and system rule). Not deployed; do not link it from `frontend/`.
