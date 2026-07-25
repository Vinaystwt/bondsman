import { chamferedRing, PRIMARY_RATIO } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Copy: two overlapping chamfered-corner frames (the "two sheets" reading
// every copy icon needs). Each frame is a hollow ring (evenodd: outer
// boundary minus inner boundary) built from chamferedRing, all four corners
// cut at the mark's primary ~41.7deg pillar angle (LOGO_READING.md) -- never
// rounded. The frames are drawn as two separate <path> elements so their
// edges stay visually distinct where they overlap (a solid-fill union of two
// identically-colored solid rects would just merge into one shape; hollow
// rings keep the crossing edges legible).
const CUT = { dx: 2.4, dy: Math.round(2.4 * PRIMARY_RATIO * 100) / 100 };

const BACK = chamferedRing(3, 2, 14, 14, 2, { tl: CUT, tr: CUT, br: CUT, bl: CUT });
const FRONT = chamferedRing(7, 8, 14, 14, 2, { tl: CUT, tr: CUT, br: CUT, bl: CUT });

export function CopyIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={BACK} fillRule="evenodd" />
      <path d={FRONT} fillRule="evenodd" />
    </svg>
  );
}
