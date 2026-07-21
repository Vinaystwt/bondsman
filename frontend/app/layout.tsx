import type { Metadata, Viewport } from 'next';
import './globals.css';
import { fontVariables } from '@/lib/fonts';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://bondsman.vercel.app'),
  title: {
    default: 'Bondsman · Bonded execution on Casper',
    template: '%s · Bondsman',
  },
  description:
    'Before an agent moves money, Bondsman prices the action, binds the paid quote to its payer and locks collateral on Casper.',
  applicationName: 'Bondsman',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Bondsman',
    title: 'Bondsman · Bonded execution on Casper',
    description:
      'Before an agent moves money, make it post the bond. Create bonded actions and replay a real slash.',
    url: 'https://bondsman.vercel.app',
    images: [
      {
        url: '/brand/og.png',
        width: 1200,
        height: 630,
        alt: 'Bondsman · Bonded execution on Casper',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bondsman · Bonded execution on Casper',
    description:
      'Post the bond before the action. Prove the outcome after it. Autonomous finance under economic accountability.',
    images: ['/brand/twitter.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0D0B',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body
        className="min-h-screen bg-ink font-sans text-bone antialiased"
        suppressHydrationWarning
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
