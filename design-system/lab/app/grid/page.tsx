// Layout grid lab: one visual grid overlay (columns + gutters + margins) per
// responsive tier, using the exact breakpoint values from
// design-system/RESPONSIVE.md §1 (mobile 0-639px, tablet 640-1023px, desktop
// 1024px+). Column count, gutter, and margin are concrete numbers chosen to
// match VISUAL_LANGUAGE.md's "Structural Ledger" density direction (bounded,
// table/list-oriented, never a wide masonry grid) — more columns and more
// generous margin at wider tiers, never introducing a fourth tier.
//
// Gutter and margin values are read from design-system/TOKENS/tokens.css's
// spacing scale (--space-N), not invented pixel numbers: --space-5 (24px),
// --space-8 (64px), --space-4 (16px), --space-6 (32px), --space-3 (12px).
//
// Static server component: no interactivity, matching the lab's existing
// convention (see app/page.tsx, app/typography/page.tsx, app/color/page.tsx,
// app/spacing/page.tsx).

type Tier = {
  key: string;
  label: string;
  range: string;
  previewWidth: number;
  columns: number;
  gutterVar: string;
  gutterPx: number;
  marginVar: string;
  marginPx: number;
  note: string;
};

const TIERS: Tier[] = [
  {
    key: 'desktop',
    label: 'Desktop',
    range: '1024px+ (RESPONSIVE.md §1: lg:)',
    previewWidth: 1280,
    columns: 12,
    gutterVar: '--space-5',
    gutterPx: 24,
    marginVar: '--space-8',
    marginPx: 64,
    note:
      'Full 12-column expression, generous 64px margin so the two-panel divider pattern (§18) and the parties rail read as a bounded sheet, not edge-to-edge.',
  },
  {
    key: 'tablet',
    label: 'Tablet',
    range: '640–1023px (RESPONSIVE.md §1: sm: to just under lg:)',
    previewWidth: 768,
    columns: 8,
    gutterVar: '--space-4',
    gutterPx: 16,
    marginVar: '--space-6',
    marginPx: 32,
    note:
      '8 columns, narrower margin — enough width for a rail to stay visible alongside the primary zone, or for a two-panel pattern to stack top-to-bottom (RESPONSIVE.md §2) without collapsing behind a tab switcher.',
  },
  {
    key: 'mobile',
    label: 'Mobile',
    range: '0–639px (RESPONSIVE.md §1: unprefixed default)',
    previewWidth: 375,
    columns: 4,
    gutterVar: '--space-3',
    gutterPx: 12,
    marginVar: '--space-4',
    marginPx: 16,
    note:
      'Single dominant column in practice (content typically spans all 4), tight margin and gutter — the secondary rail stacks below the primary zone rather than trading columns for a drawer (RESPONSIVE.md §2).',
  },
];

function GridOverlay({ tier }: { tier: Tier }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div
        style={{
          width: `${tier.previewWidth}px`,
          minWidth: `${tier.previewWidth}px`,
          display: 'flex',
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--boundary)',
        }}
      >
        {/* Left margin zone: paper ground, distinct from the raised content area */}
        <div
          style={{
            width: `var(${tier.marginVar})`,
            flexShrink: 0,
            backgroundColor: 'var(--surface)',
            borderRight: '1px dashed var(--boundary)',
          }}
        />
        {/* Column area: gutters are the grid gaps, letting the raised background show through */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${tier.columns}, 1fr)`,
            gap: `var(${tier.gutterVar})`,
            padding: '0.75rem 0',
          }}
        >
          {Array.from({ length: tier.columns }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '10rem',
                backgroundColor: 'var(--ink)',
                opacity: 0.07,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '0.25rem',
              }}
            >
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 1 }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>
        {/* Right margin zone */}
        <div
          style={{
            width: `var(${tier.marginVar})`,
            flexShrink: 0,
            backgroundColor: 'var(--surface)',
            borderLeft: '1px dashed var(--boundary)',
          }}
        />
      </div>
    </div>
  );
}

export default function GridPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Layout grid</h1>
      <p>
        One column/gutter/margin grid per responsive tier, at the exact breakpoint values
        from <code>design-system/RESPONSIVE.md</code> §1 (mobile 0&ndash;639px, tablet
        640&ndash;1023px, desktop 1024px+). Column count, gutter, and margin widen with each
        tier to match <code>VISUAL_LANGUAGE.md</code>&rsquo;s bounded, table/list-oriented
        density direction &mdash; not a fourth tier, and never a repeated card grid. Gutter
        and margin values are the spacing-scale tokens from{' '}
        <code>design-system/TOKENS/tokens.css</code> (see <code>/spacing</code>), not
        arbitrary pixel numbers. Each overlay below is rendered at a fixed pixel width
        representing that tier&rsquo;s viewport (scroll horizontally if it exceeds your
        window); the pale strip on each side is the margin, the numbered bars are columns,
        and the gaps between them are gutters.
      </p>

      <div style={{ display: 'grid', gap: '3rem' }}>
        {TIERS.map((tier) => (
          <section key={tier.key} style={{ display: 'grid', gap: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>
              {tier.label} &mdash; <span style={{ fontWeight: 400 }}>{tier.range}</span>
            </h2>
            <p className="font-mono tabular-nums" style={{ margin: 0 }}>
              {tier.columns} columns / {tier.gutterPx}px gutter (<code>{tier.gutterVar}</code>
              ) / {tier.marginPx}px margin (<code>{tier.marginVar}</code>) &mdash; preview at{' '}
              {tier.previewWidth}px
            </p>
            <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '72ch' }}>{tier.note}</p>
            <GridOverlay tier={tier} />
          </section>
        ))}
      </div>
    </main>
  );
}
