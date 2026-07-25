import { DEFAULT_ICON_SIZE, IconProps } from './icon-props';

// Close: an X built from two straight diagonal bars, the same
// parallelogram-with-perpendicular-cut-ends technique used everywhere else
// in this directory (checkmark's V, chevron's caret, external-link's shaft).
// No corner is rounded; the bar ends are cut straight across, perpendicular
// to the bar's own run.
const BAR_A = 'M5.15,6.85 L17.15,18.85 L18.85,17.15 L6.85,5.15 Z';
const BAR_B = 'M17.15,5.15 L5.15,17.15 L6.85,18.85 L18.85,6.85 Z';

export function CloseIcon({ size = DEFAULT_ICON_SIZE, title, ...rest }: IconProps) {
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
      <path d={`${BAR_A} ${BAR_B}`} />
    </svg>
  );
}
