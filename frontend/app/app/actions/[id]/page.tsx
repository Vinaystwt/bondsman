import Link from 'next/link';
import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import { Label, Panel } from '@/components/ui/Primitives';
import StatusBadge from '@/components/ui/StatusBadge';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import Lifecycle from '@/components/action/Lifecycle';
import BondCertificate from '@/components/action/BondCertificate';
import EventTimeline from '@/components/action/EventTimeline';
import ReasoningPanel from '@/components/action/ReasoningPanel';
import { serial, truncateHash, formatWindowEnd } from '@/lib/format';
import type { Invoice } from '@/lib/types';

export const metadata: Metadata = { title: 'Action' };

const TX_LABELS: { key: string; label: string }[] = [
  { key: 'initiate', label: 'Initiate' },
  { key: 'approve', label: 'Approve' },
  { key: 'postBond', label: 'Post bond' },
  { key: 'execute', label: 'Execute' },
  { key: 'challenge', label: 'Challenge' },
  { key: 'resolve', label: 'Resolve' },
];

export default async function ActionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await safeGet(() => api.action(id));
  if (!result.reachable) {
    return <BackendDown />;
  }
  const action = result.data;

  // Pull the invoice for context. A failure here is non-fatal.
  let invoice: Invoice | undefined;
  const invoicesResult = await safeGet(() => api.invoices());
  if (invoicesResult.reachable) {
    invoice = invoicesResult.data.find((i) => i.id === action.invoiceId);
  }

  return (
    <article className="space-y-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/app" className="hover:text-bone">
          Overview
        </Link>
        <span className="px-2">/</span>
        <span className="text-bone">{serial(action.actionId)}</span>
      </nav>

      {/* Header band */}
      <header className="flex flex-col gap-4 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Bonded action</Label>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            {serial(action.actionId)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {invoice ? (
              <>
                Invoice {invoice.invoiceNumber}, {invoice.debtor}
              </>
            ) : (
              <>Invoice {action.invoiceId}</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={action.status} />
          <p className="font-mono text-2xl text-bone tabular">
            <Money atomic={action.amount} />
          </p>
        </div>
      </header>

      {/* Lifecycle */}
      <section aria-label="Lifecycle">
        <Label>Lifecycle</Label>
        <div className="mt-5">
          <Lifecycle status={action.status} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <ReasoningPanel
            reasoning={action.reasoning}
            reasoningHash={action.reasoningHash}
          />
          <BondCertificate
            actionId={action.actionId}
            status={action.status}
            bondRequired={action.bondRequired}
            bondPosted={action.bondPosted}
          />

          {/* Lifecycle transactions */}
          <Panel className="p-6">
            <Label>On-chain transactions</Label>
            <ul className="mt-4 divide-y divide-rule">
              {TX_LABELS.map(({ key, label }) => {
                const hash = (action.transactions as Record<string, string>)[key];
                if (!hash) return null;
                const href = action.explorerLinks[key as keyof typeof action.explorerLinks];
                return (
                  <li key={key} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-sm text-muted">{label}</span>
                    <CopyHash value={hash} href={href} label={truncateHash(hash)} />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="space-y-8">
          {/* Invoice */}
          <Panel className="p-6">
            <Label>Invoice</Label>
            {invoice ? (
              <dl className="mt-4 space-y-3 text-sm">
                <Row term="Number" desc={invoice.invoiceNumber} />
                <Row term="Debtor" desc={invoice.debtor} />
                <Row term="Amount" desc={<Money atomic={invoice.amount} />} />
                <Row term="Delivered" desc={invoice.delivered ? 'Yes' : 'No'} />
                <Row term="Due" desc={invoice.dueDate} />
                <Row
                  term="Vendor"
                  desc={<CopyHash value={invoice.vendor} label={truncateHash(invoice.vendor)} />}
                />
                <Row
                  term="Claim hash"
                  desc={<CopyHash value={invoice.claimHash} label={truncateHash(invoice.claimHash)} />}
                />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Invoice {action.invoiceId} details are not available.
              </p>
            )}
          </Panel>

          {/* Window */}
          <Panel className="p-6">
            <Label>Challenge window</Label>
            <p className="mt-2 text-sm text-bone">{formatWindowEnd(action.windowEnd)}</p>
            {action.challenger && (
              <div className="mt-3">
                <Label>Challenger</Label>
                <div className="mt-1">
                  <CopyHash value={action.challenger} label={truncateHash(action.challenger)} />
                </div>
              </div>
            )}
          </Panel>

          {/* Events */}
          <Panel className="p-6">
            <Label>On-chain events</Label>
            <div className="mt-5">
              <EventTimeline events={action.events} />
            </div>
          </Panel>
        </div>
      </div>
    </article>
  );
}

function Row({ term, desc }: { term: string; desc: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{term}</dt>
      <dd className="text-right text-bone">{desc}</dd>
    </div>
  );
}
