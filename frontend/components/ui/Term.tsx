'use client';

import { useState, type ReactNode } from 'react';

// Plain-language definitions for every domain term, shown the first time a
// person meets the word. One vocabulary across the whole product.
export const GLOSSARY: Record<string, string> = {
  bond: 'Money the agent locks up before it can act. If the action is wrong, the bond is taken.',
  slash: 'Taking the bond when the action is proven wrong. Half goes to the challenger, half to the reserve.',
  challenge:
    'Anyone can flag an action as wrong during the challenge window. The contract checks the claim.',
  'challenge window':
    'The period after an action when it can still be challenged. After it closes, the bond returns.',
  reserve:
    'A pool funded by slashed bonds. It exists to protect the people whose money the agent moves.',
  reputation:
    'An agent’s record of clean and slashed actions. A clean record lowers future bonds; a slash raises them.',
  'claim hash':
    'A fingerprint of what an invoice is claiming. Two payouts with the same fingerprint are the same claim.',
  agent: 'The autonomous program that reads an invoice, decides, and moves the money.',
};

interface TermProps {
  /** The glossary key. */
  name: keyof typeof GLOSSARY | string;
  children: ReactNode;
}

/** An underlined domain term with a plain-language tooltip on hover and focus. */
export function Term({ name, children }: TermProps) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[name.toLowerCase()] ?? '';
  if (!def) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="cursor-help border-b border-dotted border-muted/70 text-bone transition-colors hover:border-accent hover:text-accent focus-visible:border-accent"
        aria-describedby={`term-${name}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      <span
        id={`term-${name}`}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded border border-rule bg-raised px-3 py-2 text-left text-xs leading-relaxed text-bone/90 shadow-xl transition-opacity duration-150 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {def}
      </span>
    </span>
  );
}

export default Term;
