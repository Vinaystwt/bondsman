// Color lab: every color role as a swatch (name, hex, role description
// paraphrased from the doc comments in design-system/TOKENS/tokens.css), plus
// a live rendering of the same contrast pairing check Task 6's automated test
// (design-system/TOKENS/test/contrast.test.mjs) enforces in CI — so a future
// token edit that breaks contrast is visible here immediately, not just in
// CI output.
//
// Static server component: no interactivity, so no 'use client' directive,
// matching the lab's existing convention (see app/page.tsx, app/typography/page.tsx).

import { contrastRatio } from '../../../TOKENS/contrast.mjs';

type Role = {
  key: string;
  className: string;
  hex: string;
  label: string;
  description: string;
};

// Hex values and descriptions mirror design-system/TOKENS/tokens.css exactly
// (see that file's doc comments for the full reasoning); paraphrased here,
// not reworded into a different claim.
const ROLES: Role[] = [
  {
    key: 'surface',
    className: 'bg-surface',
    hex: '#eef0f2',
    label: 'Surface',
    description:
      'The paper ground: a faint cool-grey, not pure white, so the black mark sits on its native light field. Light is canonical here, not a dark-mode default.',
  },
  {
    key: 'surface-raised',
    className: 'bg-surface-raised',
    hex: '#ffffff',
    label: 'Surface raised',
    description:
      'Panels/containers that sit "filled" above the paper ground render in a whiter, raised fill (Principle 2: filled = real, settled construction).',
  },
  {
    key: 'ink',
    className: 'bg-ink',
    hex: '#15181c',
    label: 'Ink',
    description:
      "Dense charcoal-black matching the mark's solid fill; not pure #000. Carries prose, structure, and — per Territory A's direction — links, focus, and \"live\" state via weight, rules, and motion rather than a third colour.",
  },
  {
    key: 'accent',
    className: 'bg-accent',
    hex: '#1f5c8b',
    label: 'Accent',
    description:
      'Reserved technical-accent token — NOT used in components 7-23. Stays in the contract (required name, passes contrast) for a genuine future need only; not to be reached for decoratively, and never a stand-in for the two reserved slash/destructive roles or for the Live/Historical signal.',
  },
  {
    key: 'positive',
    className: 'bg-positive',
    hex: '#166b4d',
    label: 'Positive',
    description:
      'Quiet, non-celebratory positive/confirm role — an inert instrument-panel green for e.g. a passed check, deliberately not a celebratory "success green" on refund (Principle 3).',
  },
  {
    key: 'consequential',
    className: 'bg-consequential',
    hex: '#b8420a',
    label: 'Consequential',
    description:
      'Reserved exclusively for the slashed portion at ResolvedSlash (Principle 3) — appears only at the slash moment, never decoratively, and never reused for form errors, destructive buttons, warnings, or hover.',
  },
  {
    key: 'warning',
    className: 'bg-warning',
    hex: '#8a5a00',
    label: 'Warning',
    description:
      'Distinct hue/value from both consequential and destructive; used for non-fatal caution states only.',
  },
  {
    key: 'muted',
    className: 'bg-muted',
    hex: '#5b6470',
    label: 'Muted',
    description: 'Cool-grey neutral ramp for secondary text, captions, and disabled states.',
  },
  {
    key: 'boundary',
    className: 'bg-boundary',
    hex: '#78828d',
    label: 'Boundary',
    description:
      'Hairline drafting-rule colour: divider lines and container edges, never a boxed "card" border.',
  },
  {
    key: 'destructive',
    className: 'bg-destructive',
    hex: '#a3201f',
    label: 'Destructive',
    description:
      'Separately-named destructive-control colour (Principle 3 hard requirement: never equal to consequential). Used for destructive UI controls, e.g. a "cancel"/"revoke" button fill or icon.',
  },
];

const HEX: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.key, r.hex]));

// Same pairs as design-system/TOKENS/test/contrast.test.mjs's TEXT_PAIRS:
// running text/inline labels set directly on `surface`, held to the WCAG AA
// text threshold (4.5:1).
const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'surface'],
  ['muted', 'surface'],
  ['accent', 'surface'],
];

// Same pairs as the test's UI_PAIRS: graphical UI components (a hairline
// rule, a destructive control's solid fill) held to the WCAG AA non-text/UI
// threshold (3:1), not the 4.5:1 text threshold.
const UI_PAIRS: Array<[string, string]> = [
  ['boundary', 'surface'],
  ['destructive', 'surface'],
];

type PairRow = {
  fg: string;
  bg: string;
  ratio: number;
  threshold: number;
  category: 'text' | 'UI component';
  pass: boolean;
};

function buildRows(pairs: Array<[string, string]>, threshold: number, category: PairRow['category']): PairRow[] {
  return pairs.map(([fg, bg]) => {
    const ratio = contrastRatio(HEX[fg], HEX[bg]);
    return { fg, bg, ratio, threshold, category, pass: ratio >= threshold };
  });
}

const ROWS: PairRow[] = [
  ...buildRows(TEXT_PAIRS, 4.5, 'text'),
  ...buildRows(UI_PAIRS, 3, 'UI component'),
];

export default function ColorPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Color</h1>
      <p>
        The ten color roles from <code>design-system/TOKENS/tokens.css</code>. Chroma is
        rationed to exactly two reserved roles &mdash; <code>consequential</code> (the
        slash-only accent) and a separately-named <code>destructive</code> &mdash; which
        must never share a value; everything else is a neutral, a quiet status colour, or
        a reserved-but-unused token.
      </p>

      <h2>Roles</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {ROLES.map((role) => (
          <section key={role.key} style={{ marginBlock: 0 }}>
            <div
              className={role.className}
              style={{
                height: '4.5rem',
                border: '1px solid var(--boundary)',
              }}
            />
            <p style={{ margin: '0.5rem 0 0' }}>
              <strong>{role.label}</strong> &mdash; <code>--{role.key}</code>
            </p>
            <p className="font-mono tabular-nums" style={{ margin: '0.125rem 0 0.25rem' }}>
              {role.hex}
            </p>
            <p style={{ margin: 0 }}>{role.description}</p>
          </section>
        ))}
      </div>

      <h2>Contrast pairings</h2>
      <p>
        The same pairs checked by <code>design-system/TOKENS/test/contrast.test.mjs</code>,
        computed live here via <code>contrastRatio()</code> from{' '}
        <code>design-system/TOKENS/contrast.mjs</code>. Text pairs (running text or inline
        labels set directly on a surface) are held to WCAG AA's 4.5:1 text threshold; UI
        component pairs (a hairline rule, a destructive control&rsquo;s solid fill) are held
        to the 3:1 non-text/graphics threshold &mdash; so a token change that breaks either
        check is visible on this page, not only in CI.
      </p>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--boundary)', padding: '0.5rem' }}>
              Pair
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--boundary)', padding: '0.5rem' }}>
              Category
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--boundary)', padding: '0.5rem' }}>
              Threshold
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--boundary)', padding: '0.5rem' }}>
              Ratio
            </th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid var(--boundary)', padding: '0.5rem' }}>
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={`${row.fg}-${row.bg}`}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--boundary)' }}>
                <code>--{row.fg}</code> on <code>--{row.bg}</code>
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--boundary)' }}>
                {row.category}
              </td>
              <td
                style={{ padding: '0.5rem', borderBottom: '1px solid var(--boundary)' }}
                className="font-mono tabular-nums"
              >
                {row.threshold.toFixed(1)}:1
              </td>
              <td
                style={{ padding: '0.5rem', borderBottom: '1px solid var(--boundary)' }}
                className="font-mono tabular-nums"
              >
                {row.ratio.toFixed(2)}:1
              </td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--boundary)' }}>
                <span
                  className={row.pass ? 'bg-positive' : 'bg-destructive'}
                  style={{ color: 'var(--surface-raised)', padding: '0.125rem 0.5rem' }}
                >
                  {row.pass ? 'PASS' : 'FAIL'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
