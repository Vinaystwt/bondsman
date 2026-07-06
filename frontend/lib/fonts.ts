import { Geist, Geist_Mono } from 'next/font/google';

// A clean, modern product face. Text renders immediately with display swap and
// a real system fallback, so nothing above the fold waits on a font load.
export const sans = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

// Numbers, hashes, and addresses are the hero data of a financial instrument.
export const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
});

export const fontVariables = `${sans.variable} ${mono.variable}`;
