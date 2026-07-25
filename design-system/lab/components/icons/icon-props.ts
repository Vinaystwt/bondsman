import type { SVGProps } from 'react';

// Shared prop contract for every icon in this directory (ICONOGRAPHY.md
// "Component contract"). `size` sets both width and height off a single
// 24-unit viewBox so an icon never distorts at 16/24/32px -- there is no
// separate artwork per size. `currentColor` is the only fill color used
// anywhere in this directory: no icon hardcodes `--accent` or any other
// token: color is always inherited from the surrounding text color
// (`text-ink`, `text-muted`, `text-destructive`, etc.), per PRINCIPLES.md's
// "slash-only accent" rule.
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'width' | 'height' | 'fill'> {
  size?: number;
  title?: string;
}

export const DEFAULT_ICON_SIZE = 24;
