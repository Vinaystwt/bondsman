'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ActionSummary from '@/components/app/ActionSummary';
import { Label, StatusPill } from '@/components/ui/Primitives';
import { clientApi } from '@/lib/api';
import {
  deriveActionLifecycleStates,
  isTerminalActionStatus,
  nextActionPollDelayMs,
} from '@/lib/action-monitor';
import { formatIsoUtc } from '@/lib/format';
import type { ActionDetail } from '@/lib/types';

interface Props {
  initialAction: ActionDetail;
}

type RefreshState = 'idle' | 'refreshing' | 'retrying' | 'paused' | 'terminal';

export default function ActionMonitor({ initialAction }: Props) {
  const [action, setAction] = useState(initialAction);
  const [refreshState, setRefreshState] = useState<RefreshState>(() =>
    isTerminalActionStatus(initialAction.status) ? 'terminal' : 'idle',
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [temporaryError, setTemporaryError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState(
    `Action ${initialAction.actionId} loaded with status ${initialAction.status}.`,
  );
  const delayIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const unmountedRef = useRef(false);

  const terminal = isTerminalActionStatus(action.status);
  const lifecycle = useMemo(() => deriveActionLifecycleStates(action), [action]);
  const activeStage = lifecycle.find((state) => state.active)?.name ?? action.status;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearTimer();
    if (unmountedRef.current || isTerminalActionStatus(action.status)) {
      setRefreshState('terminal');
      setNextRefreshAt(null);
      return;
    }
    if (document.visibilityState === 'hidden') {
      setRefreshState('paused');
      setNextRefreshAt(null);
      return;
    }
    const delay = nextActionPollDelayMs(delayIndexRef.current);
    delayIndexRef.current += 1;
    const due = new Date(Date.now() + delay);
    setNextRefreshAt(due);
    timerRef.current = setTimeout(() => {
      void refreshAction('auto');
    }, delay);
  }, [action.status, clearTimer]);

  const refreshAction = useCallback(
    async (source: 'auto' | 'manual' | 'visible') => {
      if (unmountedRef.current || inFlightRef.current || isTerminalActionStatus(action.status)) {
        return;
      }
      clearTimer();
      inFlightRef.current = true;
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      setRefreshState(temporaryError ? 'retrying' : 'refreshing');
      setNextRefreshAt(null);
      try {
        const fresh = await clientApi.action(action.actionId, abort.signal);
        if (unmountedRef.current || abort.signal.aborted) return;
        setAction(fresh);
        setLastUpdatedAt(new Date());
        setTemporaryError(null);
        setAnnouncement(
          `Action ${fresh.actionId} refreshed from ${source}. Current status ${fresh.status}.`,
        );
        setRefreshState(isTerminalActionStatus(fresh.status) ? 'terminal' : 'idle');
      } catch (err) {
        if (unmountedRef.current || abort.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Refresh failed.';
        setTemporaryError(message);
        setAnnouncement(`Temporary network failure while refreshing action ${action.actionId}. Retrying.`);
        setRefreshState('retrying');
      } finally {
        inFlightRef.current = false;
        if (!unmountedRef.current) scheduleNext();
      }
    },
    [action.actionId, action.status, clearTimer, scheduleNext, temporaryError],
  );

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      clearTimer();
      abortRef.current?.abort();
    };
  }, [clearTimer]);

  useEffect(() => {
    scheduleNext();
    return () => clearTimer();
  }, [clearTimer, scheduleNext]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimer();
        setRefreshState('paused');
        setNextRefreshAt(null);
        abortRef.current?.abort();
        return;
      }
      delayIndexRef.current = 0;
      void refreshAction('visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [clearTimer, refreshAction]);

  return (
    <div className="space-y-8">
      <section className="rounded-md border border-rule bg-surface p-5" aria-labelledby="action-monitor-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Label>Action monitor</Label>
            <h1 id="action-monitor-title" className="mt-2 text-2xl font-semibold text-bone">
              {activeStage}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Polling the live action projection. The last valid action stays visible during temporary network failures.
            </p>
          </div>
          <StatusPill tone={terminal ? 'ok' : temporaryError ? 'warn' : refreshState === 'paused' ? 'warn' : 'info'}>
            {terminal
              ? 'Terminal'
              : refreshState === 'paused'
                ? 'Paused'
                : temporaryError
                  ? 'Retrying'
                  : refreshState === 'refreshing'
                    ? 'Refreshing'
                    : 'Live'}
          </StatusPill>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              delayIndexRef.current = 0;
              void refreshAction('manual');
            }}
            disabled={terminal || inFlightRef.current}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inFlightRef.current ? 'Refreshing' : 'Refresh'}
          </button>
          {action.receiptUrl && (
            <Link
              href={`/verify?actionId=${action.actionId}`}
              className="rounded-md border border-rule px-4 py-2 text-sm text-bone transition-colors hover:border-accent/60"
            >
              Verify receipt
            </Link>
          )}
          <span className="text-muted">Last updated {formatIsoUtc(lastUpdatedAt.toISOString())}</span>
          {nextRefreshAt && !terminal && (
            <span className="text-muted">Next refresh {formatIsoUtc(nextRefreshAt.toISOString())}</span>
          )}
        </div>

        {temporaryError && (
          <p className="mt-4 rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
            Temporary network failure: {temporaryError}. Retrying without clearing the last valid action.
          </p>
        )}

        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {lifecycle.map((state) => (
            <li
              key={state.name}
              className={`rounded-md border px-3 py-3 text-sm ${
                state.active
                  ? 'border-accent/70 bg-accent/10'
                  : state.reached
                    ? 'border-rule bg-ink'
                    : 'border-rule bg-surface/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-bone">{state.name}</span>
                <StatusPill tone={state.reached ? 'ok' : 'info'}>
                  {state.active ? 'Now' : state.reached ? 'Seen' : 'Pending'}
                </StatusPill>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{state.detail}</p>
            </li>
          ))}
        </ol>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </section>

      <ActionSummary action={action} />
    </div>
  );
}
