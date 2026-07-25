import { chamferedRing, PRIMARY_RATIO } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Info: a hollow chamfered-corner frame (all four corners primary-cut, same
// technique as copy.tsx/external-link.tsx) with a solid dot-over-bar glyph
// ("i") sitting inside it. The dot and bar are plain axis-aligned rects --
// no corner cut applied, matching ICONOGRAPHY.md's rule that a chamfer only
// appears where a corner-cut is actually needed.
const CUT = { dx: 3, dy: Math.round(3 * PRIMARY_RATIO * 100) / 100 };
const FRAME = chamferedRing(3, 3, 18, 18, 2.2, { tl: CUT, tr: CUT, br: CUT, bl: CUT });

export function InfoIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={FRAME} fillRule="evenodd" />
      <rect x={11} y={7} width={2} height={2} />
      <rect x={11} y={11} width={2} height={7} />
    </svg>
  );
}
