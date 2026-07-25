# Iconography

## Shared construction rule

Every icon in this system is built on the same geometric family as the mark
itself, derived directly from `LOGO_READING.md`'s measured numbers, not from
any generic icon-library convention:

> All icons are built on a 24-unit square grid (a single `viewBox="0 0 24
> 24"`, scaled to 16/24/32px by `width`/`height` only — never redrawn per
> size). Icons are **filled, not stroked** (`fill="currentColor"`, the exact
> construction `LOGO_READING.md` records for the mark: "the mark is filled
> \[...], not stroked — there is no outline path"). Every path is built from
> `M`/`L`/`Z` commands only — **zero curve commands** (`C`/`S`/`Q`/`T`/`A`)
> anywhere in `design-system/lab/components/icons/`, matching the mark's own
> "zero curve commands \[...] confirmed by parsing every path token." Where a
> shape needs a corner cut, it uses one of the mark's own two measured
> chamfer angles — never an arbitrary bevel and never a rounded corner:
> - **Primary cut, ~41.7° from horizontal** — the pillar chamfer
>   (`LOGO_READING.md`, "Primary (pillar) chamfer \[...] ≈41.7° from
>   horizontal"). This is the default cut for structural/body corners.
> - **Base cut, 62.68° from horizontal** — the base-slab chamfer
>   (`LOGO_READING.md`, "Secondary (base-slab) chamfer \[...] 62.68° from
>   horizontal"). Reserved for an icon's own "footing" element — the part of
>   the icon that reads as planted/resting rather than structural — the same
>   way the mark reserves the steeper angle for its base slabs and the
>   shallower angle for its pillars. `wallet.tsx`, `clock.tsx`, and
>   `challenge.tsx` each mix both angles on a single shape for exactly this
>   reason (top/structural corners primary, bottom/footing corners base).
>
> A corner that is already 90° (a pure rectangle — `hamburger.tsx`'s bars,
> `info.tsx`'s dot/bar glyph, `external-link.tsx`'s arrowhead bracket) is
> **not** force-chamfered. The rule only cuts a corner where a cut is
> genuinely needed to resolve the shape; a decorative bevel on every single
> rectangle would be exactly the kind of arbitrary treatment the mark's two
> *specific*, *measured* angles are meant to rule out.
>
> Color is never hardcoded. Every icon renders in `currentColor` and inherits
> its color from the surrounding text/ink context (`text-ink`, `text-muted`,
> `text-destructive`, `text-warning`, `text-positive`, etc.) exactly the way
> every other component in this system does. **No icon uses `--accent`** —
> there is no such token in this system (`PRINCIPLES.md` Principle 3's
> slash-only accent; `tokens.css`'s `--accent` is explicitly reserved/unused
> across components 7–23), and icons are no exception.

`design-system/lab/components/icons/geometry.ts` encodes the two angles as
exact ratios (`PRIMARY_RATIO = tan(41.7°)`, `BASE_RATIO = tan(62.68°)`) and a
small set of chamfer-path helpers, so the rule above is enforced in code
rather than re-derived by eye per icon.

## No external icon library

**No icon in this system comes from an external icon library** — no Lucide,
no Heroicons, no Feather, no Material Icons, no Font Awesome, nothing
imported from an npm icon package. This is a deliberate anti-slop rule: mixed
icon sources (a Lucide `X` next to a Heroicons `ChevronDown`) is exactly the
kind of visible inconsistency — different stroke weights, different corner
treatments, different optical sizing — that breaks the "one drawing sheet"
read `VISUAL_LANGUAGE.md`'s Structural Ledger territory depends on. Every
icon here is hand-built as inline SVG path data specific to this system,
following the construction rule above, so the full set reads as one
consistent family drawn by the same hand as the mark — not a grab-bag of
whatever a generic library happened to ship.

## Required icon set

| Icon | File | Notes |
|---|---|---|
| Copy | `copy.tsx` | Two overlapping chamfered rings ("two sheets"). |
| External link | `external-link.tsx` | Chamfered box + diagonal shaft + rectilinear arrowhead. |
| Checkmark | `checkmark.tsx` | Two overlapping straight bars forming a "V". |
| Warning | `warning.tsx` | Solid chamfered triangle, exclamation cut through (evenodd). |
| Error | `error.tsx` | Solid chamfered badge, X cut through (evenodd). |
| Info | `info.tsx` | Chamfered ring + dot/bar "i" glyph. |
| Chevron (expand/collapse) | `chevron.tsx` | Two straight bars forming a caret; `direction` prop rotates 180°. |
| Close | `close.tsx` | Two diagonal bars forming an X. |
| Hamburger | `hamburger.tsx` | Three plain rectangular bars. |
| Wallet | `wallet.tsx` | Ring mixing both chamfer angles (top primary, bottom base) + clasp. |
| Clock / countdown | `clock.tsx` | Chamfered square face (both angles) + rectilinear hour/minute hands. No circular dial — this system has zero curves. |
| Challenge / watchdog | `challenge.tsx` | Solid shield mixing both chamfer angles, eye slit cut through (evenodd). |

Every icon is its own named export (`CopyIcon`, `ExternalLinkIcon`,
`CheckmarkIcon`, `WarningIcon`, `ErrorIcon`, `InfoIcon`, `ChevronIcon`,
`CloseIcon`, `HamburgerIcon`, `WalletIcon`, `ClockIcon`, `ChallengeIcon`),
re-exported from `design-system/lab/components/icons/index.ts`.

## Component contract

Every icon shares the same prop shape (`icon-props.ts`):

- `size?: number` — sets both `width` and `height` off the single 24-unit
  `viewBox`; default `24`. The same artwork renders at 16/24/32px without
  redrawing or distorting, because scaling a `viewBox` is exactly what SVG
  is for.
- `title?: string` — when present, the icon renders `role="img"` with
  `aria-label={title}` (a meaningful icon, e.g. a standalone icon-only
  button). When absent, the icon renders `aria-hidden="true"` (a decorative
  icon next to its own visible text label) — the same visible-label-first
  discipline `RESPONSIVE.md`/`ACCESSIBILITY` work elsewhere in this system
  already assumes.
- Everything else (`className`, `onClick`, etc.) passes through to the
  underlying `<svg>`.

No icon reads a "kind" prop that swaps in a different accent color — color
is entirely a function of the CSS `color` the icon is rendered inside,
never a prop.

## Reference sheet

`design-system/lab/app/icons/page.tsx` renders all twelve icons at 16px,
24px, and 32px, each labelled with its name, linked from the lab index.
