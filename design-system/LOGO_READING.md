# Logo Reading

## Source

`design-inputs/bondsman-logo-final.png` (transparent), cross-checked against
`design-inputs/bondsman-logo-reference.png` (white background, same mark) and the
vector reconstruction in `frontend/components/brand/BondsmanLogo.tsx` (`MARK_PATH`,
viewBox `0 0 1024 1024`). All three sources match: the same rectilinear, chamfered,
five-subpath mark. Numbers below are computed directly from parsing the path's
`M/H/V/L/Z` commands into absolute coordinates (see derivation table), not eyeballed.

The mark is symmetric about the vertical centerline `x = 512` (viewBox center) to
within 1 unit, and its overall bounding box (`x: 263→760`, `y: 195→828`) is centered
in the 1024×1024 viewBox to within 0.5 units on both axes.

## Geometric primitives

Five closed subpaths, in path order:

| Element | Bounds (x, y) | Width × Height |
|---|---|---|
| Left pillar (arch) | x 263→492, y 195→677 | 229 × 482 |
| Right pillar (arch) | x 532→760, y 195→677 | 228 × 482 |
| Central block (collateral) | x 425→599, y 468→677 | 174 × 209 |
| Left base slab | x 263→484, y 710→828 | 221 × 118 |
| Right base slab | x 539→760, y 710→828 | 221 × 118 |

- **Overall mark width:** 497 units (760 − 263). Check: left-pillar footprint (229)
  + top gap (40) + right-pillar footprint (228) = 497 — consistent with the bbox.
- **Overall mark height:** 633 units (828 − 195).
- **Pillar stroke width** (the vertical "arm" thickness, i.e. what reads as line
  weight): the top cap is 92 units wide on the left (400→492) and 91 on the right
  (532→623); the leg is 96 wide on the left (359→263, measured at the bottom edge)
  and 95 on the right (760→665). So the effective stroke thickness is **~91–96
  units**, with a consistent ~1-unit left/right asymmetry (not a rendering error —
  present identically across both cap and leg measurements, so it is in the source
  path).
- **Ratio of pillar width to overall mark width:** ~92/497 ≈ **0.185** (about
  18.5%) using the cap measurement, ~95.5/497 ≈ 0.192 using the leg measurement.
- **Central block:** 174 × 209 units. This is *not* a perfect square — it is
  ~20% taller than wide (209/174 = 1.20). "Central square" in the preliminary
  read is a visual approximation; the precise shape is a portrait rectangle.
  It sits flush with the bottom of both pillar legs (its bottom edge, y=677,
  exactly matches the pillars' bottom edge) and is centered horizontally on the
  mark's axis: (425+599)/2 = 512.
- **Central-block-to-pillar-width ratio:** 174/92 ≈ **1.89** (width), i.e. the
  block reads roughly "two strokes wide."
- **Base slab height:** 118 units (828 − 710) — noticeably thicker than the
  pillar stroke (~91–96), about **1.25×** the pillar weight, giving the base a
  visually heavier footing than the pillars above it.
- **Base slab width** (full slab, before the corner is cut): 221 units on each
  side (263→484 and 539→760).
- **Gap between the two base slabs:** 55 units at the narrowest, uncut point
  (484→539); the diagonal cuts widen this gap further as it descends.
- **Vertical gap between the upper assembly (pillars + block) and the base
  slabs:** 33 units (base slabs start at y=710; pillars/block bottom at y=677).

## Stroke weight and terminal treatment

The mark is filled (solid, `fillRule="evenodd"`), not stroked — there is no
outline path. Read as an effective stroke weight, the pillar's vertical members
run **~91–96 units** thick against a 1024-unit viewBox (≈9% of the mark's own
497-unit width). Terminals are not rounded or squared; every non-axis-aligned
corner is chamfered (cut at a diagonal), and there are **zero curve commands**
(no `C`/`S`/`Q`/`T`/`A`) anywhere across all five subpaths — confirmed by parsing
every path token.

There are two distinct, internally-consistent chamfer angles, not one:

- **Primary (pillar) chamfer** — appears 4 times (2 per pillar, mirrored
  left/right): segments `(430,300)→(359,364)`, `(263,317)→(400,195)`,
  `(623,195)→(760,317)`, `(665,364)→(592,300)`. Angles from horizontal: 42.03°,
  41.69°, 41.69°, 41.24° — mean **≈41.7° from horizontal (≈48.3° from
  vertical)**. The brief's illustrative example (`359,364 → 263,317`) is not
  itself a literal path segment — those two points are separated by three
  orthogonal (V/H/V) segments forming the pillar's long leg, not a single
  diagonal — but the actual diagonals bracketing that leg (computed above) do
  converge tightly on ~41.7°, so the preliminary read's intent (this is "the"
  chamfer) holds up numerically.
- **Secondary (base-slab) chamfer** — appears 2 times (mirrored left/right):
  `(484,737)→(437,828)` and `(586,828)→(539,737)`, both exactly **62.68° from
  horizontal (27.32° from vertical)** — identical on both sides, and distinctly
  steeper than the pillar chamfer. This is a real, verified second angle the
  preliminary analysis did not distinguish; it should not be collapsed into a
  single "the chamfer angle" fact.

## Implied grid

No single small integer cleanly divides every coordinate in the path — this is
not a mark built on a rigid pixel grid, but on a small set of deliberately
reused measurements. Evidence:

- **174 units** recurs exactly, identically, across three independent
  elements: the central block's width (599−425) and both base slabs' width
  measured after their corner cut (437−263 and 760−586). This is the strongest
  candidate for an implied base module — roughly 1024/6 ≈ 170.7, i.e. close to
  a sixth of the viewBox, or 174/497 ≈ 35% of the overall mark width.
- **27 units** is the smallest exactly-recurring delta in the whole path (the
  base slabs' flat step before the chamfer begins, y 710→737, identical on both
  sides).
- **47 units** recurs identically as the horizontal run of both base-slab
  chamfers (mirrored), and **64 units** recurs identically as the vertical run
  of both pillars' inner chamfers — both fall in the 32–48-ish range one would
  expect for a module at this viewBox scale, but neither divides the larger
  measurements (174, 221, 313, 360) cleanly, so treat them as secondary/local
  reuse rather than "the" grid unit.
- Practical takeaway for later token work: **174 units** is the most
  defensible "implied module" (it is shared by unrelated elements, not just a
  mirrored twin of itself), with **27 units** as a plausible finer sub-module.
  Do not treat either as an exact, provable design grid — the mark was very
  likely hand-adjusted, not algorithmically gridded (see the 91-vs-92 and
  95-vs-96 left/right asymmetries above).

## Implied colour role

The mark is drawn solid black on transparent — ink/mark colour, not the copper
`--accent` currently hardcoded in `BondsmanLogo.tsx` (that value is leftover from
the superseded `brand.md` and is not to be read as canonical).

## Implied posture

Fully rectilinear, zero curves, chamfered corners: mechanical, engineered,
architectural — not organic, not playful. The two chamfer angles (~42° on the
pillars, ~63° on the base) read as a single family of "cut corners" rather than
uniform bevelling, which keeps the mark from feeling like a soft, uniformly
rounded logotype: the cuts are sharper and more varied than a single fixed
bevel would produce, reinforcing a fabricated/machined impression over a
molded one.

## The two splits

Top: a 40-unit notch gap between the two pillars at their narrowest
(492→532), widening below as the chamfers open the arch. Bottom: a 55-unit
gap between the two base slabs at their narrowest (484→539), also widening as
its chamfers cut inward and downward. Both gaps sit on the same vertical
centerline (x≈512) as the mark's central block, and both are structural, not
decorative — they are literally where the ink is absent, not a rendered line.

This is the geometric fact to carry forward as the anchor for the product's
own "bond splits at resolution" moment (Part1 §11, "the memorable moment"): the
mark itself is built from two components (pillars, base slabs) that are each
already drawn as *two separate pieces divided by a gap*, at both the top and
the bottom of the mark. The logo does not need to be modified or animated to
"add" a split — the split is already the mark's defining structural feature,
present twice, at rest. Task 4's visual language and Task 23's iconography
should treat "resolution" as this same gap either closing (pieces coming
together) or the existing gap being the resting/settled state that a pending
bond animates away from.
