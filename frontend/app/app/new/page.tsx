import { Suspense } from 'react';
import { api, safeGet } from '@/lib/api';
import NewActionClient from '@/components/app/NewActionClient';
import { BackendDown, SkeletonPanel } from '@/components/ui/States';
import { Container, SectionHeader } from '@/components/ui/Primitives';

export const metadata = {
  title: 'Create Bonded Action',
  description:
    'Create a live Bondsman bonded action through policy, payment, payer authorization and action monitoring.',
};

export const revalidate = 20;

export default async function NewActionPage() {
  const [templatesRes, healthRes] = await Promise.all([
    safeGet(() => api.assuranceTemplates()),
    safeGet(() => api.health()),
  ]);

  if (!templatesRes.reachable || !healthRes.reachable) {
    return (
      <Container className="py-16">
        <BackendDown />
      </Container>
    );
  }

  const capabilities = healthRes.data.publicExperience;

  return (
    <Container className="space-y-12 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Create bonded action"
        title="Policy first. Wallet only when execution begins."
        lede="Choose the delayed evidence policy, describe the intended action, calculate the deterministic minimum bond and request live payment terms before wallet settlement."
      />
      <Suspense fallback={<SkeletonPanel rows={8} />}>
        <NewActionClient
          templates={templatesRes.data.templates}
          liveModelAvailable={capabilities.assuranceModelAvailable}
          liveQuoteProbeAvailable={capabilities.liveQuoteProbeAvailable}
        />
      </Suspense>
    </Container>
  );
}
