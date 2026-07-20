import type { ReactNode } from 'react';

/**
 * Small uppercase document label. Serial style. Used above section headings
 * and above card labels.
 */
export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`serial text-[0.68rem] text-muted ${className ?? ''}`}>
      {children}
    </span>
  );
}

/** Raised document panel. Base surface for cards. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-rule bg-surface ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** Labelled metric, mono figure. */
export function Stat({
  label,
  children,
  tone = 'bone',
}: {
  label: string;
  children: ReactNode;
  tone?: 'bone' | 'accent' | 'slash' | 'muted';
}) {
  const toneClass = {
    bone: 'text-bone',
    accent: 'text-accent',
    slash: 'text-slash',
    muted: 'text-muted',
  }[tone];
  return (
    <div className="rounded-md border border-rule bg-surface px-5 py-4">
      <Label>{label}</Label>
      <div className={`mt-2 font-mono text-2xl tabular ${toneClass}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Page container. One shared max width and one shared horizontal gutter for
 * every route. Use this instead of hand rolling max-w and px on each page.
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-14 ${className ?? ''}`}>
      {children}
    </div>
  );
}

/**
 * Wider container for diagrams and full width proof evidence. Same gutters
 * as the standard container so alignment lines up on shared pages.
 */
export function WideContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-14 ${className ?? ''}`}>
      {children}
    </div>
  );
}

/**
 * Vertical rhythm section. Standard vertical padding, so pages do not each
 * invent their own py-* scale.
 */
export function Section({
  id,
  children,
  className,
  tone,
  as: Tag = 'section',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'raised' | 'ruled';
  as?: 'section' | 'div' | 'article';
}) {
  const toneClass =
    tone === 'raised'
      ? 'bg-surface/40'
      : tone === 'ruled'
        ? 'border-t border-rule'
        : '';
  return (
    <Tag id={id} className={`py-16 sm:py-20 lg:py-28 ${toneClass} ${className ?? ''}`}>
      {children}
    </Tag>
  );
}

/**
 * Standard section header. Small serial eyebrow, tight display headline,
 * optional supporting paragraph. Used everywhere so headings share a rhythm.
 */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : '';
  return (
    <header className={`max-w-[62ch] ${alignClass} ${className ?? ''}`}>
      {eyebrow && <Label>{eyebrow}</Label>}
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-bone sm:text-[2.2rem] lg:text-[2.55rem]">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted sm:text-[1.05rem]">
          {lede}
        </p>
      )}
    </header>
  );
}

/**
 * Panel grid. Consistent gaps for related cards. Two, three or four column
 * responsive grids without duplicating the same class strings each page.
 */
export function PanelGrid({
  cols = 2,
  children,
  className,
  gap = 'md',
}: {
  cols?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
  gap?: 'md' | 'lg';
}) {
  const gapClass = gap === 'lg' ? 'gap-6 lg:gap-8' : 'gap-4 lg:gap-6';
  const colsClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols];
  return <div className={`grid ${colsClass} ${gapClass} ${className ?? ''}`}>{children}</div>;
}

/**
 * Small status pill. Neutral by default, green when tone is ok, red on fault,
 * amber on warn. Uppercase serial letterform matches the rest of the system.
 */
export function StatusPill({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'fault' | 'info';
  children: ReactNode;
}) {
  const toneClass = {
    neutral: 'border-rule text-muted bg-surface',
    ok: 'border-accent/40 text-accent bg-accent/10',
    warn: 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10',
    fault: 'border-slash/40 text-slash bg-slash/10',
    info: 'border-rule text-bone bg-surface',
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 serial text-[0.62rem] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export default Panel;
