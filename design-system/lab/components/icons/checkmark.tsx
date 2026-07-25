import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Checkmark: two straight-edged bars (parallelograms) overlapping at the
// joint, forming a single continuous "V" ribbon. Built the same way as
// close.tsx's X and error.tsx's cutout X -- straight-line polygons only, end
// caps cut perpendicular to each bar's own run rather than squared-off or
// rounded, echoing the mark's "every terminal is cut, never rounded" rule.
const SHORT_ARM = 'M4.15,12.85 L9.15,17.85 L10.85,16.15 L5.85,11.15 Z';
const LONG_ARM = 'M8.85,16.85 L19.85,5.85 L18.15,4.15 L7.15,15.15 Z';

export function CheckmarkIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={`${SHORT_ARM} ${LONG_ARM}`} />
    </svg>
  );
}
