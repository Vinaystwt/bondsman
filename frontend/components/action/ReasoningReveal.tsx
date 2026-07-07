'use client';

import { useEffect, useState } from 'react';
import { blake2bHex } from 'blakejs';
import CopyHash from '@/components/ui/CopyHash';
import { Label } from '@/components/ui/Primitives';
import { stripPrefix, truncateHash } from '@/lib/format';

function blake2b256Hex(text: string): string {
  return blake2bHex(text, undefined, 32);
}

export default function ReasoningReveal({
  reasoning,
  reasoningHash,
}: {
  reasoning: string;
  reasoningHash: string;
}) {
  const has = reasoning.trim().length > 0;
  const [computed, setComputed] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const stripped = stripPrefix(reasoningHash).toLowerCase();

  useEffect(() => {
    setComputed(null);
  }, [reasoning]);

  const verify = async () => {
    if (!has) return;
    setChecking(true);
    try {
      const digest = blake2b256Hex(reasoning);
      setComputed(digest);
    } finally {
      setChecking(false);
    }
  };

  const matches =
    computed !== null && stripped.length > 0 && computed.toLowerCase() === stripped;
  const mismatch = computed !== null && !matches;

  return (
    <section
      aria-label="Agent reasoning"
      className="rounded-md border border-rule bg-gradient-to-b from-surface to-ink p-6"
    >
      <Label>What the agent decided</Label>
      {has ? (
        <blockquote className="mt-3 font-display text-xl leading-relaxed text-bone sm:text-2xl">
          &ldquo;{reasoning}&rdquo;
        </blockquote>
      ) : (
        <p className="mt-3 text-base leading-relaxed text-muted">
          This action carried no written explanation. It reused a claim that had
          already been paid, which is exactly what the bond exists to catch.
        </p>
      )}

      <div className="mt-5 space-y-3 border-t border-rule pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Label>Reasoning hash, committed on-chain</Label>
          <CopyHash value={reasoningHash} label={truncateHash(reasoningHash)} />
        </div>

        {has && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={verify}
              disabled={checking}
              className="rounded-md border border-rule px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-bone disabled:opacity-60"
            >
              {checking ? 'Hashing...' : computed ? 'Rehash' : 'Verify reasoning hash'}
            </button>
            {computed && (
              <div className="flex items-center gap-2 text-xs">
                {matches && (
                  <span className="flex items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2 py-1 font-medium text-accent">
                    <CheckIcon />
                    Hash matches
                  </span>
                )}
                {mismatch && (
                  <span className="flex items-center gap-1.5 rounded border border-slash/40 bg-slash/10 px-2 py-1 font-medium text-slash">
                    <CrossIcon />
                    Hash mismatch
                  </span>
                )}
                <span className="font-mono text-muted" title={computed}>
                  local: {computed.slice(0, 8)}&hellip;{computed.slice(-6)}
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted">
          The contract stores Blake2b-256 of the reasoning. Verify locally that
          the text on this page matches what was committed on chain.
        </p>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
