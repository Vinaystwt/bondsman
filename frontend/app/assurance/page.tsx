import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api, safeGet } from '@/lib/api';
import {
  Container,
  Label,
  SectionHeader,
  StatusPill,
} from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import StudioClient from '@/components/assurance/StudioClient';

export const metadata: Metadata = {
  title: 'Assurance Studio',
  description:
    'Design accountability for your own agent action. Bondsman interprets the risk, prices the minimum bond and produces a signed integration manifest.',
};

export const revalidate = 60;

export default async function AssurancePage() {
  const [templatesRes, capsRes, healthRes] = await Promise.all([
    safeGet(() => api.assuranceTemplates()),
    safeGet(() => api.publicCapabilities()),
    safeGet(() =>
      api.health() as unknown as Promise<{
        publicExperience?: { assuranceModelAvailable?: boolean };
      }>,
    ),
  ]);

  if (!templatesRes.reachable || !templatesRes.data) {
    return (
      <Container className="py-16">
        <BackendDown />
      </Container>
    );
  }

  const templates = templatesRes.data.templates;
  const caps = capsRes.reachable ? capsRes.data : null;
  const modelAvailable = Boolean(
    healthRes.reachable
      ? healthRes.data.publicExperience?.assuranceModelAvailable
      : (caps?.assuranceStudio.liveModelAvailable ?? false),
  );

  return (
    <Container className="space-y-12 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Assurance Studio"
        title="Design accountability for your agent"
        lede="Describe the action. Bondsman interprets the risk, prices the minimum bond and produces a signed integration manifest."
      />

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <StatusPill tone="info">DESIGN ONLY</StatusPill>
        <StatusPill tone={modelAvailable ? 'ok' : 'warn'}>
          {modelAvailable ? 'LIVE MODEL AVAILABLE' : 'DETERMINISTIC FALLBACK'}
        </StatusPill>
        <span className="text-muted">
          The AI interprets. The deterministic policy prices. The watchdog and
          contracts enforce.
        </span>
      </div>

      <Suspense fallback={<StudioLoading />}>
        <StudioClient templates={templates} liveModelAvailable={modelAvailable} />
      </Suspense>
    </Container>
  );
}

function StudioLoading() {
  return (
    <div className="rounded-md border border-dashed border-rule bg-surface/40 p-6 text-sm text-muted">
      <Label>Loading</Label>
      <p className="mt-2">Preparing the assurance studio…</p>
    </div>
  );
}
