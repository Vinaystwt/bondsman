# Bondsman Design System Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Bondsman design system laboratory (tokens, principles, all component/state families, motion spec, screenshots) on a `design-system` branch, stop for visual review, then execute a pre-sequenced production build of the 8 Part1 routes against the approved visual language before the 2026-07-26 23:59 UTC hackathon deadline.

**Architecture:** Phase 1 is a standalone, hand-scaffolded Next.js 15 app at `design-system/lab/` (its own `package.json`, not part of the deployed `frontend/` build) that renders every design-system deliverable as a browsable route tree. Design tokens live once, as CSS custom properties in `design-system/TOKENS/tokens.css`, consumed by both the lab (via import) and, after approval, by `frontend/app/globals.css` (via a generated Tailwind mapping). Phase 2 reuses the existing `frontend/` Next.js app and wires its Tailwind config to the same token source, replacing `brand.md`/`tailwind.config.ts` values in place, route by route, following Part1's route map and stage specs exactly.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3.4, `node --test` for unit tests (matches existing `frontend/package.json` convention — no new test runner introduced), Playwright (already in `frontend/devDependencies`) for the visual-regression/screenshot capture task, `framer-motion` for the bond-split motion prototype (already a dependency of `frontend/`, added fresh to the standalone lab).

## Global Constraints

- Branch: all Phase 1 work happens on `design-system`, created from current `main` (commit `8285516`).
- Hard timebox: Phase 1 (every task in this document's Phase 1 section, through the review-request writeup) must be complete by **end of day 2026-07-22**. If a task is running over, cut its scope to the acceptance-criteria minimum rather than let it slip a day — flag the cut in the task's commit message.
- Hackathon deadline: **2026-07-26 23:59 UTC**. Final-round judging criteria (confirmed live from the event page) include Technical Execution, Innovation, Use of AI/Agentic Systems, Real-World Applicability (DeFi/RWA), **User Experience & Design**, Working Smart Contracts, Long-Term Launch Plans, Long-Term Impact.
- Do not modify or delete `design-inputs/bondsman-logo-final.png` or `design-inputs/bondsman-logo-reference.png`.
- Do not treat `brand.md` (root) or current `frontend/tailwind.config.ts` / `frontend/app/globals.css` values as authoritative. They may be read for contrast, not copied.
- Do not touch any file under `frontend/app/` (the 8 production routes: `/`, `/app`, `/app/new`, `/app/actions/[id]`, `/proof/27`, `/verify`, `/build`, `/status`) during Phase 1.
- `design-system/lab/` must never be reachable from the public site. It is a separate, undeployed Next.js app — there is no shared build step with `frontend/`, so this is true by construction, not by runtime flag.
- Mantra, verbatim, repeated on every screen where AI/policy/verifier/watchdog/contract roles are visible: **"AI explains. Policy prices. Verifier checks. Watchdog challenges. Contract settles."** The word "decides" is never used for any role except the contract "settles" and the verifier "checks."
- Wallet constraint: Ed25519-only for P0. Every wallet-state deliverable must reflect this, including the blocking secp256k1 card.
- Anti-slop list (Part2, verbatim categories — any use requires a written justification in `VISUAL_LANGUAGE.md`, absence of justification is a review-blocking defect): generic purple/blue gradients, excessive gradients, glassmorphism as default, excessive blur, random glow, neon crypto styling, generic cyberpunk, huge rounded cards, card grids for every section, generic dashboard templates, generic AI chatbot visuals, robot heads, brains, coins, chain links, generic shield motifs, excessive pills, gradient text, floating decorative blobs, random abstract 3D objects, fake data visualisation, mixed-source icons, gratuitous motion, trendy-without-meaning design, typography chosen only because it's common on AI-generated sites.
- Route map (Part1 §6, for Phase 2 sequencing): `/` (Product), `/app` (App), `/app/new` (New action, 9 stages: template · scenario · analysis · policy · parties · wallet · payment · authorise · submit), `/app/actions/[id]` (Action monitor), `/proof/27` (Proof), `/verify` (Verify), `/build` (Build), `/status` (Status).

---

# Phase 1: Design System Lab

## Task 1: Branch, top-level directory, and lab scaffold

**Files:**
- Create: `design-system/README.md`
- Create: `design-system/lab/package.json`
- Create: `design-system/lab/next.config.mjs`
- Create: `design-system/lab/tsconfig.json`
- Create: `design-system/lab/postcss.config.mjs`
- Create: `design-system/lab/tailwind.config.ts`
- Create: `design-system/lab/app/layout.tsx`
- Create: `design-system/lab/app/page.tsx`
- Create: `design-system/lab/app/globals.css`
- Create: `design-system/TOKENS/tokens.css` (empty placeholder structure only — populated in Task 6)
- Modify: `/Users/vinaysharma/bondsman/package.json` (add convenience script)

**Interfaces:**
- Produces: the `npm run design-lab` root script, the `design-system/lab/` runnable app, and the route-tree convention every later task follows (`app/<deliverable>/page.tsx`, each page a default-exported React Server Component that imports client islands only where interactivity is required).

- [ ] **Step 1: Create the branch**

```bash
git checkout -b design-system
```

- [ ] **Step 2: Scaffold the lab's package.json**

```json
{
  "name": "bondsman-design-lab",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev -p 4400",
    "build": "next build",
    "test": "node --test test/*.test.mjs"
  },
  "dependencies": {
    "next": "^15.5.20",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "framer-motion": "^11.15.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 3: Add the remaining config files**

`design-system/lab/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

`design-system/lab/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`design-system/lab/postcss.config.mjs`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`design-system/lab/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Create the root layout, globals, and index page**

`design-system/lab/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '../../TOKENS/tokens.css';
```

`design-system/lab/app/layout.tsx`:
```tsx
import './globals.css';

export const metadata = {
  title: 'Bondsman Design Lab',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`design-system/lab/app/page.tsx`:
```tsx
const SECTIONS = [
  { href: '/typography', label: 'Typography' },
  { href: '/color', label: 'Color' },
  { href: '/spacing', label: 'Spacing' },
  { href: '/grid', label: 'Grid & responsive' },
  { href: '/buttons', label: 'Buttons & links' },
  { href: '/forms', label: 'Form controls' },
  { href: '/data-display', label: 'Data display' },
  { href: '/overlays', label: 'Tabs, accordion, drawers, dialogs' },
  { href: '/wallet-states', label: 'Wallet states' },
  { href: '/payment-states', label: 'Payment ladder' },
  { href: '/lifecycle', label: 'Action lifecycle' },
  { href: '/receipts', label: 'Receipt states' },
  { href: '/evidence-labels', label: 'Evidence labels' },
  { href: '/banners-states', label: 'Banners, empty, loading, error, degraded' },
  { href: '/mobile-nav', label: 'Mobile navigation' },
  { href: '/motion', label: 'Motion prototype' },
  { href: '/logo-usage', label: 'Logo usage' },
];

export default function LabIndex() {
  return (
    <main>
      <h1>Bondsman Design Lab</h1>
      <p>Internal component showcase. Not part of the production site.</p>
      <ul>
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <a href={s.href}>{s.label}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`design-system/TOKENS/tokens.css` (structural placeholder, real values land in Task 6):
```css
/* Populated in Task 6 once VISUAL_LANGUAGE.md selects a territory. */
:root {
}
```

- [ ] **Step 5: Wire the root convenience script**

Edit `/Users/vinaysharma/bondsman/package.json`, add to `"scripts"`:
```json
"design-lab": "npm --prefix design-system/lab install && npm --prefix design-system/lab run dev"
```

- [ ] **Step 6: Install and verify it runs**

```bash
cd design-system/lab && npm install && npm run dev &
sleep 3 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4400
```
Expected: `200`. Kill the dev server after verifying.

- [ ] **Step 7: Write README.md**

`design-system/README.md`:
```md
# Bondsman Design System

Run the lab: `npm run design-lab` from the repo root (or `npm install && npm run dev` inside `design-system/lab/`). Serves at http://localhost:4400.

- `LOGO_READING.md` — reading of the approved logo mark.
- `PRINCIPLES.md` — design system strategy and principles.
- `VISUAL_LANGUAGE.md` — selected visual territory and reasoning.
- `TOKENS/` — CSS variable source of truth, consumed by both the lab and (after approval) `frontend/`.
- `MOTION_SPEC.md` — motion spec for hand-off to Claude Design.
- `A11Y.md`, `COPY_TONE.md`, `QA.md` — accessibility, voice, and QA rules.
- `SCREENSHOTS/` — required review screenshots.
- `lab/` — the runnable showcase (this is not deployed; do not link it from `frontend/`).
```

- [ ] **Step 8: Commit**

```bash
git add design-system package.json
git commit -m "Scaffold design-system lab and directory layout"
```

---

## Task 2: LOGO_READING.md

**Files:**
- Create: `design-system/LOGO_READING.md`

**Interfaces:**
- Produces: the geometric facts (grid unit, chamfer angle, pillar/gap ratios) that Task 4 (visual language) and Task 23 (iconography) both cite by name — later tasks reference "the logo's chamfer angle" and "the top/bottom split motif" defined here.

- [ ] **Step 1: Measure the mark**

Read `design-inputs/bondsman-logo-final.png` and `frontend/components/brand/BondsmanLogo.tsx` (path data `M400 195H492V300H430L359 364V677H263V317L400 195ZM532 195H623L760 317V677H665V364L592 300H532V195ZM425 468H599V677H425V468ZM263 710H484V737L437 828H263V710ZM539 710H760V828H586L539 737V710Z`, viewBox `0 0 1024 1024`). Derive and record exact numbers from the path coordinates: pillar width, gap width between pillars at top, central square side length, base-slab height and the gap between them, and the chamfer angle (compute from the diagonal segment endpoints, e.g. `359,364` to `263,317`).

- [ ] **Step 2: Write the document**

`design-system/LOGO_READING.md` must contain these sections, each filled with real derived numbers (not adjectives without numbers):

```md
# Logo Reading

## Source
`design-inputs/bondsman-logo-final.png` (transparent), cross-checked against
`design-inputs/bondsman-logo-reference.png` (white background, same mark) and the
vector reconstruction in `frontend/components/brand/BondsmanLogo.tsx`.

## Geometric primitives
[fill in: pillar width in path units, ratio of pillar width to overall mark width,
central square side length and its ratio to pillar width, base slab height]

## Stroke weight and terminal treatment
[fill in: the mark is filled, not stroked — record the effective "weight" as the
pillar width; terminals are chamfered at N degrees, computed from path segment
`359,364 → 263,317`; zero curves anywhere in the path data]

## Implied grid
[fill in: derive a base unit from the smallest recurring coordinate delta (likely
32-48 units at this viewBox scale) and state it as the implied module]

## Implied colour role
The mark is drawn solid black on transparent — ink/mark colour, not the copper
`--accent` currently hardcoded in `BondsmanLogo.tsx` (that value is leftover from
the superseded `brand.md` and is not to be read as canonical).

## Implied posture
Fully rectilinear, zero curves, chamfered corners: mechanical, engineered,
architectural — not organic, not playful.

## The two splits
Top: a notch gap between the two pillars. Bottom: a gap between the two base
slabs. Both are structural, not decorative — carry this into the visual language
as the anchor for the product's own "bond splits at resolution" moment (Part1 §11,
"the memorable moment").
```

- [ ] **Step 3: Commit**

```bash
git add design-system/LOGO_READING.md
git commit -m "Add logo reading"
```

---

## Task 3: PRINCIPLES.md

**Files:**
- Create: `design-system/PRINCIPLES.md`

**Interfaces:**
- Consumes: `design-system/LOGO_READING.md` (posture, splits).
- Produces: 5-7 named principles that every later component task must be checked against (each component task's "done" bar includes "does this violate a PRINCIPLES.md rule?").

- [ ] **Step 1: Write the strategy section**

Open `design-system/PRINCIPLES.md` with a strategy statement answering, in prose, against Part1 §2-4: what the design system exists to enable (an "operational instrument" reading, per Part1 §1, not a marketing shell), which authority-separation table (Part1 §4) the system must make visually legible on every relevant screen, and the mantra requirement.

- [ ] **Step 2: Write 5-7 principles as decisions with examples**

Each principle: one sentence of rule, then a concrete example of what it rules in and what it rules out. Candidate axes to resolve (each must be answered, not left open): how numbers/hashes are typographically distinguished from prose; how "live" vs "historical" vs "blueprint" content differs visually without a badge on every element; how consequence (slash) is visually differentiated from resolution (refund) without using decorative red elsewhere; how density is bounded (no infinite card grids — tie this to the anti-slop rule "no generic card sprawl"); how motion is prohibited during error/degraded states (tie to Task 24).

- [ ] **Step 3: Commit**

```bash
git add design-system/PRINCIPLES.md
git commit -m "Add design system principles"
```

---

## Task 4: VISUAL_LANGUAGE.md and COPY_TONE.md

**Files:**
- Create: `design-system/VISUAL_LANGUAGE.md`
- Create: `design-system/COPY_TONE.md`

**Interfaces:**
- Consumes: `LOGO_READING.md` (posture, grid, splits), `PRINCIPLES.md`.
- Produces: the single selected territory (name, and its concrete attributes: color temperature, type pairing direction, corner treatment, density) that Task 6 (tokens) turns into literal values. This is the one task in the plan whose output cannot be predicted in advance — it is the creative decision point Part2 §"Visual exploration" mandates.

- [ ] **Step 1: Explore three territories**

For each of 3 territories (short, in words, with a small described sample), write the strongest three arguments for and the strongest three against, evaluated against the candidate qualities list from Part2 (accountable, exact, financial, consequential, calm, premium, technical, human-readable, instrument-like, editorial, architectural, durable, restrained). Each territory must be a distinct, internally consistent grammar — not the same territory with a different accent color.

- [ ] **Step 2: Select one and justify**

Pick one. Justify specifically for Bondsman (not "this is a good design system in general") — the justification must reference at least one fact from `LOGO_READING.md` and at least one mechanism fact from Part1 §2 (bonded execution, priced risk, delayed evidence, split consequence, sealed receipt). State explicitly which of the anti-slop list items are used, if any, and the written justification for each (Global Constraints requires this — an unjustified anti-slop item is a defect).

- [ ] **Step 3: Write COPY_TONE.md**

Direct, factual, non-marketing. List banned words explicitly (at minimum: "revolutionary", "seamless", "unlock", "empower", "leverage" as a buzzword, "game-changing"). Require sentence case, active voice, one vocabulary list (action, bond, challenge window, slash, refund, reserve, receipt — reuse Part1's vocabulary, do not invent synonyms for these terms anywhere in the product).

- [ ] **Step 4: Commit**

```bash
git add design-system/VISUAL_LANGUAGE.md design-system/COPY_TONE.md
git commit -m "Select visual language territory and copy tone"
```

---

## Task 5: Responsive rules and content density doc

**Files:**
- Create: `design-system/RESPONSIVE.md`

**Interfaces:**
- Consumes: `VISUAL_LANGUAGE.md` (density/grid direction).
- Produces: exact breakpoint numbers and max-characters-per-line values that Task 10 (grid page) and every component task's mobile behavior cites.

- [ ] **Step 1: Declare breakpoints**

Three breakpoints minimum: mobile (< 640px), tablet (640-1024px), desktop (> 1024px). State exact pixel values as Tailwind `screens` overrides if the defaults don't match the chosen grid.

- [ ] **Step 2: Declare density rules**

Max characters per line for body text and for mono/hash text (Part2 deliverable 25 requires both numbers explicitly, e.g. body ≤ 72ch, mono lines wrap or truncate with a copy control past a stated character count). State when a rail vs. a drawer is used (tie to Part1 §9 Type 3 rules — drawers are for revealing detail, never for state that changes money).

- [ ] **Step 3: Commit**

```bash
git add design-system/RESPONSIVE.md
git commit -m "Add responsive and content density rules"
```

---

## Task 6: Design tokens (CSS variables + Tailwind mapping + automated contrast test)

**Files:**
- Modify: `design-system/TOKENS/tokens.css`
- Create: `design-system/TOKENS/tailwind-tokens.ts`
- Create: `design-system/TOKENS/contrast.mjs`
- Create: `design-system/TOKENS/test/contrast.test.mjs`
- Modify: `design-system/lab/tailwind.config.ts` (import the token mapping)

**Interfaces:**
- Consumes: `VISUAL_LANGUAGE.md` (the chosen territory's literal values).
- Produces: the CSS variable names every subsequent component task uses. Exact contract (names are fixed by this task; only the hex/numeric values are chosen by the territory decision):
  - Color roles: `--surface`, `--surface-raised`, `--ink`, `--accent`, `--positive`, `--consequential`, `--warning`, `--muted`, `--boundary`.
  - Spacing scale: `--space-1` through `--space-9` (numeric scale, e.g. 4/8/12/16/24/32/48/64/96px or the chosen territory's ratio).
  - Type scale: `--font-size-display`, `--font-size-headline`, `--font-size-subhead`, `--font-size-body`, `--font-size-data`, `--font-size-mono`.
  - Motion: `--duration-short`, `--duration-medium`, `--duration-long`, `--ease-standard`, `--ease-emphasized`.

- [ ] **Step 1: Write the failing contrast test**

`design-system/TOKENS/contrast.mjs`:
```js
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

`design-system/TOKENS/test/contrast.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../contrast.mjs';

function readTokens() {
  const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
  const tokens = {};
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

const REQUIRED_TOKENS = [
  'surface', 'surface-raised', 'ink', 'accent', 'positive', 'consequential',
  'warning', 'muted', 'boundary',
];

test('every required color token is defined', () => {
  const tokens = readTokens();
  for (const name of REQUIRED_TOKENS) {
    assert.ok(tokens[name], `missing --${name}`);
  }
});

const TEXT_PAIRS = [
  ['ink', 'surface'],
  ['muted', 'surface'],
  ['accent', 'surface'],
];

test('text-on-surface pairs meet WCAG AA (4.5:1)', () => {
  const tokens = readTokens();
  for (const [fg, bg] of TEXT_PAIRS) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
  }
});

const UI_PAIRS = [['boundary', 'surface']];

test('UI boundary pairs meet WCAG AA for graphics (3:1)', () => {
  const tokens = readTokens();
  for (const [fg, bg] of UI_PAIRS) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    assert.ok(ratio >= 3, `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs 3:1`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test design-system/TOKENS/test/contrast.test.mjs
```
Expected: FAIL — `tokens.css` is still the empty placeholder from Task 1.

- [ ] **Step 3: Populate tokens.css with the chosen territory's values**

Fill `design-system/TOKENS/tokens.css` with real hex values per `VISUAL_LANGUAGE.md`'s selected territory, using exactly the variable names listed in this task's Interfaces block:
```css
:root {
  --surface: #______;
  --surface-raised: #______;
  --ink: #______;
  --accent: #______;
  --positive: #______;
  --consequential: #______;
  --warning: #______;
  --muted: #______;
  --boundary: #______;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;

  --font-size-display: ______;
  --font-size-headline: ______;
  --font-size-subhead: ______;
  --font-size-body: ______;
  --font-size-data: ______;
  --font-size-mono: ______;

  --duration-short: 120ms;
  --duration-medium: 240ms;
  --duration-long: 480ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.3, 0, 0.1, 1);
}
```
Choose hex values that satisfy Step 1's test — check draft values against `contrastRatio()` before committing to them, adjusting lightness until all pairs clear their thresholds.

- [ ] **Step 4: Run the test again to verify it passes**

```bash
node --test design-system/TOKENS/test/contrast.test.mjs
```
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Write the Tailwind mapping and wire the lab**

`design-system/TOKENS/tailwind-tokens.ts`:
```ts
import type { Config } from 'tailwindcss';

export const tokenTheme: Config['theme'] = {
  extend: {
    colors: {
      surface: 'var(--surface)',
      'surface-raised': 'var(--surface-raised)',
      ink: 'var(--ink)',
      accent: 'var(--accent)',
      positive: 'var(--positive)',
      consequential: 'var(--consequential)',
      warning: 'var(--warning)',
      muted: 'var(--muted)',
      boundary: 'var(--boundary)',
    },
    spacing: {
      1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)',
      4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)',
      7: 'var(--space-7)', 8: 'var(--space-8)', 9: 'var(--space-9)',
    },
  },
};
```

Update `design-system/lab/tailwind.config.ts` to import and spread `tokenTheme` into `theme.extend`.

- [ ] **Step 6: Commit**

```bash
git add design-system/TOKENS design-system/lab/tailwind.config.ts
git commit -m "Add design tokens with automated contrast checks"
```

---

## Task 7: Typography lab page

**Files:**
- Create: `design-system/lab/app/typography/page.tsx`

**Interfaces:**
- Consumes: `--font-size-*` tokens from Task 6.
- Produces: the `<Type>` scale usage pattern (className conventions `text-display`, `text-headline`, etc.) that every later component references for text sizing.

- [ ] **Step 1: Add font-size utilities to the lab Tailwind config**

In `design-system/lab/tailwind.config.ts`, extend `fontSize` with the six tokens: `display`, `headline`, `subhead`, `body`, `data`, `mono`, each mapped to its `var(--font-size-*)`.

- [ ] **Step 2: Render every level with usage rules**

`design-system/lab/app/typography/page.tsx` renders one labelled sample per level (`text-display` through `text-mono`), each sample showing the raw pixel value read from the token, its intended use ("headline: page titles only, one per route"), and a real content example pulled from Part1 vocabulary (e.g. mono sample shows an actual-format action ID `#27` and a truncated hash).

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/app/typography design-system/lab/tailwind.config.ts
git commit -m "Add typography lab page"
```

---

## Task 8: Color lab page with contrast pairings

**Files:**
- Create: `design-system/lab/app/color/page.tsx`

**Interfaces:**
- Consumes: `contrastRatio()` from `design-system/TOKENS/contrast.mjs` (Task 6), token CSS variables.
- Produces: the visual contrast-swatch pattern reused by every state-family task (each swatch shows the ratio number, not just the color).

- [ ] **Step 1: Render every token as a swatch**

For each of the 9 color roles, render a swatch with its name, hex value, and role description (surface/ink/accent/positive/consequential/warning/muted/boundary — one line each on what triggers it, e.g. "consequential: appears only at the slash moment, never decoratively").

- [ ] **Step 2: Render the contrast pairing table**

Reuse the same `TEXT_PAIRS`/`UI_PAIRS` list from Task 6's test (import `contrastRatio` from `../../../TOKENS/contrast.mjs`) and render the computed ratio next to each pair with a pass/fail badge at the 4.5:1 / 3:1 thresholds — this is a live rendering of the same check the automated test enforces, so a future token change that breaks contrast is visible here immediately, not just in CI.

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/app/color
git commit -m "Add color lab page with live contrast pairings"
```

---

## Task 9: Spacing scale reference page

**Files:**
- Create: `design-system/lab/app/spacing/page.tsx`

- [ ] **Step 1: Render the scale**

One row per `--space-1` through `--space-9`: a filled bar at that width, the pixel value, and a one-line rule for when that step applies (e.g. `space-2`/8px: inline icon-to-label gaps; `space-5`/24px: default card padding; `space-9`/96px: section breaks only).

- [ ] **Step 2: Commit**

```bash
git add design-system/lab/app/spacing
git commit -m "Add spacing scale reference page"
```

---

## Task 10: Layout grid page (desktop/tablet/mobile)

**Files:**
- Create: `design-system/lab/app/grid/page.tsx`

**Interfaces:**
- Consumes: `design-system/RESPONSIVE.md` breakpoints (Task 5).

- [ ] **Step 1: Define and render the grid**

Render three visual grid overlays (columns + gutters + margins) at desktop, tablet, and mobile widths, using the exact breakpoint values from `RESPONSIVE.md`. State column count and gutter width numerically for each (e.g. desktop: 12 columns / 24px gutter / 64px margin).

- [ ] **Step 2: Commit**

```bash
git add design-system/lab/app/grid
git commit -m "Add layout grid lab page"
```

---

## Task 11: Button and link primitives (all states)

**Files:**
- Create: `design-system/lab/components/Button.tsx`
- Create: `design-system/lab/app/buttons/page.tsx`

**Interfaces:**
- Produces: `Button` component with props `{ variant: 'primary' | 'secondary' | 'quiet' | 'destructive'; state?: 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading'; children: React.ReactNode }` — this exact prop shape is the pattern Task 12-16's interactive components follow (variant + state, not ad hoc boolean props).

- [ ] **Step 1: Write the component**

```tsx
'use client';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive';
type VisualState = 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-surface',
  secondary: 'bg-transparent text-ink border border-boundary',
  quiet: 'bg-transparent text-muted',
  destructive: 'bg-consequential text-surface',
};

export function Button({
  variant = 'primary',
  state = 'default',
  children,
}: {
  variant?: Variant;
  state?: VisualState;
  children: ReactNode;
}) {
  const disabled = state === 'disabled' || state === 'loading';
  return (
    <button
      type="button"
      disabled={disabled}
      data-state={state}
      className={`${VARIANT_CLASSES[variant]} rounded px-4 py-2 text-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50`}
    >
      {state === 'loading' ? 'Loading…' : children}
    </button>
  );
}
```

- [ ] **Step 2: Render the full state × variant matrix**

`design-system/lab/app/buttons/page.tsx` renders a grid: 4 variants × 6 states (24 cells), plus a `Link` equivalent below with default/hover/focus/visited states, each cell labelled with its exact prop combination so a reviewer can screenshot the whole matrix in one frame.

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/Button.tsx design-system/lab/app/buttons
git commit -m "Add button and link primitives with full state matrix"
```

---

## Task 12: Form controls and form system rules

**Files:**
- Create: `design-system/lab/components/Field.tsx`
- Create: `design-system/lab/app/forms/page.tsx`
- Create: `design-system/FORMS.md`

**Interfaces:**
- Produces: `Field` wrapper component `{ label: string; help?: string; error?: string; children: ReactNode }` used by every input/textarea/select/checkbox/radio sample — this is the single grouping/label/help/error pattern every production form field reuses in Phase 2.

- [ ] **Step 1: Write the Field wrapper**

```tsx
import type { ReactNode } from 'react';

export function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-body text-ink">{label}</label>
      {children}
      {help && !error && <p className="text-data text-muted">{help}</p>}
      {error && (
        <p role="alert" className="text-data text-consequential">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render input, textarea, select, checkbox, radio, slider, address chip**

Each wrapped in `Field`, each shown in default / focus / error / disabled states (four states minimum per control, matching the Button task's state pattern).

- [ ] **Step 3: Write FORMS.md**

Document grouping rules (related fields share a labelled fieldset), the label/help/error hierarchy (help text disappears when an error is present, per the component above), per-stage progress affordance (tie to Part1 §16's 9-stage `/app/new` model — this doc is what Phase 2's stage strip implementation follows), and primary/secondary action pairing (primary right-aligned or bottom, secondary quiet-variant beside it, never two primary-variant buttons adjacent).

- [ ] **Step 4: Commit**

```bash
git add design-system/lab/components/Field.tsx design-system/lab/app/forms design-system/FORMS.md
git commit -m "Add form controls and form system rules"
```

---

## Task 13: Data display atoms (hash pill, copy control, badge, tag, tooltip, status dot)

**Files:**
- Create: `design-system/lab/components/HashPill.tsx`
- Create: `design-system/lab/components/CopyControl.tsx`
- Create: `design-system/lab/app/data-display/page.tsx`

**Interfaces:**
- Produces: `HashPill` `{ hash: string; href?: string }` (renders truncated `0x1234…abcd` form with a copy button and, if `href` given, a cspr.live link icon) and `CopyControl` `{ value: string }` (button-and-inline variants) — both reused verbatim by Task 14 (transaction rows) and Phase 2's monitor/receipt pages.

- [ ] **Step 1: Write HashPill**

```tsx
'use client';
import { CopyControl } from './CopyControl';

export function HashPill({ hash, href }: { hash: string; href?: string }) {
  const short = hash.length > 14 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-boundary bg-surface-raised px-2 py-0.5 font-mono text-mono text-ink">
      {short}
      <CopyControl value={hash} />
      {href && (
        <a href={href} target="_blank" rel="noreferrer" aria-label="View on cspr.live">
          ↗
        </a>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Write CopyControl**

```tsx
'use client';
import { useState } from 'react';

export function CopyControl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted hover:text-ink"
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
```

- [ ] **Step 3: Render badge, tag, tooltip, status dot alongside hash pill (short and long forms) and copy control (button and inline)**

Long-hash form must demonstrate the `RESPONSIVE.md` mono-line-wrap rule from Task 5 at mobile width, in the lab page — this is one of the acceptance criteria ("no text overflow... including long hashes and long addresses").

- [ ] **Step 4: Commit**

```bash
git add design-system/lab/components/HashPill.tsx design-system/lab/components/CopyControl.tsx design-system/lab/app/data-display
git commit -m "Add hash pill, copy control, badge, tag, tooltip, status dot"
```

---

## Task 14: Tables, timeline row, transaction row

**Files:**
- Create: `design-system/lab/components/TransactionRow.tsx`
- Create: `design-system/lab/components/TimelineNode.tsx`
- Modify: `design-system/lab/app/data-display/page.tsx`

**Interfaces:**
- Consumes: `HashPill` (Task 13).
- Produces: `TransactionRow` `{ type: string; hash: string; block: number; timestamp: string; cspLiveHref: string }` and `TimelineNode` `{ label: string; status: 'complete' | 'current' | 'upcoming'; hash?: string }` — the exact shape Phase 2's `/app/actions/[id]` monitor (Part1 §22) instantiates for its ledger and lifecycle timeline.

- [ ] **Step 1: Write TransactionRow**

```tsx
import { HashPill } from './HashPill';

export function TransactionRow({
  type,
  hash,
  block,
  timestamp,
  cspLiveHref,
}: {
  type: string;
  hash: string;
  block: number;
  timestamp: string;
  cspLiveHref: string;
}) {
  return (
    <tr className="border-b border-boundary">
      <td className="py-2 text-body">{type}</td>
      <td className="py-2">
        <HashPill hash={hash} href={cspLiveHref} />
      </td>
      <td className="py-2 text-data text-muted">{block}</td>
      <td className="py-2 text-data text-muted">{timestamp}</td>
    </tr>
  );
}
```

- [ ] **Step 2: Write TimelineNode**

```tsx
import { HashPill } from './HashPill';

const STATUS_CLASSES = {
  complete: 'bg-positive',
  current: 'bg-accent animate-pulse',
  upcoming: 'bg-muted opacity-40',
} as const;

export function TimelineNode({
  label,
  status,
  hash,
}: {
  label: string;
  status: 'complete' | 'current' | 'upcoming';
  hash?: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CLASSES[status]}`} aria-hidden />
      <span className="text-body text-ink">{label}</span>
      {hash && <HashPill hash={hash} />}
    </li>
  );
}
```

- [ ] **Step 3: Render three tables (transaction ledger, verifier registry, recent actions) and the full 7-node lifecycle timeline**

Lifecycle timeline nodes, in order (Part1 §22): `Initiated`, `Bonded`, `Executed`, `Evidence window`, `Challenged`, `ResolvedSlash`/`ResolvedRefund`, `Receipt sealed`.

- [ ] **Step 4: Commit**

```bash
git add design-system/lab/components/TransactionRow.tsx design-system/lab/components/TimelineNode.tsx design-system/lab/app/data-display/page.tsx
git commit -m "Add tables, timeline node, and transaction row"
```

---

## Task 15: Tabs, accordion, drawer, dialog

**Files:**
- Create: `design-system/lab/components/Drawer.tsx`
- Create: `design-system/lab/components/Dialog.tsx`
- Create: `design-system/lab/app/overlays/page.tsx`

**Interfaces:**
- Produces: `Drawer` `{ open: boolean; onClose: () => void; title: string; children: ReactNode }` and `Dialog` `{ open: boolean; onClose: () => void; title: string; blocking?: boolean; children: ReactNode }` — Phase 2 instantiates `Drawer` for transaction/receipt detail and `Dialog` for the submit-confirmation and tamper-test flows (Part1 §9 Type 3).

- [ ] **Step 1: Write Drawer (side panel, non-blocking, Escape closes)**

```tsx
'use client';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div role="dialog" aria-label={title} className="fixed inset-y-0 right-0 w-full max-w-md bg-surface-raised border-l border-boundary p-6">
      <button type="button" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <h2 className="text-headline text-ink">{title}</h2>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write Dialog (centered, blocking option traps focus and disables Escape)**

```tsx
'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Dialog({
  open,
  onClose,
  title,
  blocking = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  blocking?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !blocking) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, blocking, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-ink/60">
      <div
        ref={ref}
        tabIndex={-1}
        role="alertdialog"
        aria-label={title}
        className="bg-surface-raised border border-boundary rounded p-6 max-w-md"
      >
        <h2 className="text-headline text-ink">{title}</h2>
        {children}
        {!blocking && (
          <button type="button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render tabs, accordion, and open/closed states of both Drawer and Dialog (including a blocking dialog example — the pre-submit confirmation)**

- [ ] **Step 4: Commit**

```bash
git add design-system/lab/components/Drawer.tsx design-system/lab/components/Dialog.tsx design-system/lab/app/overlays
git commit -m "Add tabs, accordion, drawer, and dialog"
```

---

## Task 16: Wallet states (9 distinct cards)

**Files:**
- Create: `design-system/lab/components/WalletStateCard.tsx`
- Create: `design-system/lab/app/wallet-states/page.tsx`

**Interfaces:**
- Produces: `WalletStateCard` `{ variant: WalletState; children?: ReactNode }` where `WalletState` is the closed union below — Phase 2's `/app/new` wallet stage (Part1 §16) renders exactly one of these per capability-check result, never a generic "warning" variant.

- [ ] **Step 1: Write the closed union and card**

```tsx
export type WalletState =
  | 'not-installed'
  | 'locked'
  | 'rejected'
  | 'connected-ed25519'
  | 'connected-unsupported-key'
  | 'account-changed'
  | 'wrong-network'
  | 'missing-typed-data'
  | 'missing-message-signing'
  | 'disconnected-mid-flow';

const COPY: Record<WalletState, { title: string; body: string; tone: 'info' | 'blocking' | 'success' | 'warning' }> = {
  'not-installed': { title: 'Wallet not installed', body: 'Install a Casper wallet to continue, or continue in sandbox.', tone: 'info' },
  locked: { title: 'Unlock your wallet to continue', body: '', tone: 'info' },
  rejected: { title: 'Connection rejected', body: 'You can retry connecting.', tone: 'warning' },
  'connected-ed25519': { title: 'Connected — Ed25519', body: 'Key type and address confirmed.', tone: 'success' },
  'connected-unsupported-key': {
    title: 'Unsupported key type',
    body: "This account uses secp256k1. Bondsman's current verifier accepts Ed25519 only for P0. Switch account or continue in sandbox.",
    tone: 'blocking',
  },
  'account-changed': { title: 'Account changed mid-flow', body: 'Paid quotes are payer-bound and will not accept the new account for this action.', tone: 'warning' },
  'wrong-network': { title: 'Connected to mainnet', body: 'Switch to Casper testnet to continue.', tone: 'warning' },
  'missing-typed-data': { title: 'Typed-data signing unavailable', body: 'Payment cannot proceed.', tone: 'blocking' },
  'missing-message-signing': { title: 'Message signing unavailable', body: 'Authorisation cannot proceed.', tone: 'blocking' },
  'disconnected-mid-flow': { title: 'Wallet disconnected', body: 'Your action continues; the receipt is public.', tone: 'info' },
};

const TONE_CLASSES = {
  info: 'border-boundary',
  blocking: 'border-consequential',
  success: 'border-positive',
  warning: 'border-warning',
} as const;

export function WalletStateCard({ variant, children }: { variant: WalletState; children?: React.ReactNode }) {
  const { title, body, tone } = COPY[variant];
  return (
    <div className={`rounded border-2 p-4 bg-surface-raised ${TONE_CLASSES[tone]}`} data-variant={variant}>
      <h3 className="text-subhead text-ink">{title}</h3>
      {body && <p className="text-body text-muted">{body}</p>}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Render all 9 states in one grid, screenshot-ready**

`design-system/lab/app/wallet-states/page.tsx` renders one `WalletStateCard` per `WalletState` union member, in the exact order listed in Part1 §12's table, each labelled with its variant name so the required "Wallet states (full grid)" screenshot (Part2 acceptance criteria) is one frame.

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/WalletStateCard.tsx design-system/lab/app/wallet-states
git commit -m "Add wallet state card family (9 states)"
```

---

## Task 17: Payment ladder states (6 positions)

**Files:**
- Create: `design-system/lab/components/PaymentLadder.tsx`
- Create: `design-system/lab/app/payment-states/page.tsx`

**Interfaces:**
- Produces: `PaymentLadder` `{ current: PaymentState }` where `PaymentState` is `'required' | 'payload-prepared' | 'signature-received' | 'settlement-pending' | 'settled' | 'quote-returned'` — Phase 2's `/app/new` payment stage (Part1 §20) drives this directly off backend state, one variant visually distinct per position, only `'settled'` rendered as the confirmed/success treatment.

- [ ] **Step 1: Write the component**

```tsx
export type PaymentState =
  | 'required'
  | 'payload-prepared'
  | 'signature-received'
  | 'settlement-pending'
  | 'settled'
  | 'quote-returned';

const ORDER: PaymentState[] = [
  'required', 'payload-prepared', 'signature-received', 'settlement-pending', 'settled', 'quote-returned',
];

const LABEL: Record<PaymentState, string> = {
  required: 'Payment required',
  'payload-prepared': 'Payment payload prepared',
  'signature-received': 'Wallet signature received',
  'settlement-pending': 'Settlement pending',
  settled: 'Payment settled',
  'quote-returned': 'Paid quote returned',
};

export function PaymentLadder({ current }: { current: PaymentState }) {
  const currentIndex = ORDER.indexOf(current);
  return (
    <ol className="flex flex-col gap-2">
      {ORDER.map((state, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isConfirmed = state === 'settled' && isCurrent;
        return (
          <li
            key={state}
            data-state={state}
            className={
              isConfirmed
                ? 'text-positive font-semibold'
                : isCurrent
                  ? 'text-accent'
                  : isDone
                    ? 'text-muted line-through'
                    : 'text-muted opacity-50'
            }
          >
            {LABEL[state]}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: Render all 6 positions as distinct static snapshots**

One `PaymentLadder` per possible `current` value, side by side, so the required "Payment ladder (full sequence)" screenshot shows every position at once, plus one annotated callout confirming only `settled` uses the confirmed/success color per Global Constraints.

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/PaymentLadder.tsx design-system/lab/app/payment-states
git commit -m "Add payment ladder states (6 positions)"
```

---

## Task 18: Action lifecycle states and bond value block (with split variant)

**Files:**
- Create: `design-system/lab/components/BondValueBlock.tsx`
- Create: `design-system/lab/app/lifecycle/page.tsx`

**Interfaces:**
- Produces: `BondValueBlock` `{ posted: number; asset: string; resolution?: { slashed: number; reward: number; refund: number } }` — Phase 2's monitor (Part1 §22-24) and Task 24's motion prototype both render this component; the split variant (resolution present) is the memorable-moment component.

- [ ] **Step 1: Write the component**

```tsx
export function BondValueBlock({
  posted,
  asset,
  resolution,
}: {
  posted: number;
  asset: string;
  resolution?: { slashed: number; reward: number; refund: number };
}) {
  if (!resolution) {
    return (
      <div className="rounded border border-boundary p-4 bg-surface-raised">
        <span className="text-data text-muted">Posted</span>
        <p className="text-headline text-ink">
          {posted.toLocaleString()} {asset}
        </p>
      </div>
    );
  }
  const isSlash = resolution.slashed > 0;
  return (
    <div className="rounded border border-boundary p-4 bg-surface-raised grid grid-cols-3 gap-4">
      <div>
        <span className="text-data text-muted">Slashed to reserve</span>
        <p className={`text-headline ${isSlash ? 'text-consequential' : 'text-muted'}`}>
          {resolution.slashed.toLocaleString()} {asset}
        </p>
      </div>
      <div>
        <span className="text-data text-muted">Challenger reward</span>
        <p className="text-headline text-ink">
          {resolution.reward.toLocaleString()} {asset}
        </p>
      </div>
      <div>
        <span className="text-data text-muted">Payer refund</span>
        <p className="text-headline text-ink">
          {resolution.refund.toLocaleString()} {asset}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render the 6 lifecycle state markers + the bond value block in both variants**

Lifecycle states, each with a marker treatment and a one-line copy string (Part2 deliverable 14): `Initiated`, `Bonded`, `Executed`, `Challenged`, `ResolvedSlash`, `ResolvedRefund`. Render `BondValueBlock` posted-only, then the slash resolution (`2800/2520/280/0` matching Part1 §11's example numbers), then the refund resolution (`2800/0/0/2800`).

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/BondValueBlock.tsx design-system/lab/app/lifecycle
git commit -m "Add action lifecycle states and bond value block"
```

---

## Task 19: Receipt states

**Files:**
- Create: `design-system/lab/components/ReceiptPanel.tsx`
- Create: `design-system/lab/app/receipts/page.tsx`

**Interfaces:**
- Consumes: `HashPill` (Task 13).
- Produces: `ReceiptPanel` `{ status: 'valid' | 'malformed' | 'tampered' | 'signature-failure' | 'unavailable'; tamperedField?: string }` — Phase 2's `/verify` route (Part1 §13) is a thin wrapper around this component.

- [ ] **Step 1: Write the component**

```tsx
const HEADER: Record<string, { text: string; tone: 'success' | 'error' | 'warning' }> = {
  valid: { text: 'Receipt valid', tone: 'success' },
  malformed: { text: 'Receipt rejected — malformed', tone: 'error' },
  tampered: { text: 'Receipt rejected — tampered field', tone: 'error' },
  'signature-failure': { text: 'Receipt rejected — signature failure', tone: 'error' },
  unavailable: { text: 'Local checks passed, live verification unavailable', tone: 'warning' },
};

const TONE_CLASSES = {
  success: 'text-positive border-positive',
  error: 'text-consequential border-consequential',
  warning: 'text-warning border-warning',
} as const;

export function ReceiptPanel({
  status,
  tamperedField,
}: {
  status: 'valid' | 'malformed' | 'tampered' | 'signature-failure' | 'unavailable';
  tamperedField?: string;
}) {
  const { text, tone } = HEADER[status];
  return (
    <div className={`rounded border-2 p-4 ${TONE_CLASSES[tone]}`}>
      <h3 className="text-subhead">{text}</h3>
      {status === 'tampered' && tamperedField && (
        <p className="text-data text-muted">Field: {tamperedField}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render all 5 states**

Including the tampered case with a real field name (e.g. `paidQuoteId`) shown as a diff-style before/after pair.

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/ReceiptPanel.tsx design-system/lab/app/receipts
git commit -m "Add receipt states"
```

---

## Task 20: Evidence labels (Live / Historical / Blueprint)

**Files:**
- Create: `design-system/lab/components/EvidenceLabel.tsx`
- Create: `design-system/lab/app/evidence-labels/page.tsx`

**Interfaces:**
- Produces: `EvidenceLabel` `{ kind: 'historical' | 'blueprint' }` — Live is the absence of a label (per Part1 §25, "Live default is usually unlabelled"), so there is no `'live'` variant; Phase 2 renders nothing for live content and this component only for the other two.

- [ ] **Step 1: Write the component and a legend tooltip**

```tsx
'use client';
import { useState } from 'react';

const COPY = {
  historical: 'Historical — a completed, recorded outcome.',
  blueprint: 'Blueprint — a design proposal, not executable in this build.',
};

export function EvidenceLabel({ kind }: { kind: 'historical' | 'blueprint' }) {
  const [showLegend, setShowLegend] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      <span className="text-data text-muted border border-boundary rounded px-1.5 py-0.5 uppercase tracking-serial">
        {kind}
      </span>
      <button
        type="button"
        aria-label="What does this mean?"
        onMouseEnter={() => setShowLegend(true)}
        onMouseLeave={() => setShowLegend(false)}
        className="text-muted"
      >
        ?
      </button>
      {showLegend && (
        <span role="tooltip" className="absolute left-0 top-full z-10 w-56 rounded border border-boundary bg-surface-raised p-2 text-data text-muted">
          {COPY[kind]}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Render both labels plus an unlabelled "live" example side by side, with the legend visible**

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/EvidenceLabel.tsx design-system/lab/app/evidence-labels
git commit -m "Add evidence labels (historical, blueprint) and legend"
```

---

## Task 21: Banners, empty/loading/error/degraded states, skeletons

**Files:**
- Create: `design-system/lab/components/Banner.tsx`
- Create: `design-system/lab/components/Skeleton.tsx`
- Create: `design-system/lab/app/banners-states/page.tsx`

**Interfaces:**
- Produces: `Banner` `{ tone: 'info' | 'degraded' | 'error'; children: ReactNode }` and `Skeleton` `{ shape: 'table' | 'timeline' | 'tile' | 'inline' }` — Phase 2's degraded-backend banner (Part1 §7, "the frontend must never lie about degraded backend") and every route's loading state both reuse these directly.

- [ ] **Step 1: Write Banner**

```tsx
import type { ReactNode } from 'react';

const TONE_CLASSES = {
  info: 'bg-surface-raised border-boundary text-ink',
  degraded: 'bg-warning/10 border-warning text-ink',
  error: 'bg-consequential/10 border-consequential text-ink',
} as const;

export function Banner({ tone, children }: { tone: 'info' | 'degraded' | 'error'; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`border-l-4 p-3 ${TONE_CLASSES[tone]}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write Skeleton (no shimmer if `prefers-reduced-motion`)**

```tsx
export function Skeleton({ shape }: { shape: 'table' | 'timeline' | 'tile' | 'inline' }) {
  const dims: Record<string, string> = {
    table: 'h-40 w-full',
    timeline: 'h-64 w-24',
    tile: 'h-24 w-full',
    inline: 'h-4 w-24',
  };
  return (
    <div
      className={`rounded bg-surface-raised motion-safe:animate-pulse motion-reduce:animate-none ${dims[shape]}`}
      aria-hidden
    />
  );
}
```

- [ ] **Step 3: Render all banner tones, all 4 skeleton shapes, empty states (recent-actions list, verifier input, unknown action ID, build downloads), and inline/per-stage-card/full-page error states**

Include one example with `as of <timestamp>` annotation per Part1 §22's degraded-backend rule.

- [ ] **Step 4: Commit**

```bash
git add design-system/lab/components/Banner.tsx design-system/lab/components/Skeleton.tsx design-system/lab/app/banners-states
git commit -m "Add banners, skeletons, empty/loading/error/degraded states"
```

---

## Task 22: Mobile navigation sheet, nav states, focus states

**Files:**
- Create: `design-system/lab/components/MobileNavSheet.tsx`
- Create: `design-system/lab/app/mobile-nav/page.tsx`

**Interfaces:**
- Produces: `MobileNavSheet` `{ open: boolean; onClose: () => void; items: { label: string; href: string }[] }` — Phase 2's global header (Part1 §7) uses this directly, with the exact 5-item list `Product/App/Proof/Verify/Build` plus a footer `Status` row.

- [ ] **Step 1: Write the component (full-height sheet, large tap targets)**

```tsx
'use client';

export function MobileNavSheet({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: { label: string; href: string }[];
}) {
  if (!open) return null;
  return (
    <div role="dialog" aria-label="Navigation" className="fixed inset-0 bg-surface z-50 flex flex-col">
      <button type="button" onClick={onClose} aria-label="Close menu" className="self-end p-4 text-ink">
        ✕
      </button>
      <nav className="flex flex-col">
        {items.map((item) => (
          <a key={item.href} href={item.href} className="text-headline text-ink py-4 px-6 border-b border-boundary min-h-[44px]">
            {item.label}
          </a>
        ))}
      </nav>
      <a href="/status" className="mt-auto text-body text-muted p-6">
        Status
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Render open/closed states at mobile viewport, plus nav item default/active/focus states at desktop width**

Use exactly the item list from Part1 §7: `Product`, `App`, `Proof`, `Verify`, `Build`.

- [ ] **Step 3: Commit**

```bash
git add design-system/lab/components/MobileNavSheet.tsx design-system/lab/app/mobile-nav
git commit -m "Add mobile navigation sheet and nav states"
```

---

## Task 23: Iconography rules and icon set

**Files:**
- Create: `design-system/ICONOGRAPHY.md`
- Create: `design-system/lab/components/icons/` (one `.tsx` file per icon)

**Interfaces:**
- Consumes: `LOGO_READING.md`'s chamfer angle and stroke-weight numbers (Task 2) — every icon must be built on the same construction, stated explicitly per icon in `ICONOGRAPHY.md`.

- [ ] **Step 1: Write ICONOGRAPHY.md**

State the shared construction rule (e.g. "all icons are built on a 24px grid with N px corner chamfers, filled not stroked, matching the logo's terminal treatment") and list the required icon set: copy, external-link, checkmark, warning, error, info, chevron (expand/collapse), close, hamburger, wallet, clock/countdown, challenge/watchdog. State explicitly: no icon from an external icon library is permitted (anti-slop: "mixed-source icons").

- [ ] **Step 2: Build each icon as a small React component following the stated construction rule, and render them all in a reference sheet**

`design-system/lab/app/icons/page.tsx` (add to lab index) renders every icon at 16/24/32px with its name labelled.

- [ ] **Step 3: Commit**

```bash
git add design-system/ICONOGRAPHY.md design-system/lab/components/icons design-system/lab/app/icons
git commit -m "Add iconography rules and icon set"
```

---

## Task 24: Motion spec, bond-split prototype, reduced-motion equivalents

**Files:**
- Create: `design-system/MOTION_SPEC.md`
- Create: `design-system/lab/app/motion/page.tsx`
- Create: `design-system/lab/components/BondSplitAnimation.tsx`

**Interfaces:**
- Consumes: `BondValueBlock` (Task 18), `--duration-*`/`--ease-*` tokens (Task 6).
- Produces: the timing/easing contract (`--duration-short/medium/long`, `--ease-standard/emphasized`) that Claude Design's later animation session (Part2 deliverable 31) reads directly — no other file defines timing values.

- [ ] **Step 1: Write MOTION_SPEC.md**

Required sections, each filled with real content (this is Part2's mandatory `MOTION_SPEC.md` deliverable list, verbatim): motion principles (3-5), timing ranges with the exact millisecond bands from Task 6's tokens, easing families (name `--ease-standard` and `--ease-emphasized`, state when each is used), entrance behaviour, state transitions (lifecycle-to-lifecycle, payment-ladder-to-ladder), progress behaviour (challenge countdown, settlement pending), consequence behaviour (the bond split, choreographed step by step: posted amount holds, then a visible divide into three values with `--duration-long` and `--ease-emphasized`, values counting rather than jump-cutting), receipt sealing behaviour, reduced-motion mapping (one line per animation naming its static equivalent), mobile motion simplification, motion-prohibited states (error, degraded, "any time the interface would lie about a state" — quote this phrase, it is load-bearing), in-place number change behavior ("shift with subtle emphasis, not a bounce or glow"), the homepage mechanism storyboard (frame 1-6, each frame: what's on stage / enters / exits / dwells / timing / still-frame description).

- [ ] **Step 2: Build the bond-split prototype**

```tsx
'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { BondValueBlock } from './BondValueBlock';

export function BondSplitAnimation() {
  const [resolved, setResolved] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div>
      <button type="button" onClick={() => setResolved(true)}>
        Trigger resolution
      </button>
      <motion.div
        animate={resolved ? { opacity: 1 } : { opacity: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.48, ease: [0.3, 0, 0.1, 1] }}
      >
        {resolved ? (
          <BondValueBlock posted={2800} asset="csprUSD" resolution={{ slashed: 2520, reward: 280, refund: 0 }} />
        ) : (
          <BondValueBlock posted={2800} asset="csprUSD" />
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Render the prototype plus a static still-frame version (the reduced-motion equivalent) side by side**

`design-system/lab/app/motion/page.tsx` renders `<BondSplitAnimation />` and, beside it, the same two `BondValueBlock` states with no animation wrapper at all, explicitly labelled "reduced-motion equivalent."

- [ ] **Step 4: Commit**

```bash
git add design-system/MOTION_SPEC.md design-system/lab/app/motion design-system/lab/components/BondSplitAnimation.tsx
git commit -m "Add motion spec and bond-split prototype"
```

---

## Task 25: A11Y.md and QA.md

**Files:**
- Create: `design-system/A11Y.md`
- Create: `design-system/QA.md`

**Interfaces:**
- Consumes: contrast test from Task 6, every component built in Tasks 11-24 (this task audits them, it does not build new components).

- [ ] **Step 1: Write A11Y.md**

Contrast obligations (reference Task 6's automated test as the enforcement mechanism), keyboard focus rings (state the exact CSS: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`, matching Task 11's Button), `aria-live` announcement rules (state which state changes announce: lifecycle transitions, payment ladder advances, wallet connection changes — and which don't: hover, focus), reduced-motion behaviour (point to Task 24), minimum target sizes (44px, matching Task 22's nav sheet).

- [ ] **Step 2: Write QA.md**

Explicit, checkable tests, each stated as a pass/fail assertion an implementer or reviewer runs manually or via the Task 27 screenshot pass: every component has focus/hover/disabled/loading/error states following the same rule (spot-check against Button, Field, WalletStateCard); no essential label under 12px (cross-check against Task 7's type scale — state the minimum token used for any label); no text overflow at mobile width for long hashes/addresses (cross-check against Task 13's HashPill mobile render); every animation has a reduced-motion equivalent rendered in the lab (cross-check against Task 24).

- [ ] **Step 3: Run a manual pass against QA.md's checklist across every lab page built so far, fixing any failures found before moving on**

- [ ] **Step 4: Commit**

```bash
git add design-system/A11Y.md design-system/QA.md
git commit -m "Add accessibility and QA rules, fix issues found in audit pass"
```

---

## Task 26: Logo usage rules, favicon, social

**Files:**
- Create: `design-system/LOGO_USAGE.md`
- Create: `design-system/lab/app/logo-usage/page.tsx`
- Create: `design-system/lab/public/favicon.ico` (generated from the approved mark, monochrome)

**Interfaces:**
- Consumes: `design-inputs/bondsman-logo-final.png`, `frontend/components/brand/BondsmanLogo.tsx`'s `BondsmanMark` SVG.

- [ ] **Step 1: Write LOGO_USAGE.md**

Minimum clear space (state as a multiple of the mark's own pillar width, from `LOGO_READING.md`), minimum size (state a pixel floor below which the chamfers become illegible), and explicit wrong-use examples (stretching, recoloring outside the token palette, placing on insufficient-contrast backgrounds — check the placement against Task 6's `contrastRatio()`).

- [ ] **Step 2: Render the usage page**

Show the mark at minimum size, with correct clear space illustrated, and 3 wrong-use examples crossed out.

- [ ] **Step 3: Generate a monochrome favicon from the existing `BondsmanMark` SVG path** (reuse the exact path data, do not redraw)

- [ ] **Step 4: Commit**

```bash
git add design-system/LOGO_USAGE.md design-system/lab/app/logo-usage design-system/lab/public/favicon.ico
git commit -m "Add logo usage rules and favicon"
```

---

## Task 27: Capture required screenshots

**Files:**
- Create: `design-system/SCREENSHOTS/*.png` (one file per required shot below)
- Create: `design-system/lab/scripts/capture-screenshots.mjs` (Playwright script, reuses the `@playwright/test` devDependency pattern already in `frontend/`)

**Interfaces:**
- Consumes: every lab route built in Tasks 1-26 (this task must run last among Phase 1 build tasks).

- [ ] **Step 1: Write the capture script**

```js
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = new URL('../../SCREENSHOTS/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ['home', '/', 1280, 800],
  ['typography', '/typography', 1280, 1200],
  ['color', '/color', 1280, 1400],
  ['spacing', '/spacing', 1280, 900],
  ['grid-desktop', '/grid', 1280, 900],
  ['grid-tablet', '/grid', 768, 1024],
  ['grid-mobile', '/grid', 375, 812],
  ['buttons', '/buttons', 1280, 1200],
  ['forms', '/forms', 1280, 1400],
  ['wallet-states', '/wallet-states', 1280, 1600],
  ['payment-ladder', '/payment-states', 1280, 900],
  ['lifecycle', '/lifecycle', 1280, 1000],
  ['receipts', '/receipts', 1280, 1000],
  ['evidence-labels', '/evidence-labels', 1280, 600],
  ['banners-states', '/banners-states', 1280, 1400],
  ['mobile-nav', '/mobile-nav', 375, 812],
  ['motion-reduced', '/motion', 1280, 800],
];

const browser = await chromium.launch();
for (const [name, path, width, height] of SHOTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`http://localhost:4400${path}`);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  await page.close();
}
await browser.close();
console.log(`Captured ${SHOTS.length} screenshots to ${OUT}`);
```

- [ ] **Step 2: Run the lab dev server and the capture script**

```bash
(cd design-system/lab && npm run dev &) && sleep 3
node design-system/lab/scripts/capture-screenshots.mjs
```
Expected: `Captured 17 screenshots to .../design-system/SCREENSHOTS/`. Then kill the dev server.

- [ ] **Step 3: Manually capture the bond-split moment mid-animation**

The automated script captures the reduced-motion (static) frame at `/motion`. Separately, use the browser tools to load `/motion`, click "Trigger resolution", and capture one screenshot mid-transition and one screen recording or GIF for the motion capture requirement — save as `design-system/SCREENSHOTS/bond-split-motion.png` (still) and note in the review request (Task 28) that a capture tool limitation may mean this is a still-frame sequence rather than video.

- [ ] **Step 4: Verify all 17+ files exist and are non-empty**

```bash
ls -la design-system/SCREENSHOTS/ | awk '$5 == 0 { print "EMPTY:", $9 }'
```
Expected: no output (no empty files).

- [ ] **Step 5: Commit**

```bash
git add design-system/SCREENSHOTS design-system/lab/scripts/capture-screenshots.mjs
git commit -m "Capture required design system screenshots"
```

---

## Task 28: README index finalization and review request

**Files:**
- Modify: `design-system/README.md`
- Create: `design-system/REVIEW_REQUEST.md`

**Interfaces:**
- Consumes: every document and screenshot produced by Tasks 1-27.

- [ ] **Step 1: Update README.md to index every doc with a one-line description each**

- [ ] **Step 2: Write REVIEW_REQUEST.md**

Must contain: a summary of the visual language selection and why it won (pull from `VISUAL_LANGUAGE.md` Step 2); the exact local command to start the lab (`npm run design-lab` from repo root); a listing of the screenshot set with file paths; open questions or trade-offs for the user to decide before Phase 2 starts (at minimum: does the selected territory hold up at the specific route contexts not yet built, e.g. the dense `/app/actions/[id]` monitor; any anti-slop justification the user should double-check).

- [ ] **Step 3: Commit and stop**

```bash
git add design-system/README.md design-system/REVIEW_REQUEST.md
git commit -m "Finalize design system docs and write review request"
```

This is the Phase 1 stop point. Do not begin Phase 2 tasks until the user has reviewed `design-system/SCREENSHOTS/`, run the lab locally, and explicitly approved the visual direction.

---

# Phase 2: Production Build (sequenced, detailed re-plan triggered by Phase 1 approval)

Phase 2 cannot be written at the same step-by-step granularity as Phase 1 right now: its exact component APIs, class names, and copy come from whatever Task 1-26 actually produces, which does not exist yet. What Part1 already fixes today — independent of the Task 4 territory choice — is the route structure, the stage list, and the priority order. That structural half is sequenced below. **The moment Phase 1 is approved, run the writing-plans skill again for Phase 2, using this sequencing as the section-by-section input** — do not attempt to hand-write Phase 2's TDD steps before that point; doing so would either duplicate this section or silently invent component APIs that Phase 1 hasn't produced.

Total remaining runway after Phase 1's Jul 22 EOD stop: **Jul 22 evening through Jul 26 23:59 UTC** — roughly 4 days for production build + QA + demo video + submission.

## Day 1 (Jul 22 evening – Jul 23): Foundation + the one primary loop, part 1

1. Wire `frontend/tailwind.config.ts` to import `design-system/TOKENS/tailwind-tokens.ts` (same pattern as Task 6, Step 5 in Phase 1); delete the superseded hardcoded color/font values from the current config; replace `frontend/lib/fonts.ts` only if `VISUAL_LANGUAGE.md` selected a different type family than Geist (check this — do not swap fonts if the approved territory kept Geist).
2. Rebuild `frontend/app/layout.tsx` header/footer nav using Task 22's `MobileNavSheet` and Task 11's `Button` for the wallet slot, per Part1 §7 (wallet slot contextual to `/app/*` only, never global).
3. Rebuild `/` (Part1 §8 first entry, §10 Stage 1): mechanism panel per Task 24's storyboard, Action 27 summary tile, two CTAs. This is explicitly P0 per Part1 §5's judge-journey weighting — first thing a judge sees.

## Day 2 (Jul 23 – Jul 24): The one primary loop, part 2

4. Build `/proof/27` (Part1 §8, §11 default judge path) — this is the higher-priority route relative to `/app/new` per Part1 §5's stated fallback strategy ("the reliable path"), so it is sequenced before the live flow despite `/app/new` being listed first in the route map.
5. Build `/app` and `/app/new`'s 9 stages (Part1 §16) using Task 16 (wallet cards), Task 17 (payment ladder), Task 12 (form Field), Task 11 (buttons) directly — this is the largest single production route, budget the majority of Day 2 to it.

## Day 3 (Jul 24 – Jul 25): Instrument, verifier, build, status

6. Build `/app/actions/[id]` (Part1 §22) using Task 14 (TransactionRow, TimelineNode), Task 18 (BondValueBlock, both variants), Task 24's bond-split motion for the live transition.
7. Build `/verify` (Part1 §13) using Task 19's `ReceiptPanel` directly.
8. Build `/build` (Part1 §14) and `/status` (Part1 §8) — both smaller routes, same day.

## Day 4 (Jul 25 – Jul 26 23:59 UTC): QA, demo video, submission

9. Full QA pass against `design-system/QA.md` across all 8 production routes (not just the lab).
10. Record the demo video (submission-required) walking the judge journey from Part1 §11.
11. Verify Casper testnet transaction is reproducible and visible (Part1 §5, criterion 1 — "transaction-producing on-chain component" is a hard eligibility bar, confirm before submitting, not after).
12. Submit: GitHub link + demo video via DoraHacks, before 23:59 UTC.

---

# Self-Review Notes

**Spec coverage:** Every Part2 deliverable (1-31) maps to a task above: strategy/principles → Task 3; territories → Task 4; typography/color/spacing/grid → Tasks 7-10; component primitives → Tasks 11-15; form system → Task 12; data display → Tasks 13-14; wallet states → Task 16; payment states → Task 17; lifecycle states → Task 18; receipt states → Task 19; evidence labels → Task 20; loading/empty/error → Task 21; degraded → Task 21; a11y → Task 25; motion → Task 24; iconography → Task 23; illustration/diagram rules → folded into Task 24's storyboard section; density rules → Task 5; copy tone → Task 4; QA → Task 25; documentation → Task 28; playground → Task 1 (scaffold) through Task 27 (screenshots); tokens → Task 6; Claude Design hand-off spec → Task 24. Illustration/diagram rules for the mechanism panel specifically (what's allowed/prohibited beyond icons) is folded into Task 24's MOTION_SPEC.md storyboard section rather than a separate file — flagged here in case the user wants it split out as its own doc during execution.

**Placeholder scan:** Hex/px values in Task 6 are intentionally left as fill-in-after-Task-4 rather than pre-chosen numbers, because Part2 explicitly mandates the territory exploration happen during execution, not during planning — this is a scoped, single, clearly-marked exception, not a general placeholder pattern, and Task 6's own automated test is what prevents it from being skipped or left incomplete.

**Type consistency:** `WalletState`, `PaymentState`, and the `BondValueBlock`/`ReceiptPanel`/`TransactionRow`/`TimelineNode` prop shapes are each defined exactly once (Tasks 16-19) and referenced by name (not redefined) everywhere else they appear, including in the Phase 2 sequencing section.
