import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import { Label, Panel } from '@/components/ui/Primitives';
import Money from '@/components/ui/Money';
import MoneyCountUp from '@/components/ui/MoneyCountUp';
import CountUp from '@/components/ui/CountUp';
import CopyHash from '@/components/ui/CopyHash';
import {
  serial,
  truncateHash,
  txExplorer,
  accountExplorer,
  contractExplorer,
} from '@/lib/format';
import type { ActionSummary } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Proof Center',
  description:
    'Every completed slash and refund Bondsman has settled on Casper testnet, with amounts, splits, challengers, and explorer links.',
};

function half(atomic: string): string {
  try {
    return (BigInt(atomic) / 2n).toString();
  } catch {
    return '0';
  }
}

function challengerLabel(type: string | null): string {
  if (type === 'watchdog') return 'Watchdog (deterministic)';
  if (type === 'manual') return 'Demo key';
  if (type === 'external-wallet') return 'External wallet';
  return 'Challenger';
}

export default async function ProofCenterPage() {
  const [actionsRes, deploymentsRes, reserveRes] = await Promise.all([
    safeGet(() => api.actions()),
    safeGet(() => api.deployments()),
    safeGet(() => api.reserve()),
  ]);

  if (!actionsRes.reachable) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <BackendDown />
      </div>
    );
  }

  const actions = actionsRes.data;
  const deployments = deploymentsRes.reachable ? deploymentsRes.data : null;
  const reserve = reserveRes.reachable ? reserveRes.data : null;

  const slashes = actions
    .filter((a) => a.status === 'ResolvedSlash')
    .sort((a, b) => b.actionId - a.actionId);
  const refunds = actions
    .filter((a) => a.status === 'ResolvedRefund')
    .sort((a, b) => b.actionId - a.actionId);

  const totalSlashedBonds = slashes
    .reduce((acc, a) => acc + BigInt(a.bondPosted || '0'), 0n)
    .toString();

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Proof Center</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          The whole product, proven on chain
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Every settlement below is a real Casper testnet transaction. Open any
          link and read the same numbers on the public explorer.
        </p>
      </header>

      <section aria-label="Protocol totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bonds slashed" tone="slash">
          <CountUp value={slashes.length} />
        </StatCard>
        <StatCard label="Clean refunds" tone="accent">
          <CountUp value={refunds.length} />
        </StatCard>
        <StatCard label="Slashed value" tone="slash">
          <MoneyCountUp atomic={totalSlashedBonds} />
        </StatCard>
        <StatCard label="Reserve balance" tone="accent">
          {reserve ? <MoneyCountUp atomic={reserve.balance} /> : '0'}
        </StatCard>
      </section>

      {deployments && (
        <section aria-label="Contracts" className="space-y-4">
          <div>
            <Label>The four contracts</Label>
            <p className="mt-1 text-sm text-muted">
              Deployed once, verified on the explorer, unchanged since.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(deployments.contracts).map(([name, entry]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-4 rounded-md border border-rule bg-surface px-4 py-3"
              >
                <span className="serial text-[0.62rem] text-muted">{name}</span>
                <CopyHash
                  value={entry.contractHash}
                  href={contractExplorer(entry.contractHash)}
                  label={truncateHash(entry.contractHash)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Completed slashes" className="space-y-4">
        <div>
          <Label>Every slash, settled</Label>
          <p className="mt-1 text-sm text-muted">
            The bond split fifty to the challenger, fifty to the reserve, by
            the contract, with no human in the path.
          </p>
        </div>
        {slashes.length === 0 ? (
          <p className="rounded-md border border-rule bg-surface px-5 py-4 text-sm text-muted">
            No slashes settled yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {slashes.map((a) => (
              <SlashRow key={a.actionId} action={a} />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Clean refunds" className="space-y-4">
        <div>
          <Label>Clean actions, refunded in full</Label>
          <p className="mt-1 text-sm text-muted">
            Bonds that survived their challenge window and returned to the
            agent. Accountability cuts both ways.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {refunds.slice(0, 12).map((a) => (
            <li key={a.actionId}>
              <Link
                href={`/app/actions/${a.actionId}`}
                className="flex items-center justify-between gap-3 rounded-md border border-rule bg-surface px-4 py-3 transition-colors hover:border-accent/40"
              >
                <span className="serial text-[0.62rem] text-muted">{serial(a.actionId)}</span>
                <span className="font-mono text-sm text-accent tabular">
                  <Money atomic={a.bondPosted} bare /> returned
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {refunds.length > 12 && (
          <p className="text-xs text-muted">
            {refunds.length - 12} more in the{' '}
            <Link href="/app/actions" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
              Action Docket
            </Link>
            .
          </p>
        )}
      </section>

      <section aria-label="Next" className="rounded-md border border-rule bg-surface p-6">
        <Label>See it live</Label>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/app/arena" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Run a live challenge in the Arena
          </Link>
          <Link href="/two-agents" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Watch the two-agent economy
          </Link>
          <Link href="/app/actions" className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent">
            Browse the full Docket
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  tone,
  children,
}: {
  label: string;
  tone: 'accent' | 'slash';
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface px-5 py-4">
      <Label>{label}</Label>
      <p className={`mt-2 font-mono text-2xl tabular ${tone === 'slash' ? 'text-slash' : 'text-accent'}`}>
        {children}
      </p>
    </div>
  );
}

function SlashRow({ action }: { action: ActionSummary }) {
  const share = half(action.bondPosted);
  return (
    <li className="rounded-md border border-slash/20 bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <Link
            href={`/app/actions/${action.actionId}`}
            className="serial text-[0.62rem] text-muted transition-colors hover:text-accent"
          >
            {serial(action.actionId)}
          </Link>
          <span className="font-mono text-sm text-slash tabular">
            <Money atomic={action.bondPosted} bare />
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            split <Money atomic={share} bare /> / <Money atomic={share} bare />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {action.challenger && (
            <span className="flex items-center gap-1.5 text-muted">
              {challengerLabel(action.challengerType)}
              <CopyHash
                value={action.challenger}
                href={accountExplorer(action.challenger)}
                label={truncateHash(action.challenger)}
              />
            </span>
          )}
          {action.transactions.challenge && (
            <a
              href={txExplorer(action.transactions.challenge)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-accent underline decoration-rule underline-offset-2 hover:decoration-accent"
            >
              challenge
            </a>
          )}
          {action.transactions.resolve && (
            <a
              href={txExplorer(action.transactions.resolve)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-accent underline decoration-rule underline-offset-2 hover:decoration-accent"
            >
              resolve
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
