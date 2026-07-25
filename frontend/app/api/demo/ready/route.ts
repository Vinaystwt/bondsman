import { NextResponse } from 'next/server';
import { operatorHeaders } from '@/lib/server/operator-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const TIMEOUT_MS = 30_000;

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/demo/ready`, {
      cache: 'no-store',
      headers: { ...operatorHeaders() },
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
