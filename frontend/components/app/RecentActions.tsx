'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/States';

const KEY = 'bondsman.recentActions.v1';

export function rememberActionId(actionId: number | string) {
  if (typeof window === 'undefined') return;
  const current = readRecent();
  const next = [String(actionId), ...current.filter((id) => id !== String(actionId))]
    .slice(0, 8);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function RecentActions() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readRecent());
  }, []);

  if (ids.length === 0) {
    return (
      <EmptyState
        title="No browser saved actions yet"
        body="Actions created in this browser will appear here as a convenience index. This does not prove ownership."
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {ids.map((id) => (
        <li key={id}>
          <Link
            href={`/app/actions/${id}`}
            className="flex items-center justify-between rounded-md border border-rule bg-surface px-4 py-3 text-sm transition-colors hover:border-accent/50"
          >
            <span className="text-bone">Action {id}</span>
            <span className="serial text-[0.6rem] text-accent">Open</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
