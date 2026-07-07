import { NextResponse } from 'next/server';

const DEFAULT_NODE = 'https://node.testnet.casper.network/rpc';

export async function POST(request: Request) {
  let deployJson: unknown;
  try {
    deployJson = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { deploy, nodeUrl } = deployJson as { deploy: unknown; nodeUrl?: string };
  const rpcUrl = nodeUrl || DEFAULT_NODE;

  const rpcBody = {
    jsonrpc: '2.0',
    method: 'account_put_deploy',
    params: { deploy },
    id: 1,
  };

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rpcBody),
    });
    const data = await res.json();
    if (data.error) {
      return NextResponse.json(
        { success: false, code: 'RPC_ERROR', message: data.error.message || 'RPC call failed' },
        { status: 502 },
      );
    }
    return NextResponse.json(data.result);
  } catch {
    return NextResponse.json(
      { success: false, code: 'NODE_UNREACHABLE', message: 'Casper node not reachable' },
      { status: 502 },
    );
  }
}
