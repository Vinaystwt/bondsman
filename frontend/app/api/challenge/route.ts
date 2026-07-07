import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';

// Forwards the challenge mutation to the backend, which fires a real testnet
// challenge then slash. This is async and on-chain, so it can take time.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/challenge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
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
