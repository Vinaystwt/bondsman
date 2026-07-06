'use client';

import { useState } from 'react';

// A waitlist capture. It validates the address and confirms locally. It does
// not claim to do more than note your interest.
export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-accent" role="status">
        Noted. We will be in touch when Bondsman moves past testnet. The demo is
        open now.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-invalid={!!error}
          aria-describedby={error ? 'waitlist-error' : undefined}
          className="min-w-0 flex-1 rounded-md border border-rule bg-ink px-4 py-3 text-bone placeholder:text-muted focus:border-accent/60"
        />
        <button
          type="submit"
          className="rounded-md border border-accent bg-accent/15 px-5 py-3 font-medium text-accent transition-colors hover:bg-accent/25"
        >
          Keep me posted
        </button>
      </div>
      {error && (
        <span id="waitlist-error" className="text-sm text-slash">
          {error}
        </span>
      )}
    </form>
  );
}
