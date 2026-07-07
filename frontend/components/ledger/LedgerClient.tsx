'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { clientApi, ApiError, BackendUnreachable } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import type { ActionSummary } from '@/lib/types';
import { accountsMatch } from '@/lib/account';
import { serial, truncateHash, accountExplorer } from '@/lib/format';
import Money from '@/components/ui/Money';
import StatusBadge from '@/components/ui/StatusBadge';
import CopyHash from '@/components/ui/CopyHash';
import { Label, Panel, Stat } from '@/components/ui/Primitives';
import { BackendDown, EmptyState, SkeletonPanel } from '@/components/ui/States';
import FaucetHint from '@/components/FaucetHint';

function halve(atomic: string): bigint {
  try { return BigInt(atomic) / 2n; } catch { return 0n; }
}

export default function LedgerClient() {
  const wallet = useWallet();
  const [actions, setActions] = useState<ActionSummary[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'down'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await clientApi.actions();
        if (!cancelled) {
          setActions(list);
          setState('ready');
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof BackendUnreachable) setState('down');
        else {
          setError(err instanceof ApiError ? err.message : 'Could not load actions.');
          setState('ready');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const mine = useMemo(() => {
    if (!actions || !wallet.accountHash) return [];
    return actions.filter((a) => accountsMatch(a.challenger, wallet.accountHash));
  }, [actions, wallet.accountHash]);

  const stats = useMemo(() => {
    let successful = 0;
    let totalReward = 0n;
    for (const a of mine) {
      if (a.status === 'ResolvedSlash') {
        successful += 1;
        totalReward += halve(a.bondPosted);
      }
    }
    return {
      total: mine.length,
      successful,
      totalReward: totalReward.toString(),
      hunterScore: successful,
    };
  }, [mine]);

  if (state === 'down') return <BackendDown />;

  if (!wallet.available) {
    return (
      <Panel className="p-8">
        <Label>Wallet required</Label>
        <p className="mt-3 text-sm leading-relaxed text-bone">
          Your Ledger is derived from on-chain challenges signed by your Casper
          Wallet. Install the extension to see your record.
        </p>
        <a
          href="https://www.casperwallet.io"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
        >
          Install Casper Wallet
        </a>
      </Panel>
    );
  }

  if (!wallet.connected) {
    return (
      <Panel className="p-8">
        <Label>Connect to see your record</Label>
        <p className="mt-3 text-sm leading-relaxed text-bone">
          Once connected, this page shows only actions where your account signed
          the challenge.
        </p>
        <button
          type="button"
          onClick={wallet.connect}
          className="mt-5 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
        >
          Connect Wallet
        </button>
      </Panel>
    );
  }

  if (state === 'loading') return <SkeletonPanel rows={3} />;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Label>Connected as</Label>
        {wallet.publicKey && (
          <CopyHash value={wallet.publicKey} href={accountExplorer(wallet.publicKey)} label={truncateHash(wallet.publicKey)} />
        )}
      </div>

      <section aria-label="Hunter score" className="grid gap-4 sm:grid-cols-4">
        <Stat label="Challenges signed" tone="bone">{stats.total}</Stat>
        <Stat label="Successful slashes" tone="accent">{stats.successful}</Stat>
        <Stat label="Rewards earned" tone="accent">
          <Money atomic={stats.totalReward} bare />
        </Stat>
        <Stat label="Hunter score" tone="accent">{stats.hunterScore}</Stat>
      </section>
      <p className="text-xs text-muted">
        Hunter score is a derived activity stat, not on-chain reputation. The
        contract tracks agent reputation only. Reward totals are computed from
        posted bonds using the 50 / 50 split.
      </p>

      <FaucetHint />


      <section aria-label="Your challenges">
        <h2 className="serial mb-3 text-[0.68rem] text-muted">Your challenges</h2>
        {error && (
          <p className="mb-4 rounded-md border border-slash/30 bg-slash/5 px-4 py-2 text-sm text-bone">
            {error}
          </p>
        )}
        {mine.length === 0 ? (
          <div className="rounded-md border border-rule bg-surface p-8">
            <p className="text-lg font-semibold text-bone">Your Ledger is empty</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You have not signed a challenge yet. Head to the Arena, catch a
              wrong payout, and your record starts here.
            </p>
            <Link
              href="/app/arena"
              className="mt-5 inline-flex rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
            >
              Head to the Arena
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {[...mine]
              .sort((a, b) => b.actionId - a.actionId)
              .map((a) => (
                <LedgerRow key={a.actionId} action={a} />
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LedgerRow({ action }: { action: ActionSummary }) {
  const reward = action.status === 'ResolvedSlash' ? halve(action.bondPosted).toString() : null;
  return (
    <li>
      <Link
        href={`/app/actions/${action.actionId}`}
        className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded-md border border-rule bg-surface px-4 py-3 transition-colors hover:border-accent/40"
      >
        <span className="serial w-20 shrink-0 text-[0.62rem] text-muted">
          {serial(action.actionId)}
        </span>
        <div className="min-w-0">
          <span className="block text-sm text-bone group-hover:text-accent">
            <Money atomic={action.amount} />
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Bond <Money atomic={action.bondPosted} bare /> csprUSD
          </span>
        </div>
        <div className="text-right">
          {reward ? (
            <span className="font-mono text-sm text-accent">
              +<Money atomic={reward} bare /> csprUSD
            </span>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </div>
        <StatusBadge status={action.status} />
      </Link>
    </li>
  );
}
