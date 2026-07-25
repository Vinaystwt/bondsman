import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Chevron: two straight bars meeting at a point, the same overlapping-
// parallelogram construction as checkmark.tsx, oriented as a caret. Used for
// expand ("down") / collapse ("up") disclosure controls; `direction` rotates
// the same geometry 180deg around the icon's own center rather than shipping
// two separate artworks.
const LEFT_ARM = 'M5.17,8.72 L11.17,15.72 L12.83,14.28 L6.83,7.28 Z';
const RIGHT_ARM = 'M12.83,15.72 L18.83,8.72 L17.17,7.28 L11.17,14.28 Z';

export interface ChevronIconProps extends IconProps {
  direction?: 'down' | 'up';
}

export function ChevronIcon({ size = DEFAULT_ICON_SIZE, title, direction = 'down', ...rest }: ChevronIconProps) {
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
      <g transform={direction === 'up' ? 'rotate(180 12 12)' : undefined}>
        <path d={`${LEFT_ARM} ${RIGHT_ARM}`} />
      </g>
    </svg>
  );
}
