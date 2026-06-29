import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0E0D0B',
        surface: '#16140F',
        // one step up from surface, for raised cards
        raised: '#1C1A14',
        bone: '#ECE6D8',
        muted: '#8C8473',
        copper: '#B7791F',
        sage: '#5A7D6F',
        void: '#E0231C',
        rule: '#2A2620',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // restrained, consistent radius system
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
      letterSpacing: {
        serial: '0.18em',
      },
      maxWidth: {
        prose: '68ch',
      },
      keyframes: {
        'seal-press': {
          '0%': { transform: 'scale(1.35) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'scale(0.94) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'rule-draw': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'seal-press': 'seal-press 480ms cubic-bezier(0.16, 1, 0.3, 1)',
        'rule-draw': 'rule-draw 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
