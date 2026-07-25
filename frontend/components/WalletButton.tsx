'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/wallet';
import { truncateHash } from '@/lib/format';

export default function WalletButton() {
  const { available, connected, connecting, publicKey, balance, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!available) {
    return (
      <a
        href="https://www.casperwallet.io"
        target="_blank"
        rel="noreferrer"
        className="hidden rounded border border-rule bg-surface px-3 py-2 text-xs text-muted transition-colors hover:text-bone sm:inline-flex sm:items-center sm:gap-1.5"
        title="Install the Casper Wallet extension"
      >
        <WalletIcon />
        Get Wallet
      </a>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="hidden items-center gap-2 rounded border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20 sm:inline-flex"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          {truncateHash(publicKey)}
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-rule bg-surface p-3 shadow-lg">
              <p className="font-mono text-xs text-bone">{truncateHash(publicKey)}</p>
              <p className="mt-1.5 text-xs text-muted">Testnet address connected</p>
              <button
                type="button"
                onClick={() => { disconnect(); setMenuOpen(false); }}
                className="mt-3 w-full rounded border border-rule px-3 py-1.5 text-xs text-muted transition-colors hover:text-bone"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={connecting}
      className="hidden items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-60 sm:inline-flex"
    >
      <WalletIcon />
      {connecting ? 'Connecting' : 'Connect Wallet'}
    </button>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
      <path d="M6 5V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
