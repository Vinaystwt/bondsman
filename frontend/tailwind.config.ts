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
        // Copper is the bonded state. Red appears only on a slash.
        ink: '#0E0D0B',
        surface: '#16140F',
        raised: '#1C1913',
        bone: '#ECE6D8',
        muted: '#8C8473',
        accent: '#B7791F',
        'accent-strong': '#D0922A',
        'accent-deep': '#6E4814',
        slash: '#E0231C',
        rule: '#2A2620',
      },
      fontFamily: {
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      letterSpacing: {
        serial: '0.16em',
      },
      maxWidth: {
        prose: '64ch',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
