import { StatusPill } from '@/components/ui/Primitives';
import type { HealthPublicExperience } from '@/lib/types';

export type ProofConsoleState =
  | { kind: 'live'; label: string }
  | { kind: 'committed'; label: string }
  | { kind: 'degraded'; label: string }
  | { kind: 'unreachable'; label: string };

export function resolveProofState(input: {
  healthOk: boolean | null;
  publicExperience: HealthPublicExperience | null;
  replaySource: string | null;
}): ProofConsoleState {
  if (input.replaySource === 'committed_bundle') {
    return {
      kind: 'committed',
      label: 'Verified committed fallback evidence',
    };
  }
  if (input.healthOk === null) {
    return { kind: 'unreachable', label: 'Live service not reached' };
  }
  if (input.publicExperience?.proofConsoleReady === false) {
    return {
      kind: 'degraded',
      label: 'Canonical verification temporarily degraded',
    };
  }
  return { kind: 'live', label: 'Live on Casper testnet' };
}

export default function HealthBanner({
  state,
  reason,
}: {
  state: ProofConsoleState;
  reason?: string | null;
}) {
  const tone =
    state.kind === 'live'
      ? 'ok'
      : state.kind === 'degraded'
        ? 'warn'
        : state.kind === 'committed'
          ? 'info'
          : 'neutral';
  const dot =
    state.kind === 'live'
      ? 'bg-accent'
      : state.kind === 'degraded'
        ? 'bg-yellow-400'
        : state.kind === 'committed'
          ? 'bg-bone'
          : 'bg-muted';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-rule bg-surface/60 px-4 py-3 text-xs">
      <StatusPill tone={tone as 'ok' | 'warn' | 'info' | 'neutral'}>
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {state.label}
      </StatusPill>
      {reason && <span className="text-muted">{reason}</span>}
      {state.kind === 'committed' && (
        <span className="text-muted">
          Live projection temporarily unavailable. Evidence hashes are unchanged.
        </span>
      )}
      {state.kind === 'unreachable' && (
        <span className="text-muted">
          Historical evidence remains settled on Casper testnet.
        </span>
      )}
    </div>
  );
}
