import type { ActionStatus } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/format';

type Tone = 'copper' | 'sage' | 'void' | 'muted';

const TONE: Record<ActionStatus, Tone> = {
  Initiated: 'muted',
  Bonded: 'copper',
  Executed: 'copper',
  Challenged: 'copper',
  ResolvedSlash: 'void',
  ResolvedRefund: 'sage',
};

const TONE_CLASS: Record<Tone, string> = {
  copper: 'border-copper/40 text-copper bg-copper/10',
  sage: 'border-sage/40 text-sage bg-sage/10',
  void: 'border-void/50 text-void bg-void/10',
  muted: 'border-rule text-muted bg-bone/5',
};

// Icons carry the meaning so color is never the only signal.
function Icon({ status }: { status: ActionStatus }) {
  if (status === 'ResolvedSlash') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === 'ResolvedRefund') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="m8.5 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: ActionStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[TONE[status]]} ${className ?? ''}`}
    >
      <Icon status={status} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default StatusBadge;
