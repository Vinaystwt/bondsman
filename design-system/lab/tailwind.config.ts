import type { Config } from 'tailwindcss';
import { tokenTheme } from '../TOKENS/tailwind-tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { ...tokenTheme?.extend } },
  plugins: [],
};

export default config;
