import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import { Container, Label, SectionHeader } from '@/components/ui/Primitives';
import CanonicalSummary from '@/components/proof/CanonicalSummary';
import {
  PaymentPanel,
  PaidQuotePanel,
  DeliveryContradictionPanel,
  EconomicPanel,
} from '@/components/proof/PanelGrid';
import ReceiptPanel from '@/components/proof/ReceiptPanel';
import WhatIsReal from '@/components/proof/WhatIsReal';

export const metadata: Metadata = {
  title: 'Proof Console',
  description:
    'Verify a complete bonded agent action. Live x402 probe, canonical Action 27 replay, quote single use test, receipt verification and tamper lab.',
};

export const revalidate = 30;

export default async function ProofConsolePage() {
  const canonicalRes = await safeGet(() => api.canonicalProof());

  if (!canonicalRes.reachable) {
    return (
      <Container className="py-16">
        <BackendDown />
      </Container>
    );
  }

  const canonical = canonicalRes.data;
  const actionId = canonical.actionId;

  const [receiptRes, verifyRes] = await Promise.all([
    safeGet(() => api.receipt(actionId)),
    safeGet(() => api.receiptVerify(actionId)),
  ]);

  const receipt = receiptRes.reachable ? receiptRes.data : null;
  const verification = verifyRes.reachable ? verifyRes.data : null;

  return (
    <Container className="space-y-16 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Proof Console"
        title={`Verify a complete bonded agent action`}
        lede="Live x402 probe, canonical Action 27 replay, quote single use protection and receipt verification. Every hash opens on the Casper testnet explorer."
      />

      <CanonicalSummary
        proof={canonical}
        receiptValid={verification?.valid ?? null}
      />

      <section>
        <Label>Canonical evidence</Label>
        <h2 className="mt-2 text-2xl font-semibold text-bone">
          Action No. {actionId.padStart(4, '0')}, from payment to portable receipt
        </h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PaymentPanel payment={canonical.payment} />
          <PaidQuotePanel
            quote={canonical.paidQuote}
            consumedActionId={actionId}
          />
          <DeliveryContradictionPanel proof={canonical} />
          <EconomicPanel proof={canonical} />
        </div>
      </section>

      <ReceiptPanel
        receipt={receipt}
        verification={verification}
        actionId={actionId}
      />

      <WhatIsReal />
    </Container>
  );
}
