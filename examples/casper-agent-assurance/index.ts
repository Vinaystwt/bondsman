const API_BASE =
  process.env.BONDSMAN_API_BASE ||
  'https://bondsman-backend-production.up.railway.app';

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    body: text ? JSON.parse(text) : null,
    headers: {
      paymentRequired: response.headers.get('payment-required'),
      paymentResponse: response.headers.get('payment-response'),
    },
  };
}

function post(path: string, body: unknown) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const templates = await request('/api/assurance/templates');
const assurance = await post('/api/assurance/analyze', {
  templateId: 'invoice_delivery',
  description:
    'Pay an invoice only if buyer-signed non-delivery evidence can slash a failed delivery.',
  amount: '50000000000000',
  agentConfidence: 0.84,
  counterpartyStatus: 'new',
  evidenceSource: 'signed_delivery_attestation',
  maxLossBps: 600,
  urgency: 'normal',
});
const unpaidQuote = await post('/v1/actions/quote', {
  amount: '50000000000000',
  faultClass: 'delivery_contradiction',
});
const replay = await request('/api/replay/canonical');
const receipt = await request('/api/receipt/27');
const receiptVerify = await request('/api/receipt/27/verify');
const tampered = structuredClone(receipt.body);
if (tampered?.payment) tampered.payment.settlementTransaction = '0'.repeat(64);
const tamperVerify = await post('/api/receipt/27/verify', tampered);

console.log(JSON.stringify({
  apiBase: API_BASE,
  templateCount: templates.body?.templates?.length,
  assurance: {
    status: assurance.status,
    source: assurance.body?.source,
    modelAvailable: assurance.body?.modelAvailable,
    implementationStatus: assurance.body?.manifest?.implementationStatus,
    estimatedBond: assurance.body?.manifest?.bondPolicy?.estimatedBond,
    boundaries: assurance.body?.manifest?.boundaries,
  },
  unpaidQuote: {
    status: unpaidQuote.status,
    code: unpaidQuote.body?.code,
    mutatesState: false,
    paymentRequiredHeaderPresent: Boolean(unpaidQuote.headers.paymentRequired),
  },
  canonicalReplay: {
    status: replay.status,
    actionId: replay.body?.actionId,
    source: replay.body?.source,
    quoteSingleUse: replay.body?.checks?.quoteSingleUse,
    receiptValid: replay.body?.checks?.receiptValid,
  },
  receiptVerification: receiptVerify.body,
  tamperVerification: tamperVerify.body,
}, null, 2));
