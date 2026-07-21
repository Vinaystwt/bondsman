import http from 'node:http';

const port = Number(process.env.E2E_API_PORT ?? 3999);

const template = {
  id: 'invoice_delivery',
  name: 'Invoice delivery',
  category: 'Delivery contradiction',
  description: 'Executable e2e policy template.',
  implementationStatus: 'executable_now',
  executableNow: true,
  currentAdapter: 'e2e',
  supportedFaultClasses: ['delivery_contradiction', 'duplicate_claim'],
  proposedFaultClass: 'delivery_contradiction',
  proposedVerifier: 'delivery_verifier',
  objectiveEvidence: ['signed_delivery_attestation'],
  casperValue: '10000000000000',
  requiredFields: ['description', 'amount'],
};

const health = {
  ok: true,
  version: 'e2e',
  controller: 'hash-e2e',
  watchdog: { running: true },
  uptimeSec: 1,
  deploymentsPath: 'e2e',
  publicExperience: {
    proofConsoleReady: false,
    assuranceStudioReady: true,
    assuranceModelConfigured: true,
    assuranceModelAvailable: true,
    assuranceModelStatus: 'available',
    assuranceModelLastCheckedAt: null,
    assuranceModelLastSuccessAt: null,
    assuranceModelLastFailureCode: null,
    canonicalActionId: 27,
    canonicalProofAvailable: false,
    canonicalReceiptValid: false,
    liveQuoteProbeAvailable: true,
    publicMutationModesEnabled: false,
  },
};

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': '*',
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, health);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/actions') {
    send(res, 200, []);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/assurance/templates') {
    send(res, 200, { schemaId: 'e2e.templates.v1', templates: [template] });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/deployments') {
    send(res, 200, { network: 'casper-test', chainName: 'casper-test', nodeRpcUrl: 'e2e', contracts: {}, accounts: {} });
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/replay/')) {
    send(res, 503, { success: false, code: 'E2E_REPLAY_UNAVAILABLE', message: 'canonical replay unavailable in e2e' });
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/receipt/')) {
    send(res, 503, { success: false, code: 'E2E_RECEIPT_UNAVAILABLE', message: 'receipt unavailable in e2e' });
    return;
  }
  send(res, 404, { success: false, code: 'NOT_FOUND', message: 'e2e route not found' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`e2e mock api listening on ${port}`);
});
