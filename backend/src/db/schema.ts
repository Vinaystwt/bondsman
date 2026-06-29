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
`;
