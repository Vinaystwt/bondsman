# Design-sync notes — Bondsman Design System

## Repo shape

`design-system/lab` is a Next.js **app**, not a publishable library package —
no `dist/`, no `main`/`module`/`exports` in `package.json`. Synced in
**synth-entry mode**: the converter bundles directly from `.tsx` source under
`design-system/lab/components/`, deriving the component list and prop shapes
via ts-morph source scan rather than a shipped `.d.ts`. Prop-type contracts
are therefore weaker than a real build would give (best-effort inference, not
authoritative shipped types).

## React 19 / no UMD build

React 19 dropped the UMD build (`react/umd/react.development.js`), which the
converter's vendoring step requires. Worked around with a scratch
`node_modules` at `.ds-react-scratch/` containing `react@18`/`react-dom@18`
(UMD build only) plus a symlink `node_modules/bondsman-design-lab` → the real
`design-system/lab` directory, so `--node-modules` resolves both. This is
safe because the converter globally shims all `react`/`react-dom` imports to
`window.React`/`window.ReactDOM` from the vendored build — the actual React
19 source never gets bundled or executed against React 18's runtime; only
the vendored UMD copy renders the previews. Re-sync: re-verify
`.ds-react-scratch/node_modules/react/umd/` still exists (occasionally wiped
by an unrelated `npm install` in that scratch dir) and the symlink still
resolves before rebuilding.

## Compiled CSS entry

`cfg.cssEntry` points at `design-system/lab/.next/static/css/<hash>.css` (the
real Next.js **production** build output — `npm run build` inside
`design-system/lab`), not the raw `app/globals.css` source. The raw source
only has `@tailwind` at-rules, not compiled utility classes — pointing
`cssEntry` at it would ship an unstyled bundle (checked and caught before
upload). **Re-sync risk:** this filename is a Next.js content hash and
changes on every production build. Before every re-sync: run
`npm run build` inside `design-system/lab`, find the new hash under
`.next/static/css/*.css`, and update `cfg.cssEntry` in
`.design-sync/config.json` to match.

## Known render warns (accepted, not new issues)

- `[RENDER_BLANK]` on `Skeleton` (unauthored, floor card). Its real fill is a
  deliberate `bg-boundary/20` translucent tint (Principle 2: a loading
  placeholder must not look "real/settled" like a solid `bg-surface-raised`
  fill would) — legible in the actual app against page chrome (see
  `SCREENSHOTS/banners-states.png` from Phase 1, where it renders correctly),
  but too faint against a bare capture background to clear the
  blank-detection heuristic even with a contrasting backdrop (tried both a
  plain and a mid-grey wrapper; still flagged). Not a component defect —
  accepted as the one exception to a fully clean render-check pass. Re-syncs
  should expect this same warning on this same component; it does not
  indicate new breakage.
- `[RENDER_THIN]` on `ChallengeIcon`, `CheckmarkIcon`, `ChevronIcon`,
  `ClockIcon`, `CloseIcon`, `CopyIcon`, `ErrorIcon`, `ExternalLinkIcon`,
  `HamburgerIcon`, `InfoIcon`, `Skeleton`, `WalletIcon`, `WarningIcon` — "no
  text, paints nothing." These are pure-SVG/graphic components with no text
  content by design; the render check's "thin" heuristic is text-biased and
  false-positives on legitimate icon-only previews. Screenshots
  (`_screenshots/`) confirmed all render correctly (visible glyphs at
  16/24/32px). Triaged as benign — re-syncs should treat these same warns on
  these same components as expected, not new.
- `[FONT_MISSING]` — "IBM Plex Sans", "IBM Plex Mono" referenced by tokens
  but never actually shipped as `@font-face` anywhere in the repo (Phase 1's
  own token doc comments already note the lab has only ever rendered on the
  system-font fallback stack — this is not a regression introduced by the
  sync). Accepted substitute: previews/designs render in the fallback stack
  (`-apple-system, 'Segoe UI', system-ui, sans-serif` / `ui-monospace,
  'SFMono-Regular', Consolas, monospace`) until real Plex webfont files are
  sourced and wired via `cfg.extraFonts`.

## Preview scope

First sync used **floor cards everywhere** (project owner's explicit
choice, given time constraints) — 14 of 29 components got a minimal
authored preview (just enough real content to clear the render check
after several came back genuinely blank on auto-generated default props);
the remaining components ship the honest "preview not yet authored" floor
card. Both are fully importable/functional regardless. Richer,
multi-export authored previews for the core components can be added
incrementally on any future re-sync — authored files and grades carry
forward.

## Re-sync risks

- The CSS hash re-pointing above is the biggest thing that goes silently
  stale — a re-sync run without updating it first will either fail
  `[CSS_IMPORT_MISSING]` (old hash file deleted by a newer build) or, worse,
  silently ship stale styling if an old hash happens to still exist on disk.
- The `.ds-react-scratch` scratch install and symlink are gitignored/local —
  recreate on a fresh clone (react@18/react-dom@18 install + symlink), per
  the steps above.
- No design guidelines (`guidelinesGlob`) or docs (`docsDir`) were wired —
  `.prompt.md` files are synthesized from `.d.ts` + JSDoc only, not real
  authored component docs.
