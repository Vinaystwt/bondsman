import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';

// Mints a duplicate action reserved for a manual challenge in the Arena.
export async function POST() {
  try {
    const res = await fetch(`${API_BASE}/api/demo/arm`, {
      method: 'POST',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, code: 'BACKEND_UNREACHABLE', message: 'Backend not reachable' }, { status: 502 });
  }
}
