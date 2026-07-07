// Minimal external watchdog agent. Not run automatically — this is a shape.
// It talks to the Bondsman backend directly. The same operations are available
// to any MCP client via @vinaystwt/bondsman-mcp.

const API_BASE = process.env.BONDSMAN_API_BASE || 'http://127.0.0.1:3001';

interface Action {
  actionId: number;
  status: string;
  claimHash: string;
  windowEnd: number;
  challenger: string | null;
}

async function listActions(): Promise<Action[]> {
  const res = await fetch(`${API_BASE}/api/actions`);
  return res.json();
}

async function submitChallenge(actionId: number): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/challenge`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actionId }),
  });
  return res.json();
}

// A trivial duplicate check the deterministic watchdog runs on chain.
// Real duplicate detection uses claim-hash lookups against the invoice pool.
function isDuplicate(_action: Action): boolean {
  return false;
}

async function main(): Promise<void> {
  const actions = await listActions();
  const now = Date.now();
  for (const a of actions) {
    const inWindow = a.windowEnd > now && !a.challenger;
    if (a.status !== 'Executed' || !inWindow) continue;
    if (!isDuplicate(a)) continue;
    console.log(`Challenging action ${a.actionId}`);
    console.log(await submitChallenge(a.actionId));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
