## Bondsman Design System — build conventions

**No provider wrapper needed.** Every component reads styling from CSS
custom properties and Tailwind utility classes only — no React context,
theme provider, or root wrapper to set up. Just render components directly.

**Styling idiom: Tailwind utility classes bound to CSS variable tokens.**
Every color class resolves to a `var(--*)` token — never hardcode a hex
value, always use the class. Real classes shipped in this bundle:

| Role | Classes | Meaning |
|---|---|---|
| Ground | `bg-surface`, `bg-surface-raised` | Page background vs. a "filled/real" raised panel |
| Text | `text-ink`, `text-muted` | Primary text vs. secondary/caption text |
| Type scale | `text-display`, `text-headline`, `text-subhead`, `text-body`, `text-data`, `text-mono` | Font-size only — pair with `font-sans` (prose/UI) or `font-mono` (numbers, hashes, addresses) |
| Reserved accents | `bg-consequential` / `text-consequential` | **Slash-resolution moment ONLY** — never use for generic errors or warnings |
| | `bg-destructive` / `text-destructive` / `border-destructive` | Destructive UI controls and validation errors — separate from consequential by hard rule |
| | `bg-positive` / `text-positive` | Quiet, non-celebratory confirm state |
| | `bg-warning` / `text-warning` | Non-fatal caution only |
| Structure | `border-boundary` | Hairline dividers/rules — never a boxed "card" border |
| Reserved, unused | `bg-accent` / `text-accent` (`--accent`, a technical blue) exists as a token but is **not used anywhere in this component set** — links, focus, and "live" state are expressed with ink weight, rules, and motion, not a third color. Do not reach for it. |

**Zero border-radius, everywhere.** All corners are square — the brand mark
has zero curves. Never add `rounded-*`.

**Spacing scale**: `--space-1` (4px) through `--space-9` (96px), exposed as
Tailwind's numeric spacing scale (`p-5` = `--space-5` = 24px, etc.) — use
these, not arbitrary pixel values.

**Fonts**: tokens declare `IBM Plex Sans` (prose/UI) and `IBM Plex Mono`
(numbers, hashes, addresses) but this bundle does not ship the actual font
files — every render falls back to the declared system-font stack
(`-apple-system, 'Segoe UI', system-ui, sans-serif` /
`ui-monospace, 'SFMono-Regular', Consolas, monospace`). Designs will render
correctly in the fallback stack; the intended brand faces are not yet
self-hosted.

**Where the truth lives**: `styles.css` at the bundle root `@import`s the
full token set and compiled component CSS — read it before styling anything
novel. Per-component `.prompt.md` files (synthesized from source + JSDoc)
are the usage reference for each component's actual prop API.

**Example — a bonded-action confirmation button:**

```tsx
<Button variant="primary">Fund bond</Button>
<Button variant="destructive">Revoke access</Button>
```

Never invent a new color for a state this table already covers — the
palette is deliberately rationed to exactly two chromatic roles
(consequential, destructive) plus quiet status colors; everything else is
ink weight, rules, and motion.
