# Logo Usage Rules

Source of truth for placement, sizing, and misuse of the Bondsman mark. See
`LOGO_READING.md` for how these numbers were derived and
`frontend/components/brand/BondsmanLogo.tsx` for the canonical SVG
(`BondsmanMark`, `MARK_PATH`, viewBox `0 0 1024 1024`). This file states rules
only — it does not re-derive geometry.

## Minimum clear space

**Clear space on all four sides = 1× the mark's own pillar width.**

The pillar (the mark's vertical "stroke") measures 92 units at the cap and up
to 96 at the leg, against the mark's own bounding-box width of 497 units — a
ratio of **~0.185** (92/497). Rather than hardcode a viewBox unit count, state
the rule as that ratio so it holds at any render size:

```
clearSpace = renderedMarkWidth × 0.185
```

At the default lab render size (mark bounding box ≈ its `size` prop, since the
SVG is square and the mark is inset in the viewBox), a 200px mark needs ~37px
of clear space on every side before any other UI element (text, a container
edge, another logo) may begin. Nothing — no text baseline, no card border, no
adjacent icon — may enter that margin.

Why a multiple of the pillar width and not an arbitrary padding value: the
pillar is the mark's own unit of visual weight (LOGO_READING.md calls the
174-unit central-block width "two strokes wide" for the same reason). Using
the mark's own stroke as the clear-space unit keeps the rule proportional at
every size instead of degrading at very small or very large renders.

## Minimum size

**Do not render the mark below 16px.**

The mark has zero curve commands — every corner is a cut chamfer, not a
round. The finer of the two chamfer families (the base-slab chamfer) has a
47-unit horizontal run against the 1024-unit viewBox. At 16px that run is
`47 / 1024 × 16 ≈ 0.73px` — under a single device pixel at 1x, meaning the
chamfer aliases into what looks like a rounded or squared-off corner instead
of a visible diagonal cut. 16px is the floor at which the coarser pillar
chamfer (64-unit run, ≈1px at 16px) still just barely survives as a
distinguishable cut; below it, the mark reads as a blob, not the engineered
mechanical mark described in LOGO_READING.md's "Implied posture." Where a
smaller footprint is unavoidable (e.g. a browser tab favicon), that is
`design-system/lab/app/icon.svg` in this repo — a favicon is an exception the
platform imposes, not a case that overrides this floor for any other UI use.

## Wrong use

Three concrete misuses, all shown crossed out on the usage lab page
(`/logo-usage`):

1. **Non-uniform stretch.** Setting independent width/height (e.g. `width:
   140px; height: 80px` on a mark whose natural box is square) distorts the
   ~41.7°/62.68° chamfer angles that LOGO_READING.md documents as a
   deliberate, internally-consistent pair — a stretched mark no longer has
   "the" chamfer angle at all, it has two arbitrary ones per axis. Always
   scale uniformly (one `size` value driving both width and height, as
   `BondsmanMark`'s API already forces).

2. **Recoloring outside the token palette.** The mark ships as
   `fill="currentColor"` specifically so its color is inherited from this
   system's own tokens (`tokens.css`: `--ink` `#15181c` for the default mark
   color; `--accent` `#1f5c8b` only where a lockup deliberately calls for
   tinted brand color). Setting an arbitrary hex not in that palette (a
   stray brand-adjacent teal, a gradient, a drop shadow) breaks the "ink or
   nothing" rule LOGO_READING.md sets out under "Implied colour role": the
   source mark is solid black on transparent, i.e. a mark color, not a
   decorative one. Note `frontend/components/brand/BondsmanLogo.tsx`'s
   hardcoded `--accent` fallback and `text-bone` class are leftovers from
   the superseded `brand.md` (per that file's own comment) and are not
   canonical — this design system's `tokens.css` is the palette of record.

3. **Insufficient-contrast background.** Placing the mark (rendered in
   `--ink`, `#15181c`) on a background that doesn't clear WCAG's 4.5:1 body
   text minimum. Checked against `TOKENS/contrast.mjs`'s `contrastRatio()`:
   `contrastRatio('#15181c', '#5b6470')` (ink mark on `--muted` background)
   returns **2.97:1** — well under the 4.5:1 floor the same function is used
   to gate elsewhere in this system (compare to ink-on-surface, `15.59:1`,
   which passes comfortably). Never place the mark on a background this
   close to it in luminance; use `--surface`/`--surface-raised` or invert to
   `--bone` on a dark ground instead.
</content>
