import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const TIMEOUT_MS = 55_000;

// Vercel Hobby and Pro both allow up to 60s for a serverless function; the
// watchdog demo is a real on-chain operation that can take most of that.
// Keep the fetch timeout a few seconds under this so our own error message
// returns first.
export const maxDuration = 60;

// Mints a non-reserved duplicate the deterministic watchdog will catch autonomously.
export async function POST() {
  try {
    const res = await fetch(`${API_BASE}/api/watchdog/demo`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, code: 'BACKEND_UNREACHABLE', message: 'Backend not reachable' }, { status: 502 });
  }
}
