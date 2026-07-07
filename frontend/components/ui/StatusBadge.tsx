import { STATUS_LABEL } from '@/lib/format';

type Tone = 'accent' | 'slash' | 'muted';

const TONE: Record<string, Tone> = {
  Initiated: 'muted',
  Bonded: 'muted',
  Executed: 'accent',
  Challengeable: 'accent',
  Expired: 'muted',
  Challenged: 'accent',
  ResolvedSlash: 'slash',
  ResolvedRefund: 'accent',
};

const TONE_CLASS: Record<Tone, string> = {
  accent: 'border-accent/40 text-accent bg-accent/10',
  slash: 'border-slash/50 text-slash bg-slash/10',
  muted: 'border-rule text-muted bg-bone/5',
};

function Icon({ status }: { status: string }) {
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
  status: string;
  className?: string;
}) {
  const tone = TONE[status] ?? 'muted';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]} ${className ?? ''}`}
    >
      <Icon status={status} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default StatusBadge;
