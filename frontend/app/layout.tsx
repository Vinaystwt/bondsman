import type { Metadata, Viewport } from 'next';
import './globals.css';
import { fontVariables } from '@/lib/fonts';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://bondsman.vercel.app'),
  title: {
    default: 'Bondsman · Bonded execution assurance for autonomous finance',
    template: '%s · Bondsman',
  },
  description:
    'Bondsman requires economic collateral before an autonomous financial action, then settles objective failure on Casper. Live x402 settlement, deterministic policy and portable signed receipts.',
  applicationName: 'Bondsman',
  openGraph: {
    type: 'website',
    siteName: 'Bondsman',
    title: 'Bondsman · Bonded execution assurance',
    description:
      'Make the agent answerable before it acts. Live x402 settlement, deterministic bond policy, Casper testnet contracts and portable signed receipts.',
    url: 'https://bondsman.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bondsman · Bonded execution assurance',
    description:
      'Post the bond before the action. Prove the outcome after it. Autonomous finance under economic accountability.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F0D',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-ink font-sans text-bone antialiased">
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
