'use client';

import { Container } from '@/components/ui/Primitives';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="py-14">
      <div className="rounded-md border border-slash/30 bg-slash/5 p-6">
        <p className="serial text-[0.68rem] text-slash">Route error</p>
        <h1 className="mt-2 text-2xl font-semibold text-bone">
          This page failed to load
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          Navigation is still available. Retry this route or open another page from the header.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted">Digest {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink"
        >
          Retry
        </button>
      </div>
    </Container>
  );
}
