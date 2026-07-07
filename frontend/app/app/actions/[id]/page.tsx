import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiError, api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Label, Panel } from '@/components/ui/Primitives';
import StatusBadge from '@/components/ui/StatusBadge';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import Lifecycle from '@/components/action/Lifecycle';
import BondCertificate from '@/components/action/BondCertificate';
import EventTimeline from '@/components/action/EventTimeline';
import ReasoningReveal from '@/components/action/ReasoningReveal';
import SlashSplit from '@/components/action/SlashSplit';
import { serial, truncateHash, formatWindowEnd, resolveDisplayStatus } from '@/lib/format';
import type { ActionDetail, Invoice } from '@/lib/types';

export const metadata: Metadata = { title: 'Action' };

const TX_LABELS: { key: string; label: string }[] = [
  { key: 'initiate', label: 'Initiate' },
  { key: 'approve', label: 'Approve' },
  { key: 'postBond', label: 'Post bond' },
  { key: 'execute', label: 'Execute' },
  { key: 'challenge', label: 'Challenge' },
  { key: 'resolve', label: 'Resolve' },
];

function challengerTypeLabel(type: string | null): string | null {
  if (type === 'watchdog') return 'Watchdog (deterministic)';
  if (type === 'manual') return 'Backend key (demo)';
  if (type === 'external-wallet') return 'External wallet';
  return null;
}

export default async function ActionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let result:
    | { data: ActionDetail; reachable: true }
    | { data: null; reachable: false };
  try {
    result = await safeGet(() => api.action(id));
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      return (
        <div className="space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/app/actions" className="hover:text-bone">
              Docket
            </Link>
            <span className="px-2">/</span>
            <span className="text-bone">{id}</span>
          </nav>
          <EmptyState
            title="Action not found"
            body="This action is not in the current controller projection. Open the docket to choose a live action."
            action={
              <Link
                href="/app/actions"
                className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
              >
                Open the docket
              </Link>
            }
          />
        </div>
      );
    }
    throw error;
  }
  if (!result.reachable) {
    return <BackendDown />;
  }
  const action = result.data;

  let invoice: Invoice | undefined;
  const invoicesResult = await safeGet(() => api.invoices());
  if (invoicesResult.reachable) {
    invoice = invoicesResult.data.find((i) => i.id === action.invoiceId);
  }

  const displayStatus = resolveDisplayStatus(action.status, action.windowEnd, action.challenger);
  const challengerLabel = challengerTypeLabel(action.challengerType);

  return (
    <article className="space-y-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/app/actions" className="hover:text-bone">
          Docket
        </Link>
        <span className="px-2">/</span>
        <span className="text-bone">{serial(action.actionId)}</span>
      </nav>

      <header className="flex flex-col gap-4 border-b border-rule pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Bonded action</Label>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            {serial(action.actionId)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {invoice ? (
              <>Invoice {invoice.invoiceNumber}, {invoice.debtor}</>
            ) : (
              <>Invoice {action.invoiceId}</>
            )}
          </p>
          {action.challenger && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="serial text-[0.62rem] text-muted">Challenger:</span>
              <CopyHash value={action.challenger} label={truncateHash(action.challenger)} />
              {challengerLabel && (
                <span className="rounded border border-rule bg-surface px-2 py-0.5 text-[0.62rem] text-muted">
                  {challengerLabel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={displayStatus} />
          <p className="font-mono text-2xl text-bone tabular">
            <Money atomic={action.amount} />
          </p>
        </div>
      </header>

      <section aria-label="Lifecycle">
        <Label>Lifecycle</Label>
        <div className="mt-5">
          <Lifecycle status={action.status} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <ReasoningReveal
            reasoning={action.reasoning}
            reasoningHash={action.reasoningHash}
          />
          <BondCertificate
            actionId={action.actionId}
            status={action.status}
            bondRequired={action.bondRequired}
            bondPosted={action.bondPosted}
          />
          <SlashSplit action={action} />

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
                    {href ? (
                      <CopyHash value={hash} href={href} label={truncateHash(hash)} />
                    ) : (
                      <span className="text-xs text-muted">Proof unavailable for this contract version</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="space-y-8">
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

          <Panel className="p-6">
            <Label>Challenge window</Label>
            <p className="mt-2 text-sm text-bone">{formatWindowEnd(action.windowEnd)}</p>
          </Panel>

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
