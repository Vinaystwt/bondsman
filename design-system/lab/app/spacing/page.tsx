// Spacing scale reference: one row per --space-1 through --space-9, showing
// the visual width, pixel value, and a one-line rule for when that step applies
// (drawn from the Bondsman design system's actual use cases, not generic advice).
//
// Static server component: no interactivity, matching the lab's convention
// (see app/page.tsx, app/typography/page.tsx, app/color/page.tsx).

type SpaceStep = {
  key: string;
  pixels: number;
  label: string;
  rule: string;
};

const SCALE: SpaceStep[] = [
  {
    key: 'space-1',
    pixels: 4,
    label: 'Hairline',
    rule: 'Icon-to-glyph alignment nudges, the smallest adjustment-only increment.',
  },
  {
    key: 'space-2',
    pixels: 8,
    label: 'Tight',
    rule: 'Inline icon-to-label gaps, badge internal padding.',
  },
  {
    key: 'space-3',
    pixels: 12,
    label: 'Compact',
    rule: 'Compact form field internal padding.',
  },
  {
    key: 'space-4',
    pixels: 16,
    label: 'Default',
    rule: 'Default form field internal padding, inline element gaps.',
  },
  {
    key: 'space-5',
    pixels: 24,
    label: 'Panel',
    rule: 'Default card/panel padding.',
  },
  {
    key: 'space-6',
    pixels: 32,
    label: 'Stack',
    rule: 'Gaps between related form fields or stacked components.',
  },
  {
    key: 'space-7',
    pixels: 48,
    label: 'Section',
    rule: 'Gaps between distinct sections within a page.',
  },
  {
    key: 'space-8',
    pixels: 64,
    label: 'Major',
    rule: 'Major section breaks.',
  },
  {
    key: 'space-9',
    pixels: 96,
    label: 'Page',
    rule: 'Page-level section breaks only, used sparingly.',
  },
];

export default function SpacingPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Spacing scale</h1>
      <p>
        The nine spacing steps from <code>design-system/TOKENS/tokens.css</code>. Each
        step is bound to a real Bondsman use case &mdash; not a generic "small/medium/large"
        classification, but the specific context where that increment appears in components
        7&ndash;23.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {SCALE.map((step) => (
          <div key={step.key} style={{ display: 'grid', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {/* Visual bar at the token width */}
              <div
                style={{
                  width: `var(--${step.key})`,
                  height: '2rem',
                  backgroundColor: 'var(--ink)',
                  flexShrink: 0,
                }}
              />
              {/* Label and pixel value */}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0 }}>
                  <strong>{step.label}</strong> &mdash; <code>--{step.key}</code> &mdash;{' '}
                  <code className="font-mono tabular-nums">{step.pixels}px</code>
                </p>
              </div>
            </div>
            {/* Rule for when this step applies */}
            <p style={{ margin: 0, paddingLeft: '3rem', color: 'var(--muted)' }}>
              {step.rule}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
