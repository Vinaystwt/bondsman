import type Database from 'better-sqlite3';

export interface InvoiceRecord {
  id: number;
  invoiceNumber: string;
  debtor: string;
  amount: string;
  vendor: string;
  dueDate: string;
  delivered: boolean;
  claimHash: string;
  paid: boolean;
}

export interface ActionRecord {
  actionId: number;
  invoiceId: number;
  agent: string;
  amount: string;
  claimHash: string;
  reasoning: string;
  reasoningHash: string;
  bondRequired: string;
  bondPosted: string;
  windowEnd: number;
  status: string;
  challenger: string | null;
  transactions: Record<string, string>;
}

export interface EventRecord {
  contract: string;
  eventIndex: number;
  eventType: string;
  actionId: number | null;
  data: string;
  transactionHash: string | null;
}

function invoiceFromRow(row: Record<string, unknown>): InvoiceRecord {
  return {
    id: Number(row.id),
    invoiceNumber: String(row.invoice_number),
    debtor: String(row.debtor),
    amount: String(row.amount),
    vendor: String(row.vendor),
    dueDate: String(row.due_date),
    delivered: Boolean(row.delivered),
    claimHash: String(row.claim_hash),
    paid: Boolean(row.paid),
  };
}

function actionFromRow(row: Record<string, unknown>): ActionRecord {
  return {
    actionId: Number(row.action_id),
    invoiceId: Number(row.invoice_id),
    agent: String(row.agent),
    amount: String(row.amount),
    claimHash: String(row.claim_hash),
    reasoning: String(row.reasoning),
    reasoningHash: String(row.reasoning_hash),
    bondRequired: String(row.bond_required),
    bondPosted: String(row.bond_posted),
    windowEnd: Number(row.window_end),
    status: String(row.status),
    challenger:
      row.challenger === null ? null : String(row.challenger),
    transactions: JSON.parse(
      String(row.transactions_json),
    ) as Record<string, string>,
  };
}

export class Repository {
  constructor(private readonly database: Database.Database) {}

  upsertInvoice(invoice: InvoiceRecord): void {
    this.database
      .prepare(
        `INSERT INTO invoices
          (id, invoice_number, debtor, amount, vendor, due_date, delivered, claim_hash, paid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          invoice_number=excluded.invoice_number, debtor=excluded.debtor,
          amount=excluded.amount, vendor=excluded.vendor,
          due_date=excluded.due_date, delivered=excluded.delivered,
          claim_hash=excluded.claim_hash, paid=excluded.paid`,
      )
      .run(
        invoice.id,
        invoice.invoiceNumber,
        invoice.debtor,
        invoice.amount,
        invoice.vendor,
        invoice.dueDate,
        Number(invoice.delivered),
        invoice.claimHash,
        Number(invoice.paid),
      );
  }

  listInvoices(): InvoiceRecord[] {
    return (
      this.database
        .prepare('SELECT * FROM invoices ORDER BY id')
        .all() as Record<string, unknown>[]
    ).map(invoiceFromRow);
  }

  upsertAction(action: ActionRecord): void {
    this.database
      .prepare(
        `INSERT INTO actions
          (action_id, invoice_id, agent, amount, claim_hash, reasoning,
           reasoning_hash, bond_required, bond_posted, window_end, status,
           challenger, transactions_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(action_id) DO UPDATE SET
          invoice_id=excluded.invoice_id, agent=excluded.agent,
          amount=excluded.amount, claim_hash=excluded.claim_hash,
          reasoning=excluded.reasoning, reasoning_hash=excluded.reasoning_hash,
          bond_required=excluded.bond_required, bond_posted=excluded.bond_posted,
          window_end=excluded.window_end, status=excluded.status,
          challenger=excluded.challenger,
          transactions_json=excluded.transactions_json`,
      )
      .run(
        action.actionId,
        action.invoiceId,
        action.agent,
        action.amount,
        action.claimHash,
        action.reasoning,
        action.reasoningHash,
        action.bondRequired,
        action.bondPosted,
        action.windowEnd,
        action.status,
        action.challenger,
        JSON.stringify(action.transactions),
      );
  }

  listActions(): ActionRecord[] {
    return (
      this.database
        .prepare('SELECT * FROM actions ORDER BY action_id')
        .all() as Record<string, unknown>[]
    ).map(actionFromRow);
  }

  action(actionId: number): ActionRecord | undefined {
    const row = this.database
      .prepare('SELECT * FROM actions WHERE action_id = ?')
      .get(actionId) as Record<string, unknown> | undefined;
    return row ? actionFromRow(row) : undefined;
  }

  upsertEvent(event: EventRecord): void {
    this.database
      .prepare(
        `INSERT INTO events
          (contract, event_index, event_type, action_id, data, transaction_hash)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(contract, event_index) DO UPDATE SET
          event_type=excluded.event_type, action_id=excluded.action_id,
          data=excluded.data,
          transaction_hash=COALESCE(excluded.transaction_hash, transaction_hash)`,
      )
      .run(
        event.contract,
        event.eventIndex,
        event.eventType,
        event.actionId,
        event.data,
        event.transactionHash,
      );
  }

  eventsForAction(actionId: number): EventRecord[] {
    return this.database
      .prepare(
        `SELECT contract, event_index AS eventIndex,
          event_type AS eventType, action_id AS actionId, data,
          transaction_hash AS transactionHash
         FROM events WHERE action_id = ? ORDER BY event_index`,
      )
      .all(actionId) as EventRecord[];
  }

  slashEvents(): EventRecord[] {
    return this.database
      .prepare(
        `SELECT contract, event_index AS eventIndex,
          event_type AS eventType, action_id AS actionId, data,
          transaction_hash AS transactionHash
         FROM events WHERE event_type = 'ResolvedSlash'
         ORDER BY event_index`,
      )
      .all() as EventRecord[];
  }

  expiredCleanActions(nowMs: number): number[] {
    return (
      this.database
        .prepare(
          `SELECT action_id FROM actions
           WHERE status = 'Executed' AND window_end < ?`,
        )
        .all(nowMs) as { action_id: number }[]
    ).map((row) => row.action_id);
  }

  setReputation(
    agent: string,
    clean: number,
    slashed: number,
    score: number,
  ): void {
    this.database
      .prepare(
        `INSERT INTO agent_reputation (agent, clean, slashed, score)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(agent) DO UPDATE SET clean=excluded.clean,
          slashed=excluded.slashed, score=excluded.score`,
      )
      .run(agent, clean, slashed, score);
  }

  reputation(agent: string): Record<string, unknown> | undefined {
    return this.database
      .prepare(
        'SELECT agent, clean, slashed, score FROM agent_reputation WHERE agent = ?',
      )
      .get(agent) as Record<string, unknown> | undefined;
  }

  setReserve(balance: string): void {
    this.database
      .prepare(
        `INSERT INTO reserve (singleton, balance) VALUES (1, ?)
         ON CONFLICT(singleton) DO UPDATE SET balance=excluded.balance`,
      )
      .run(balance);
  }

  reserve(): string {
    const row = this.database
      .prepare('SELECT balance FROM reserve WHERE singleton = 1')
      .get() as { balance: string } | undefined;
    return row?.balance ?? '0';
  }
}
