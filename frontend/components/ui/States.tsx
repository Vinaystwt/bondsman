import type { ReactNode } from 'react';

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
    <div className="rounded-md border border-dashed border-rule bg-surface/40 px-6 py-12 text-center">
      <h3 className="font-display text-lg text-bone">{title}</h3>
      <p className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-muted">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Shown whenever the backend cannot be reached. Tells the person exactly what to do. */
export function BackendDown() {
  return (
    <div className="mx-auto max-w-xl rounded-md border border-void/30 bg-void/5 px-6 py-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-void/40 text-void">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h3 className="font-display text-xl text-bone">Backend not reachable</h3>
      <p className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Bondsman reads live testnet state from the local API. Start it from the
        repository root, then reload this page.
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded border border-rule bg-ink px-4 py-2 font-mono text-sm text-copper">
        <span className="text-muted">$</span> npm run api
      </div>
    </div>
  );
}

export default EmptyState;
