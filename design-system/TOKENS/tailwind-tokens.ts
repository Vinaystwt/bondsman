// Maps design-system/TOKENS/tokens.css custom properties onto Tailwind's
// theme so component code can use `bg-surface`, `text-ink`, `p-5`, etc.
// instead of hardcoded values or raw `var(--…)` calls. Names here must stay
// in lockstep with tokens.css — this file does not choose values, it wires
// the CSS variables through.
//
// Deliberately untyped against `tailwindcss`'s own `Config` type here: this
// file lives outside design-system/lab/ (any future consumer besides the
// lab can import it too), and TypeScript/Node module resolution for a bare
// `tailwindcss` import walks up from *this file's* directory, not from
// whichever project imports it — so it cannot see lab's node_modules and a
// `tailwindcss` import here fails module resolution in `next build`. The
// consuming tailwind.config.ts (which really does sit inside lab, next to
// lab's own node_modules) imports the real `Config` type and spreads this
// object into `theme.extend` there, so the concrete Tailwind shape is still
// enforced at the point where it matters.
type ThemeExtend = Record<string, Record<string, string | string[]>>;

export const tokenTheme: { extend: ThemeExtend } = {
  extend: {
    colors: {
      surface: 'var(--surface)',
      'surface-raised': 'var(--surface-raised)',
      ink: 'var(--ink)',
      accent: 'var(--accent)',
      positive: 'var(--positive)',
      consequential: 'var(--consequential)',
      warning: 'var(--warning)',
      muted: 'var(--muted)',
      boundary: 'var(--boundary)',
      destructive: 'var(--destructive)',
    },
    spacing: {
      1: 'var(--space-1)',
      2: 'var(--space-2)',
      3: 'var(--space-3)',
      4: 'var(--space-4)',
      5: 'var(--space-5)',
      6: 'var(--space-6)',
      7: 'var(--space-7)',
      8: 'var(--space-8)',
      9: 'var(--space-9)',
    },
    fontSize: {
      display: 'var(--font-size-display)',
      headline: 'var(--font-size-headline)',
      subhead: 'var(--font-size-subhead)',
      body: 'var(--font-size-body)',
      data: 'var(--font-size-data)',
      mono: 'var(--font-size-mono)',
    },
    fontFamily: {
      sans: ['var(--font-sans)'],
      mono: ['var(--font-mono)'],
    },
    borderRadius: {
      none: '0px',
      sm: 'var(--radius)',
      DEFAULT: 'var(--radius)',
      md: 'var(--radius)',
      lg: 'var(--radius)',
      xl: 'var(--radius)',
      '2xl': 'var(--radius)',
      '3xl': 'var(--radius)',
      full: 'var(--radius)',
    },
    transitionDuration: {
      short: 'var(--duration-short)',
      medium: 'var(--duration-medium)',
      long: 'var(--duration-long)',
    },
    transitionTimingFunction: {
      standard: 'var(--ease-standard)',
      emphasized: 'var(--ease-emphasized)',
    },
  },
};
