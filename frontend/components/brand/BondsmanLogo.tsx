import type { CSSProperties } from 'react';

export type LogoVariant = 'mark' | 'lockup' | 'compact';

interface BondsmanLogoProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  monochrome?: boolean;
  title?: string;
}

/**
 * Bondsman brand mark. Original vector identity, no bitmap dependency.
 *
 * Concept: an enclosed bond seal. Two brackets frame a central horizontal
 * bond bar carrying a small sealed dot at its centre. The brackets are the
 * accountability boundary; the bar is the collateral held across the gate;
 * the dot is the receipt seal that closes an action.
 *
 * Drawn on a 64 unit grid. Single stroke weight for legibility down to 16.
 * currentColor render so the mark takes on the surrounding text colour when
 * monochrome is enabled; otherwise it locks to the brand green.
 */
export function BondsmanMark({
  size = 32,
  className,
  title = 'Bondsman',
  monochrome = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  monochrome?: boolean;
}) {
  const stroke = monochrome ? 'currentColor' : 'var(--accent, #35C281)';
  const style: CSSProperties = { color: stroke };
  return (
    <svg
      role="img"
      aria-label={title}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
    >
      <title>{title}</title>
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M14 10 H10 A2 2 0 0 0 8 12 V52 A2 2 0 0 0 10 54 H14"
          fill="none"
          strokeWidth="3.6"
        />
        <path
          d="M50 10 H54 A2 2 0 0 1 56 12 V52 A2 2 0 0 1 54 54 H50"
          fill="none"
          strokeWidth="3.6"
        />
        <path d="M8 32 H56" strokeWidth="4.6" />
      </g>
      <circle cx="32" cy="32" r="4.2" fill="currentColor" />
    </svg>
  );
}

export default function BondsmanLogo({
  size = 32,
  variant = 'mark',
  className,
  monochrome = false,
  title = 'Bondsman',
}: BondsmanLogoProps) {
  if (variant === 'mark') {
    return (
      <BondsmanMark
        size={size}
        className={className}
        title={title}
        monochrome={monochrome}
      />
    );
  }
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
        <BondsmanMark size={size} title={title} monochrome={monochrome} />
        <span className="font-display text-sm font-semibold tracking-tight text-bone">
          Bondsman
        </span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <BondsmanMark size={size} title={title} monochrome={monochrome} />
      <span className="font-display text-lg font-semibold tracking-tight text-bone">
        Bondsman
      </span>
    </span>
  );
}
