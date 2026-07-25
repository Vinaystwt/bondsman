import type { ReactNode } from 'react';

/** A small uppercase label used to title sections and fields, document-style. */
export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`serial text-[0.68rem] text-muted ${className ?? ''}`}
    >
      {children}
    </span>
  );
}

/** A raised document panel. The base surface for cards across the app. */
export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-rule bg-surface ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/** A labelled metric, figure typeset large in mono. */
export function Stat({
  label,
  children,
  tone = 'bone',
}: {
  label: string;
  children: ReactNode;
  tone?: 'bone' | 'accent' | 'slash';
}) {
  const toneClass = {
    bone: 'text-bone',
    accent: 'text-accent',
    slash: 'text-slash',
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

export default Panel;
