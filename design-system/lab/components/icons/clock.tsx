import { BASE_RATIO, chamferedRing, PRIMARY_RATIO } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Clock / countdown: a chamfered square face standing in for the
// conventional circular clock face -- this system has zero curve commands
// anywhere (LOGO_READING.md), so a countdown reads through rectilinear hands
// on a chamfered frame rather than a dial. Like wallet.tsx, the frame mixes
// both measured chamfer angles: the top corners take the primary ~41.7deg
// pillar cut, and the bottom corners take the steeper 62.68deg base-slab
// cut, giving the face a "standing" footing rather than a floating square.
// The hour hand is a diagonal parallelogram built the same way as
// external-link.tsx's shaft; the minute hand and center hub are plain rects.
const TOP_CUT = { dx: 2.4, dy: Math.round(2.4 * PRIMARY_RATIO * 100) / 100 };
const BOTTOM_CUT = { dx: 1.3, dy: Math.round(1.3 * BASE_RATIO * 100) / 100 };

const FACE = chamferedRing(3, 3, 18, 18, 2, {
  tl: TOP_CUT,
  tr: TOP_CUT,
  br: BOTTOM_CUT,
  bl: BOTTOM_CUT,
});
const HOUR_HAND = 'M12.46,12.77 L17.46,9.77 L16.54,8.23 L11.54,11.23 Z';

export function ClockIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={FACE} fillRule="evenodd" />
      <rect x={11} y={6.5} width={2} height={5.5} />
      <path d={HOUR_HAND} />
      <rect x={11} y={11} width={2} height={2} />
    </svg>
  );
}
