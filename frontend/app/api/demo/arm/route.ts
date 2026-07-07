import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const TIMEOUT_MS = 55_000;

// Vercel Hobby and Pro both allow up to 60s for a serverless function; arming
// is a real on-chain operation that can take most of that. Keep the fetch
// timeout a few seconds under this so our own error message returns first.
export const maxDuration = 60;

function timeoutMessage() {
  return [
    'The backend is reachable, but arming a fresh demo payout did not finish before the Vercel request limit.',
    'This endpoint submits real Casper testnet transactions and can continue on-chain after the browser request times out.',
    'Refresh the Arena or try again in a moment to load the newly armed case.',
  ].join(' ');
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError');
}

// Mints a duplicate action reserved for a manual challenge in the Arena.
export async function POST() {
  try {
    const res = await fetch(`${API_BASE}/api/demo/arm`, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (isTimeout(error)) {
      return NextResponse.json(
        { success: false, code: 'ARM_TIMEOUT', message: timeoutMessage() },
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
