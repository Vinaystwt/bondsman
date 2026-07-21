import { NextResponse } from 'next/server';

const API_BASE = (
  process.env.BACKEND_ORIGIN?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE?.trim() ||
  'http://127.0.0.1:3001'
).replace(/\/+$/, '');

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, code: 'BACKEND_UNREACHABLE', message: 'Live service not reachable' },
      { status: 502 },
    );
  }
}
