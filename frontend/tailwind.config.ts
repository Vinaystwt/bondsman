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
        // Green is the brand and the healthy state. Red only on a slash.
        ink: '#0B0F0D',
        surface: '#121815',
        raised: '#18211D',
        bone: '#E8EDEA',
        muted: '#828D88',
        accent: '#35C281',
        'accent-strong': '#46D08E',
        'accent-deep': '#1C7A52',
        slash: '#E5484D',
        rule: '#232A27',
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
