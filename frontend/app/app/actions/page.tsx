import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import PageHeader from '@/components/app/PageHeader';
import DocketList from '@/components/docket/DocketList';

export const metadata: Metadata = { title: 'Action Docket' };

export default async function DocketPage() {
  const result = await safeGet(() => api.actions());
  if (!result.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Action Docket" />
        <BackendDown />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        label="Product"
        title="Action Docket"
        intro="Every bonded action, from intent to resolution. Filter by status. Every row opens the on-chain proof."
      />
      <DocketList actions={result.data} />
    </div>
  );
}
