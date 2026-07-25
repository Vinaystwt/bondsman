'use client';

import { useState } from 'react';

// A code block with a copy button. Used for commands, endpoints, and JSON.
export default function CodeBlock({
  code,
  language,
  label,
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-md border border-rule bg-ink">
      {(label || language) && (
        <div className="flex items-center justify-between border-b border-rule px-4 py-2">
          <span className="serial text-[0.6rem] text-muted">{label ?? language}</span>
        </div>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded text-muted opacity-0 transition-opacity hover:text-bone focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" stroke="#35C281" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.82rem] leading-relaxed text-bone/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
