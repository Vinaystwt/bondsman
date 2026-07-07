import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { Label, Panel } from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import TwoAgentsClient from '@/components/two-agents/TwoAgentsClient';
import { serial, truncateHash, txExplorer, accountExplorer } from '@/lib/format';

export const metadata: Metadata = {
  title: 'The two-agent economy',
  description: 'One model-driven approver, one deterministic watchdog, one contract referee.',
};

export default async function TwoAgentsPage() {
  const [watchdogRes, deploymentsRes] = await Promise.all([
    safeGet(() => api.watchdog()),
    safeGet(() => api.deployments()),
  ]);
  const watchdog = watchdogRes.reachable ? watchdogRes.data : null;
  const deployments = deploymentsRes.reachable ? deploymentsRes.data : null;

  const approver = deployments?.accounts?.agent;
  const watchdogAcc = deployments?.accounts?.watchdog;

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>The economy</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          One approver. One watchdog. No human.
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          The approver is model-driven and moves money by posting a bond. The
          watchdog is deterministic and challenges duplicate payouts on chain.
          Both are real Casper accounts. Both sign real transactions. The
          contract is the referee.
        </p>
      </header>

      {!watchdogRes.reachable && <BackendDown />}

      {watchdog && (
        <section aria-label="Live watchdog" className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Watchdog running"
            value={watchdog.running ? 'Yes' : 'Idle'}
            tone={watchdog.running ? 'accent' : 'bone'}
          />
          <Stat
            label="Earned to date"
            value={<Money atomic={watchdog.totalRewardEarned} bare />}
            suffix="csprUSD"
          />
          <Stat label="Recent catches" value={String(watchdog.recentCatches.length)} />
        </section>
      )}

      <section aria-label="Trigger" className="space-y-4">
        <Label>Trigger a live demo</Label>
        <p className="text-sm leading-relaxed text-muted">
          One click mints a duplicate payout the approver signs. The watchdog
          catches it, challenges, and the contract settles.
        </p>
        <TwoAgentsClient initialWatchdog={watchdog} />
      </section>

      {approver && watchdogAcc && (
        <section aria-label="Accounts" className="space-y-4">
          <Label>The two on-chain accounts</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <AccountCard
              role="Approver (model-driven)"
              summary="Reviews invoices with a language model, posts a bond before every action, and can be wrong."
              publicKey={approver.publicKey}
            />
            <AccountCard
              role="Watchdog (deterministic)"
              summary="A rules-based agent monitoring every payout. When it detects a duplicate, it signs the challenge without asking anyone."
              publicKey={watchdogAcc.publicKey}
            />
          </div>
        </section>
      )}

      {watchdog && watchdog.recentCatches.length > 0 && (
        <section aria-label="Recent catches" className="space-y-4">
          <Label>Recent catches by the watchdog</Label>
          <ul className="space-y-2">
            {watchdog.recentCatches.slice(0, 6).map((c) => (
              <li
                key={c.actionId}
                className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-md border border-rule bg-surface px-4 py-3"
              >
                <Link
                  href={`/app/actions/${c.actionId}`}
                  className="serial text-[0.62rem] text-muted hover:text-accent"
                >
                  {serial(c.actionId)}
                </Link>
                <p className="truncate text-sm text-bone">
                  Earned <Money atomic={c.reward} />
                </p>
                {c.challengeTx ? (
                  <a
                    href={txExplorer(c.challengeTx)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {truncateHash(c.challengeTx)}
                  </a>
                ) : (
                  <span className="text-xs text-muted">no tx</span>
                )}
                {c.resolveTx ? (
                  <a
                    href={txExplorer(c.resolveTx)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {truncateHash(c.resolveTx)}
                  </a>
                ) : (
                  <span className="text-xs text-muted">no resolve</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone = 'accent',
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  tone?: 'accent' | 'bone';
}) {
  const toneClass = tone === 'accent' ? 'text-accent' : 'text-bone';
  return (
    <div className="rounded-md border border-rule bg-surface px-5 py-4">
      <Label>{label}</Label>
      <p className={`mt-2 font-mono text-2xl tabular ${toneClass}`}>{value}</p>
      {suffix && <p className="mt-1 text-[0.62rem] text-muted">{suffix}</p>}
    </div>
  );
}

function AccountCard({
  role,
  summary,
  publicKey,
}: {
  role: string;
  summary: string;
  publicKey: string;
}) {
  return (
    <Panel className="p-5">
      <p className="serial text-[0.62rem] text-accent">{role}</p>
      <p className="mt-2 text-sm leading-relaxed text-bone">{summary}</p>
      <div className="mt-3 border-t border-rule pt-3">
        <Label>Public key</Label>
        <div className="mt-1">
          <CopyHash value={publicKey} href={accountExplorer(publicKey)} label={truncateHash(publicKey)} />
        </div>
      </div>
    </Panel>
  );
}
