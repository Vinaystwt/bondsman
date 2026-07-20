import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import RecentActions from '@/components/app/RecentActions';
import { BackendDown } from '@/components/ui/States';
import {
  Container,
  Label,
  PanelGrid,
  SectionHeader,
  StatusPill,
} from '@/components/ui/Primitives';
import { formatMoney, serial } from '@/lib/format';

export const metadata = {
  title: 'App',
  description:
    'Create and monitor bonded actions through the live Bondsman execution flow.',
};

export const revalidate = 20;

export default async function AppHome() {
  const [healthRes, actionsRes] = await Promise.all([
    safeGet(() => api.health()),
    safeGet(() => api.actions()),
  ]);

  if (!healthRes.reachable) {
    return (
      <Container className="py-16">
        <BackendDown />
      </Container>
    );
  }

  const actions = actionsRes.reachable ? actionsRes.data.slice(-5).reverse() : [];
  const h = healthRes.data as unknown as {
    ok?: boolean;
    watchdog?: { running?: boolean };
    publicExperience?: {
      canonicalActionId?: number;
      liveQuoteProbeAvailable?: boolean;
    };
  };

  return (
    <Container className="space-y-12 py-14 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <SectionHeader
          eyebrow="Operational app"
          title="Create a bonded action"
          lede="Start with an intended action, price the minimum bond, connect a payer only when payment is required, then monitor the live action and receipt."
        />
        <div className="rounded-md border border-rule bg-surface p-5">
          <Label>LIVE STATUS</Label>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone={h.ok ? 'ok' : 'warn'}>
              {h.ok ? 'Backend ready' : 'Backend degraded'}
            </StatusPill>
            <StatusPill tone={h.watchdog?.running ? 'ok' : 'warn'}>
              {h.watchdog?.running ? 'Watchdog running' : 'Watchdog paused'}
            </StatusPill>
            <StatusPill tone={h.publicExperience?.liveQuoteProbeAvailable ? 'ok' : 'warn'}>
              {h.publicExperience?.liveQuoteProbeAvailable ? 'Quote surface ready' : 'Quote surface unavailable'}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/app/new"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
        >
          Create bonded action
        </Link>
        <Link
          href={`/proof/${h.publicExperience?.canonicalActionId ?? 27}`}
          className="rounded-md border border-rule px-5 py-2.5 text-sm text-bone transition-colors hover:border-accent/50"
        >
          Replay a real slash
        </Link>
      </div>

      <PanelGrid cols={2} gap="lg">
        <section>
          <div className="mb-4">
            <Label>This browser</Label>
            <h2 className="mt-2 text-xl font-semibold text-bone">
              Recent action IDs
            </h2>
            <p className="mt-2 text-sm text-muted">
              Saved locally for convenience only. This does not prove ownership.
            </p>
          </div>
          <RecentActions />
        </section>

        <section>
          <div className="mb-4">
            <Label>Public projection</Label>
            <h2 className="mt-2 text-xl font-semibold text-bone">
              Latest actions
            </h2>
            <p className="mt-2 text-sm text-muted">
              Public backend records. Ownership is not inferred from this list.
            </p>
          </div>
          <ul className="grid gap-3">
            {actions.map((action) => (
              <li key={action.actionId}>
                <Link
                  href={`/app/actions/${action.actionId}`}
                  className="grid gap-2 rounded-md border border-rule bg-surface px-4 py-3 text-sm transition-colors hover:border-accent/50 sm:grid-cols-[1fr_auto]"
                >
                  <span className="text-bone">
                    {serial(action.actionId)} · {action.status}
                  </span>
                  <span className="font-mono text-muted">
                    {formatMoney(action.bondPosted)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </PanelGrid>
    </Container>
  );
}
