// Typography lab: one labelled sample per type-scale level, each stating its
// raw pixel value (read from design-system/TOKENS/tokens.css --font-size-*),
// its intended use rule, and a real Bondsman content sample — never lorem
// ipsum (PRINCIPLES.md Principle 1: numbers/hashes are not prose, and this
// page's job is to demonstrate that split concretely).
//
// Static server component: no interactivity, so no 'use client' directive,
// matching the lab's existing convention (see app/page.tsx).

type Level = {
  key: string;
  className: string;
  label: string;
  px: string;
  rule: string;
  face: 'sans' | 'mono';
};

const LEVELS: Level[] = [
  {
    key: 'display',
    className: 'text-display',
    label: 'Display',
    px: '48px',
    rule: 'display: the sheet’s single largest figure or page title, one per route.',
    face: 'sans',
  },
  {
    key: 'headline',
    className: 'text-headline',
    label: 'Headline',
    px: '32px',
    rule: 'headline: section headings within a page, sentence case, never a paragraph.',
    face: 'sans',
  },
  {
    key: 'subhead',
    className: 'text-subhead',
    label: 'Subhead',
    px: '20px',
    rule: 'subhead: panel headers and secondary groupings that sit below a headline.',
    face: 'sans',
  },
  {
    key: 'body',
    className: 'text-body',
    label: 'Body',
    px: '16px',
    rule: 'body: running prose, capped at a 72-character measure (RESPONSIVE.md §3).',
    face: 'sans',
  },
  {
    key: 'data',
    className: 'text-data',
    label: 'Data',
    px: '18px',
    rule: 'data: auditable bond amounts and basis-point figures, tabular, never truncated (Principle 1; RESPONSIVE.md §3).',
    face: 'mono',
  },
  {
    key: 'mono',
    className: 'text-mono',
    label: 'Mono',
    px: '14px',
    rule: 'mono: hash, address, and action-id identifiers; identifiers over 20 characters truncate to 0x + 6 + … + 4 with a copy control (RESPONSIVE.md §3).',
    face: 'mono',
  },
];

export default function TypographyPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Typography</h1>
      <p>
        The six-step type scale from <code>design-system/TOKENS/tokens.css</code>.
        Prose renders in IBM Plex Sans (<code>--font-sans</code>); numbers, hashes,
        and addresses render in IBM Plex Mono (<code>--font-mono</code>) per
        Principle 1 (&ldquo;numbers and hashes are not prose&rdquo;) &mdash; the two
        faces never carry each other&rsquo;s content.
      </p>

      {LEVELS.map((level) => (
        <section key={level.key} style={{ marginBlock: '2.5rem' }}>
          <p style={{ margin: 0 }}>
            <strong>{level.label}</strong> &mdash; <code>text-{level.key}</code> &mdash;{' '}
            {level.px}
          </p>
          <p style={{ margin: '0.25rem 0 1rem' }}>{level.rule}</p>

          {level.key === 'display' && (
            <p className="text-display font-sans">Action 27</p>
          )}

          {level.key === 'headline' && (
            <p className="text-headline font-sans">Policy priced the bond</p>
          )}

          {level.key === 'subhead' && (
            <p className="text-subhead font-sans">Responsible parties</p>
          )}

          {level.key === 'body' && (
            <p className="text-body font-sans" style={{ maxWidth: '72ch' }}>
              AI explains. Policy prices. Verifier checks. Watchdog challenges.
              Contract settles.
            </p>
          )}

          {level.key === 'data' && (
            <p className="text-data font-mono tabular-nums">Posted 2,800 csprUSD</p>
          )}

          {level.key === 'mono' && (
            <div className="font-mono">
              <p className="text-mono tabular-nums" style={{ margin: 0 }}>#27</p>
              <p className="text-mono" style={{ margin: '0.25rem 0 0' }}>0x7f3a91&hellip;c92e</p>
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
