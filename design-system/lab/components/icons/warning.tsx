import { chamferedIsoTriangle } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Warning: a solid triangle with every vertex cut rather than left as a
// sharp organic tip -- even a triangle's apex follows the mark's "no point
// is left un-cut" construction. Built via chamferedIsoTriangle (geometry.ts)
// instead of hand-typed coordinates: the two base corners are the
// triangle's "footing" (like wallet.tsx's bottom edge and clock.tsx's
// stand), so they take the steeper base-slab cut, provably 62.68deg from
// horizontal by construction. The apex is a symmetric flat truncation --
// a *symmetric* cut across a point flanked by two mirrored slanted edges is
// necessarily horizontal, so it can't itself land on the 41.7/62.68 family
// without tilting the tip off-center; it's a plain flat cut, not a claimed
// chamfer angle. The exclamation mark is punched through the solid fill as
// two additional evenodd subpaths (a bar + a dot), the same technique
// error.tsx and info.tsx use for their glyphs.
const TRIANGLE = chamferedIsoTriangle([12, 3], 20, 9, 1.77, 2.2);
const BAR = 'M11,9 L13,9 L13,16 L11,16 Z';
const DOT = 'M11,17.6 L13,17.6 L13,19.6 L11,19.6 Z';

export function WarningIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={`${TRIANGLE} ${BAR} ${DOT}`} fillRule="evenodd" />
    </svg>
  );
}
