import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const TIMEOUT_MS = 55_000;

// Vercel Hobby and Pro both allow up to 60s for a serverless function; the
// watchdog demo is a real on-chain operation that can take most of that.
// Keep the fetch timeout a few seconds under this so our own error message
// returns first.
export const maxDuration = 60;

function timeoutMessage() {
  return [
    'The backend is reachable, but the autonomous watchdog demo did not finish before the Vercel request limit.',
    'This endpoint submits real Casper testnet transactions and the watchdog can still catch the action after the browser request times out.',
    'Refresh the Arena in a moment to see the latest watchdog catch.',
  ].join(' ');
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError');
}

// Mints a non-reserved duplicate the deterministic watchdog will catch autonomously.
export async function POST() {
  try {
    const res = await fetch(`${API_BASE}/api/watchdog/demo`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (isTimeout(error)) {
      return NextResponse.json(
        { success: false, code: 'WATCHDOG_DEMO_TIMEOUT', message: timeoutMessage() },
        { status: 504 },
      );
    }
    const message = error instanceof Error ? error.message : 'Backend not reachable';
    return NextResponse.json(
      { success: false, code: 'BACKEND_UNREACHABLE', message },
      { status: 502 },
    );
  }
}
