'use client';

import { Container } from '@/components/ui/Primitives';

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <Container className="py-14">
      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-6">
        <p className="serial text-[0.68rem] text-yellow-300">App error</p>
        <h1 className="mt-2 text-2xl font-semibold text-bone">
          The app route did not finish loading
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          Retry the request. Payment and submit controls stay unavailable while the route is in this state.
        </p>
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
