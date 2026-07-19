export const schema = `
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  debtor TEXT NOT NULL,
  amount TEXT NOT NULL,
  vendor TEXT NOT NULL,
  due_date TEXT NOT NULL,
  delivered INTEGER NOT NULL,
  claim_hash TEXT NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS actions (
  action_id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  agent TEXT NOT NULL,
  amount TEXT NOT NULL,
  claim_hash TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  reasoning_hash TEXT NOT NULL,
  bond_required TEXT NOT NULL,
  bond_posted TEXT NOT NULL,
  window_end INTEGER NOT NULL,
  status TEXT NOT NULL,
  challenger TEXT,
  challenger_type TEXT,
  challenge_signing TEXT,
  controller_hash TEXT NOT NULL DEFAULT '',
  duplicate_proven INTEGER NOT NULL DEFAULT 0,
  fault_class TEXT NOT NULL DEFAULT 'duplicate_claim',
  evidence_root TEXT,
  reserved_for_manual INTEGER NOT NULL DEFAULT 0,
  transactions_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  contract TEXT NOT NULL,
  event_index INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  action_id INTEGER,
  data TEXT NOT NULL,
  transaction_hash TEXT,
  PRIMARY KEY (contract, event_index)
);

CREATE TABLE IF NOT EXISTS agent_reputation (
  agent TEXT PRIMARY KEY,
  clean INTEGER NOT NULL,
  slashed INTEGER NOT NULL,
  score INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reserve (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  balance TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchdog_catches (
  action_id INTEGER PRIMARY KEY,
  reward TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  challenge_tx TEXT NOT NULL,
  resolve_tx TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchdog_status (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  account TEXT NOT NULL,
  heartbeat_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  action_id INTEGER,
  status TEXT NOT NULL,
  challenge_tx TEXT,
  resolve_tx TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_cursors (
  contract TEXT PRIMARY KEY,
  last_event_index INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS system_state (
  state_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_attestations (
  evidence_root TEXT PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  action_id INTEGER,
  event_type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  buyer_public_key TEXT NOT NULL,
  signature TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  used_action_id INTEGER UNIQUE
);

CREATE TABLE IF NOT EXISTS paid_quotes (
  quote_hash TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  fault_class TEXT NOT NULL,
  verifier TEXT NOT NULL,
  amount TEXT NOT NULL,
  required_bond TEXT NOT NULL,
  challenge_window INTEGER NOT NULL,
  quote_expiry TEXT NOT NULL,
  payer TEXT,
  settlement_tx TEXT NOT NULL,
  payment_amount TEXT NOT NULL,
  facilitator TEXT NOT NULL,
  status TEXT NOT NULL,
  submit_payload_hash TEXT,
  consumed_action_id INTEGER,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER,
  policy_snapshot_json TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS paid_quotes_settlement_tx_unique
  ON paid_quotes(settlement_tx);

CREATE UNIQUE INDEX IF NOT EXISTS paid_quotes_consumed_action_unique
  ON paid_quotes(consumed_action_id)
  WHERE consumed_action_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS submit_authorization_nonces (
  nonce_hash TEXT PRIMARY KEY,
  payer TEXT NOT NULL,
  quote_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS proof_cache (
  controller_hash TEXT NOT NULL,
  action_id INTEGER NOT NULL,
  proof_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL,
  PRIMARY KEY (controller_hash, action_id)
);

CREATE TABLE IF NOT EXISTS signed_receipts (
  controller_hash TEXT NOT NULL,
  action_id INTEGER NOT NULL,
  receipt_json TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  PRIMARY KEY (controller_hash, action_id)
);
`;
