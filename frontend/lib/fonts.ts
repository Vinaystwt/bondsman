import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';

// Display: engraved, high-contrast serif. Reads like an embossed certificate.
export const display = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  axes: ['opsz', 'SOFT'],
  variable: '--font-display',
  display: 'swap',
});

// Body: humanist grotesque, warm and legible, not the SaaS default.
export const sans = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

// Figures, hashes, addresses: a typewriter-lineage mono. Numbers are the hero.
export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const fontVariables = `${display.variable} ${sans.variable} ${mono.variable}`;
