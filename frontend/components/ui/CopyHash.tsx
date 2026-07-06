'use client';

import { useState } from 'react';
import { truncateHash, stripPrefix } from '@/lib/format';

interface CopyHashProps {
  value: string;
  /** Optional explorer URL. When set, the label links out. */
  href?: string;
  /** Override the displayed text (defaults to a truncated hash). */
  label?: string;
  className?: string;
}

/** A hash typeset like a serial number, with copy-to-clipboard and an optional explorer link. */
export function CopyHash({ value, href, label, className }: CopyHashProps) {
  const [copied, setCopied] = useState(false);
  const shown = label ?? truncateHash(value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(stripPrefix(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked; the explorer link still works */
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-sm ${className ?? ''}`}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-bone/90 underline decoration-rule decoration-1 underline-offset-4 transition-colors hover:text-accent"
          title={`Open ${stripPrefix(value)} on the testnet explorer`}
        >
          {shown}
        </a>
      ) : (
        <span className="text-bone/90" title={stripPrefix(value)}>
          {shown}
        </span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy full value'}
        className="grid h-7 w-7 place-items-center rounded text-muted transition-colors hover:text-bone focus-visible:text-bone"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" stroke="#5A7D6F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </span>
  );
}

export default CopyHash;
