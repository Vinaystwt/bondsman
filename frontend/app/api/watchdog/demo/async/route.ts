import { NextResponse } from 'next/server';
import { operatorHeaders, forwardIdempotencyKey } from '@/lib/server/operator-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const TIMEOUT_MS = 30_000;

// Kicks off the watchdog demo job async; the client polls /api/jobs/:id.
export async function POST(request: Request) {
  try {
    const res = await fetch(`${API_BASE}/api/watchdog/demo/async`, {
      method: 'POST',
      headers: { ...operatorHeaders(), ...forwardIdempotencyKey(request) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, code: 'BACKEND_UNREACHABLE', message: 'Backend not reachable' },
      { status: 502 },
    );
  }
}
