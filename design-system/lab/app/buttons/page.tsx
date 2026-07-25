// Buttons & links lab: the full Button variant x state matrix (4 x 6 = 24
// cells), plus a Link equivalent with default/hover/focus/visited states.
//
// Deviation from the original Task 11 brief, made explicit here for review:
// the brief's example Button code used `bg-accent text-surface` for the
// `primary` variant. After Task 6/Checkpoint A the project owner ruled that
// `--accent` stays in the token contract (design-system/TOKENS/tokens.css)
// but is NOT used anywhere in components 7-23 -- see that file's own comment
// on `--accent` ("reserved... for a genuine future need only") -- and
// VISUAL_LANGUAGE.md's direction is that interactive states (links, focus,
// hover, "live") are carried by ink weight, rules, and motion, not a third
// colour. So `primary` here is redesigned as a solid `--ink` fill
// (Principle 2's "filled = real, settled construction"), `secondary` is an
// ink-family outline on the raised surface, `quiet` is unbordered low-
// emphasis ink-on-muted, and only `destructive` keeps its dedicated
// `--destructive` token (Principle 3 requires destructive controls get a
// separately-named colour, never `--consequential` and never `--accent`).
// Full reasoning lives in components/Button.tsx's header comment.
//
// Rendered as a table (variant rows x state columns) rather than a repeated
// card grid, per PRINCIPLES.md Principle 4 ("density is bounded... chooses a
// table... before it chooses a repeated card grid") -- and it happens to be
// the layout that lets a reviewer screenshot all 24 cells labelled with
// their exact prop combination in one frame, as Task 11 requires.
//
// Static server component for the surrounding page chrome; Button itself is
// a client component (see components/Button.tsx) so it stays genuinely
// interactive wherever Task 12-16 reuse it, not just in this forced-state
// matrix.

import { Button, type ButtonVariant, type ButtonVisualState } from '../../components/Button';

const VARIANTS: Array<{ key: ButtonVariant; label: string }> = [
  { key: 'primary', label: 'Fund bond' },
  { key: 'secondary', label: 'View policy' },
  { key: 'quiet', label: 'Dismiss' },
  { key: 'destructive', label: 'Revoke access' },
];

const STATES: ButtonVisualState[] = ['default', 'hover', 'active', 'focus', 'disabled', 'loading'];

type LinkStateDemo = {
  key: 'default' | 'hover' | 'focus' | 'visited';
  label: string;
  className: string;
};

// Link states, same "ink weight / rules / motion, not a third colour"
// direction as the button: default and hover are both full `--ink`, using the
// underline decoration colour (boundary -> ink) as the weight step, mirroring
// how a hairline drafting rule strengthens. `focus` reuses the same outline
// treatment as the button's focus-visible state. `visited` is the one state
// that needs a value distinct from "currently actionable ink" without
// reaching for a new hue -- it steps down to `--muted`, the same neutral
// cool-grey ramp tokens.css already assigns to "secondary text... disabled
// states," not a chromatic accent.
const LINK_STATES: LinkStateDemo[] = [
  {
    key: 'default',
    label: "state: 'default'",
    className: 'text-ink underline underline-offset-4 decoration-boundary',
  },
  {
    key: 'hover',
    label: "state: 'hover'",
    className: 'text-ink underline underline-offset-4 decoration-ink',
  },
  {
    key: 'focus',
    label: "state: 'focus'",
    className:
      'text-ink underline underline-offset-4 decoration-boundary outline outline-2 outline-offset-2 outline-ink',
  },
  {
    key: 'visited',
    label: "state: 'visited'",
    className: 'text-muted underline underline-offset-4 decoration-muted',
  },
];

export default function ButtonsPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Buttons &amp; links</h1>
      <p style={{ maxWidth: '72ch' }}>
        Four <code>Button</code> variants (<code>primary</code>, <code>secondary</code>,{' '}
        <code>quiet</code>, <code>destructive</code>) across six forced visual states (
        <code>default</code>, <code>hover</code>, <code>active</code>, <code>focus</code>,{' '}
        <code>disabled</code>, <code>loading</code>) &mdash; 24 cells. No cell uses{' '}
        <code>--accent</code>: state is carried by ink weight (fill vs. outline vs. unbordered),
        rules (border/ring/underline), and motion (a short transition, a 1px press translate), per{' '}
        <code>VISUAL_LANGUAGE.md</code>. Only <code>destructive</code> uses a dedicated chromatic
        token (<code>--destructive</code>), per <code>PRINCIPLES.md</code> Principle 3.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid var(--boundary)',
                  padding: '0.5rem',
                }}
              >
                Variant
              </th>
              {STATES.map((state) => (
                <th
                  key={state}
                  className="font-mono"
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid var(--boundary)',
                    padding: '0.5rem',
                    fontWeight: 400,
                  }}
                >
                  {state}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VARIANTS.map((variant) => (
              <tr key={variant.key}>
                <th
                  scope="row"
                  style={{
                    textAlign: 'left',
                    verticalAlign: 'top',
                    borderBottom: '1px solid var(--boundary)',
                    padding: '1rem 0.5rem',
                    fontWeight: 600,
                  }}
                >
                  {variant.key}
                </th>
                {STATES.map((state) => (
                  <td
                    key={`${variant.key}-${state}`}
                    style={{
                      borderBottom: '1px solid var(--boundary)',
                      padding: '1rem 0.5rem',
                      verticalAlign: 'top',
                    }}
                  >
                    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
                      <Button variant={variant.key} state={state}>
                        {variant.label}
                      </Button>
                      <code className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        variant=&quot;{variant.key}&quot; state=&quot;{state}&quot;
                      </code>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Link</h2>
      <p style={{ maxWidth: '72ch' }}>
        No separate colour for links either: default and hover both set <code>--ink</code> text,
        distinguished by the underline&rsquo;s decoration colour stepping from{' '}
        <code>--boundary</code> (hairline) to <code>--ink</code> (full weight) on hover. Focus
        reuses the button&rsquo;s <code>--ink</code> outline. Visited steps the whole link down to{' '}
        <code>--muted</code> &mdash; the existing neutral secondary-text ramp, not a new hue.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {LINK_STATES.map((linkState) => (
          <div key={linkState.key} style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
            <a href="/proof/27" className={`text-body font-sans ${linkState.className}`}>
              View receipt #27
            </a>
            <code className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
              {linkState.label}
            </code>
          </div>
        ))}
      </div>
    </main>
  );
}
