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
    <div className="rounded-md border border-dashed border-rule bg-surface/40 px-6 py-12">
      <h3 className="font-display text-lg text-bone">{title}</h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const BACKEND_DOWN_COPY: Record<string, { title: string; body: string }> = {
  OPERATOR_AUTH_REQUIRED: {
    title: 'Temporarily restricted',
    body: 'This feature is temporarily restricted. Please try again shortly.',
  },
  OPERATOR_AUTH_INVALID: {
    title: 'Temporarily restricted',
    body: 'This feature is temporarily restricted. Please try again shortly.',
  },
  RATE_LIMITED: {
    title: 'Slow down',
    body: 'Too many requests right now. Please wait a moment and try again.',
  },
};

/** Shown whenever the backend cannot be reached or a request was rejected. */
export function BackendDown({ code }: { code?: string }) {
  const copy = (code ? BACKEND_DOWN_COPY[code] : undefined) ?? {
    title: 'Service temporarily unavailable',
    body: 'Bondsman could not reach the backend just now. Please try again shortly.',
  };
  return (
    <div className="max-w-xl rounded-md border border-slash/30 bg-slash/5 px-6 py-10">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-slash/40 text-slash">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h3 className="font-display text-xl text-bone">{copy.title}</h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{copy.body}</p>
    </div>
  );
}

export default EmptyState;
