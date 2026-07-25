import { BASE_RATIO, chamferAll, chamferedRing, PRIMARY_RATIO } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Wallet: the one icon (with clock.tsx and challenge.tsx) that deliberately
// mixes both of LOGO_READING.md's measured chamfer angles on a single shape,
// the same way the mark itself reserves the steeper 62.68deg cut for its
// base slabs and the shallower ~41.7deg cut for its pillars: the wallet's
// top corners (its "pillar" edge, where the flap opens) take the primary
// cut, and its bottom corners (its footing, where it sits closed) take the
// steeper base-slab cut. The clasp is a small solid chamfered square on the
// right edge (primary cut, since it is a body detail, not a footing).
const TOP_CUT = { dx: 2.6, dy: Math.round(2.6 * PRIMARY_RATIO * 100) / 100 };
const BOTTOM_CUT = { dx: 1.4, dy: Math.round(1.4 * BASE_RATIO * 100) / 100 };

const BODY = chamferedRing(2, 5, 20, 15, 2.2, {
  tl: TOP_CUT,
  tr: TOP_CUT,
  br: BOTTOM_CUT,
  bl: BOTTOM_CUT,
});
const CLASP = chamferAll(15.5, 10.8, 4, 4, 1);

export function WalletIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={BODY} fillRule="evenodd" />
      <rect x={2} y={9} width={20} height={1.6} />
      <path d={CLASP} />
    </svg>
  );
}
