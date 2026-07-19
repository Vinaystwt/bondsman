import type { Metadata } from 'next';
import './globals.css';
import { fontVariables } from '@/lib/fonts';
import { WalletProvider } from '@/lib/wallet';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'Bondsman · No bond, no action',
    template: '%s · Bondsman',
  },
  description:
    'Bondsman is bonded execution infrastructure for autonomous finance. Verified faults slash the bond, reward the watchdog and create a portable proof.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-ink font-sans text-bone antialiased">
        <WalletProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-ink"
          >
            Skip to content
          </a>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
