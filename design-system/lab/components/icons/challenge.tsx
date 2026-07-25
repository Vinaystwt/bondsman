import { BASE_RATIO, chamferedRect, PRIMARY_RATIO } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Challenge / watchdog: a solid shield badge, the third icon (with
// wallet.tsx and clock.tsx) that mixes both measured chamfer angles on one
// shape -- primary ~41.7deg on the top (structural) corners, steeper
// 62.68deg base-slab cut on the bottom (footing) corners, so the shield
// reads as planted rather than floating. A rectangular "eye" slit is punched
// through the solid fill (evenodd, same technique as error.tsx/warning.tsx)
// with a short brow bar above it, standing in for the watchdog's single
// watching eye rather than an organic face.
const TOP_CUT = { dx: 2.4, dy: Math.round(2.4 * PRIMARY_RATIO * 100) / 100 };
const BOTTOM_CUT = { dx: 3, dy: Math.round(3 * BASE_RATIO * 100) / 100 };

const SHIELD = chamferedRect(4, 3, 16, 18, {
  tl: TOP_CUT,
  tr: TOP_CUT,
  br: BOTTOM_CUT,
  bl: BOTTOM_CUT,
});
const EYE = 'M9,11 L15,11 L15,14 L9,14 Z';
const BROW = 'M9,9 L15,9 L15,10.4 L9,10.4 Z';

export function ChallengeIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={`${SHIELD} ${EYE} ${BROW}`} fillRule="evenodd" />
    </svg>
  );
}
