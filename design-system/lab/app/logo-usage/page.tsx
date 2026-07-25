// Logo usage lab (Task 26): minimum size, minimum clear space, and wrong-use
// examples for the Bondsman mark. Rules are stated in full in
// `design-system/LOGO_USAGE.md`; this page renders them so they can be
// eyeballed.
//
// MARK_PATH below is copied verbatim from
// `frontend/components/brand/BondsmanLogo.tsx` (`MARK_PATH`, viewBox
// `0 0 1024 1024`) — not redrawn. That file is a read-only source for this
// task; the lab app has no cross-package import path to it, so the path
// string is duplicated here character-for-character instead.

const MARK_PATH =
  'M400 195H492V300H430L359 364V677H263V317L400 195ZM532 195H623L760 317V677H665V364L592 300H532V195ZM425 468H599V677H425V468ZM263 710H484V737L437 828H263V710ZM539 710H760V828H586L539 737V710Z';

// LOGO_READING.md: pillar width 92 units / mark width 497 units ≈ 0.185.
const CLEAR_SPACE_RATIO = 0.185;

function Mark({
  size,
  color = 'var(--ink)',
  style,
}: {
  size: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      role="img"
      aria-label="Bondsman mark"
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      style={{ color, ...style }}
    >
      <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export default function LogoUsagePage() {
  const clearSpaceDemoSize = 160;
  const clearSpace = clearSpaceDemoSize * CLEAR_SPACE_RATIO;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1 className="mt-4 font-sans text-headline text-ink">Logo usage</h1>
      <p className="mt-2 max-w-prose text-body text-muted">
        Full rules in <code className="font-mono text-mono">LOGO_USAGE.md</code>.
        This page renders the minimum size floor, the clear-space margin, and
        three concrete wrong-use examples.
      </p>

      {/* Minimum size */}
      <h2 className="mt-10 font-sans text-subhead text-ink">
        Minimum size — 16px floor
      </h2>
      <p className="mt-2 max-w-prose text-body text-muted">
        Below 16px the finer (base-slab) chamfer run is under one device
        pixel and aliases into a rounded corner. 16px is the smallest size
        this mark should render at outside the favicon exception.
      </p>
      <div className="mt-4 flex items-end gap-8">
        <div className="flex flex-col items-center gap-2">
          <Mark size={16} />
          <span className="font-mono text-mono text-muted">16px (floor)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Mark size={32} />
          <span className="font-mono text-mono text-muted">32px</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Mark size={64} />
          <span className="font-mono text-mono text-muted">64px</span>
        </div>
      </div>

      {/* Clear space */}
      <h2 className="mt-10 font-sans text-subhead text-ink">
        Minimum clear space — 1× pillar width (~0.185× mark width) per side
      </h2>
      <p className="mt-2 max-w-prose text-body text-muted">
        Nothing else may sit inside the dashed boundary below: no text, no
        card edge, no adjacent mark.
      </p>
      <div
        className="mt-4 inline-block border border-dashed border-boundary"
        style={{ padding: clearSpace }}
      >
        <Mark size={clearSpaceDemoSize} />
      </div>

      {/* Wrong use */}
      <h2 className="mt-10 font-sans text-subhead text-ink">Wrong use</h2>
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Mark size={80} style={{ width: 140, height: 80 }} />
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-3xl text-destructive"
            >
              ✕
            </span>
          </div>
          <p className="max-w-[16rem] text-center font-mono text-mono text-muted">
            Non-uniform stretch — width/height set independently, distorting
            the ~41.7&deg;/62.68&deg; chamfer angles.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Mark size={80} color="#2fd06e" />
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-3xl text-destructive"
            >
              ✕
            </span>
          </div>
          <p className="max-w-[16rem] text-center font-mono text-mono text-muted">
            Recoloring outside the token palette — an arbitrary hex not in{' '}
            <code>tokens.css</code> (here, a stray green with no token name).
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            className="relative flex items-center justify-center"
            style={{ background: '#5b6470', width: 80, height: 80 }}
          >
            <Mark size={80} color="#15181c" />
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-3xl text-destructive"
            >
              ✕
            </span>
          </div>
          <p className="max-w-[16rem] text-center font-mono text-mono text-muted">
            Insufficient-contrast background — ink mark (#15181c) on{' '}
            <code>--muted</code> (#5b6470): contrastRatio() = 2.97:1, below
            the 4.5:1 floor.
          </p>
        </div>
      </div>
    </main>
  );
}
