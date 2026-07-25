import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Hamburger: three plain axis-aligned bars. Every corner here is already
// 90deg, so ICONOGRAPHY.md's rule ("chamfer only where a corner-cut is
// needed") means no cut is applied -- a forced decorative chamfer on a pure
// rectangle would be exactly the kind of arbitrary bevel LOGO_READING.md's
// two measured angles are meant to rule out.
export function HamburgerIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      <rect x={4} y={5} width={16} height={2.5} />
      <rect x={4} y={10.75} width={16} height={2.5} />
      <rect x={4} y={16.5} width={16} height={2.5} />
    </svg>
  );
}
