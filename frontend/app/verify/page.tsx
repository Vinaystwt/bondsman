import { Suspense } from 'react';
import { Container, SectionHeader } from '@/components/ui/Primitives';
import ReceiptVerifier from '@/components/verify/ReceiptVerifier';
import { SkeletonPanel } from '@/components/ui/States';

export const metadata = {
  title: 'Verify Receipt',
  description: 'Paste or load a Bondsman portable receipt and verify its signature.',
};

export default function VerifyPage() {
  return (
    <Container className="space-y-10 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Receipt verifier"
        title="Verify a portable Bondsman receipt"
        lede="Paste a receipt JSON body or open this page from an action monitor. Any changed signed field should fail verification."
      />
      <Suspense fallback={<SkeletonPanel rows={6} />}>
        <ReceiptVerifier />
      </Suspense>
    </Container>
  );
}
