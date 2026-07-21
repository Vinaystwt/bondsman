import type { ReactNode } from 'react';
import Link from 'next/link';

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded ${className ?? ''}`} aria-hidden="true" />;
}

/** A panel of skeleton rows used while a data screen loads. */
export function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-rule bg-surface/40 px-6 py-12">
      <h3 className="font-display text-lg text-bone">{title}</h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Shown whenever the backend cannot be reached. Tells the person exactly what to do. */
export function BackendDown() {
  return (
    <div className="max-w-xl rounded-md border border-slash/30 bg-slash/5 px-6 py-10">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-slash/40 text-slash">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h3 className="font-display text-xl text-bone">
        Live service temporarily unavailable
      </h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Bondsman could not reach its hosted testnet service. Historical proof
        remains available while the connection recovers.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href=""
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
        >
          Retry
        </a>
        <Link
          href="/proof/27"
          className="rounded-md border border-rule px-4 py-2.5 text-sm text-bone transition-colors hover:border-accent/50"
        >
          Open Action 27 proof
        </Link>
        <a
          href="/api/health"
          className="rounded-md border border-rule px-4 py-2.5 text-sm text-bone transition-colors hover:border-accent/50"
        >
          View service status
        </a>
      </div>
    </div>
  );
}

export default EmptyState;
