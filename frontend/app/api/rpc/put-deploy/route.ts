import { NextResponse } from 'next/server';

const DEFAULT_NODE = 'https://node.testnet.casper.network/rpc';
const TIMEOUT_MS = 30_000;

function stringifyRpcData(data: unknown): string {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    if (data.error) {
      const rpcData = stringifyRpcData(data.error.data);
      const message = [
        `Casper RPC rejected the challenge deploy at account_put_deploy`,
        data.error.code !== undefined ? `(code ${data.error.code})` : '',
        data.error.message ? `: ${data.error.message}` : '',
        rpcData ? `; data=${rpcData}` : '',
      ].join('');
      return NextResponse.json(
        {
          success: false,
          code: 'RPC_ERROR',
          message,
          rpcCode: data.error.code,
          rpcData: data.error.data,
        },
        { status: 502 },
      );
    }
    return NextResponse.json(data.result);
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? `Casper node did not answer account_put_deploy within ${TIMEOUT_MS / 1000}s`
      : 'Casper node not reachable';
    return NextResponse.json(
      { success: false, code: 'NODE_UNREACHABLE', message },
      { status: 502 },
    );
  }
}
