import { chamferedRing, PRIMARY_RATIO } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// External-link: a chamfered box (ring, all four corners primary-cut) with a
// straight diagonal shaft escaping toward the top-right, terminating in a
// rectilinear L-shaped arrowhead bracket. The shaft is a straight-edged
// parallelogram (M/L/Z only, no curve command) whose end caps are cut
// perpendicular to its own run -- the same "cut, don't round, the terminal"
// logic LOGO_READING.md applies to the pillars, extended to a diagonal
// member. The arrowhead bracket is two plain axis-aligned rects (no corner
// cut needed -- every corner there is already 90deg, and ICONOGRAPHY.md only
// chamfers a corner where a cut is actually needed).
const CUT = { dx: 2.2, dy: Math.round(2.2 * PRIMARY_RATIO * 100) / 100 };
const BOX = chamferedRing(3, 6, 13, 13, 2, { tl: CUT, tr: CUT, br: CUT, bl: CUT });

// Diagonal shaft from inside the box out toward the arrowhead, half-thickness 1.
const SHAFT = 'M9.65,17.35 L17.65,9.35 L16.35,8.65 L8.35,16.65 Z';

export function ExternalLinkIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={BOX} fillRule="evenodd" />
      <path d={SHAFT} />
      <rect x={13} y={4} width={7} height={2} />
      <rect x={18} y={4} width={2} height={7} />
    </svg>
  );
}
