import type { CSSProperties } from 'react';

export type LogoVariant = 'mark' | 'lockup' | 'compact';

interface BondsmanLogoProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  monochrome?: boolean;
  title?: string;
}

const MARK_PATH =
  'M400 195H492V300H430L359 364V677H263V317L400 195ZM532 195H623L760 317V677H665V364L592 300H532V195ZM425 468H599V677H425V468ZM263 710H484V737L437 828H263V710ZM539 710H760V828H586L539 737V710Z';

/**
 * Bondsman brand mark reconstructed from the final source logo.
 *
 * The mark is a geometric bond seal: two upper pillars, a central collateral
 * block and two separated base slabs. It is filled instead of stroked so small
 * app icons preserve the same weight as the source artwork.
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
  const fill = monochrome ? 'currentColor' : 'var(--accent, #B7791F)';
  const style: CSSProperties = { color: fill };
  return (
    <svg
      role="img"
      aria-label={title}
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      className={className}
      style={style}
    >
      <title>{title}</title>
      <path d={MARK_PATH} fill="currentColor" fillRule="evenodd" />
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
