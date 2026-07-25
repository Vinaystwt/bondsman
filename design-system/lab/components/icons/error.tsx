import { chamferAll } from './geometry';
import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Error: a solid chamfered-corner badge (all four corners cut at the primary
// ~41.7deg pillar angle) with an X punched through it as two evenodd
// subpaths -- the same diagonal-parallelogram construction close.tsx uses
// for its standalone X, reused here as a cutout instead of a positive shape.
const BADGE = chamferAll(3, 3, 18, 18, 4);
const BAR_A = 'M7.29,8.71 L15.29,16.71 L16.71,15.29 L8.71,7.29 Z';
const BAR_B = 'M15.29,7.29 L7.29,15.29 L8.71,16.71 L16.71,8.71 Z';

export function ErrorIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={`${BADGE} ${BAR_A} ${BAR_B}`} fillRule="evenodd" />
    </svg>
  );
}
