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
 * Symbol concept:
 *   A vertical execution channel bisected by an assurance gate. Two anchored
 *   posts hold a horizontal bond bar across the channel; the bar cannot pass
 *   without the posts. Above the bar, a small tick marks the settled seal;
 *   below the bar, a divided base represents the reserve and reward split
 *   that pays out when objective evidence resolves the action.
 *
 * The mark is drawn on a 64 unit grid, single stroke weight, single color.
 * It reads at 16px in a browser tab and stays balanced at 512px in an OG
 * card. currentColor renders it in whatever text color surrounds it.
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
      {/* Assurance perimeter — subtle document ring. */}
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="10"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {/* Vertical execution channel. */}
      <path
        d="M32 12 V52"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      {/* Left post. */}
      <path
        d="M18 22 V44"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right post. */}
      <path
        d="M46 22 V44"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bond bar — the collateral held across the gate. */}
      <path
        d="M14 33 H50"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Settled tick above — seal of approval before execution. */}
      <path
        d="M27 22 L31 26 L38 19"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Slash / reward base below — the two payout halves. */}
      <path
        d="M22 46 L32 40 L42 46"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.7"
      />
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
