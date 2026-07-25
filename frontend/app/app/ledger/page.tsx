import type { Metadata } from 'next';
import PageHeader from '@/components/app/PageHeader';
import LedgerClient from '@/components/ledger/LedgerClient';

export const metadata: Metadata = { title: 'My Ledger' };

export default function LedgerPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="My Ledger"
        intro="Your record as a challenger. Every challenge you sign, every reward you claim, derived from on-chain data filtered by your account."
      />
      <LedgerClient />
    </div>
  );
}
