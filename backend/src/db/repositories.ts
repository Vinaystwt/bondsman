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
  challengerType:
    | 'watchdog'
    | 'manual'
    | 'external-wallet'
    | null;
  challengeSigning?: 'backend-key' | 'watchdog-key' | 'external-wallet' | null;
  controllerHash?: string;
  duplicateProven?: boolean;
  faultClass?: 'duplicate_claim' | 'delivery_contradiction';
  evidenceRoot?: string | null;
  reservedForManual: boolean;
  transactions: Record<string, string>;
}

export interface WatchdogCatchRecord {
  actionId: number;
  reward: string;
  reasoning: string;
  challengeTx: string;
  resolveTx: string;
  timestamp: string;
}

export interface WatchdogSummary {
  running: boolean;
  account: string | null;
  recentCatches: WatchdogCatchRecord[];
  totalRewardEarned: string;
}

export type DemoJobKind = 'challenge' | 'arm' | 'watchdog';

export interface DemoJobRecord {
  id: string;
  kind: DemoJobKind;
  actionId: number | null;
  status: string;
  challengeTx: string | null;
  resolveTx: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EventRecord {
  contract: string;
  eventIndex: number;
  eventType: string;
  actionId: number | null;
  data: string;
  transactionHash: string | null;
}

export interface DeliveryAttestationRecord {
  evidenceRoot: string;
  invoiceId: number;
  actionId: number | null;
  eventType: 'delivery_rejected' | 'goods_not_received';
  occurredAt: number;
  buyerPublicKey: string;
  signature: string;
  payload: Record<string, unknown>;
  receivedAt: number;
  usedActionId: number | null;
}

export interface PaidQuoteRecord {
  quoteHash: string;
  actionType: 'invoice_payout';
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
  verifier: string;
  amount: string;
  requiredBond: string;
  challengeWindow: number;
  quoteExpiry: string;
  payer: string | null;
  settlementTx: string;
  paymentAmount: string;
  facilitator: string;
  status: 'paid' | 'consuming' | 'consumed' | 'failed';
  submitPayloadHash: string | null;
  consumedActionId: number | null;
  createdAt: number;
  consumedAt: number | null;
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
    challengerType:
      row.challenger_type === null
        ? null
        : (String(row.challenger_type) as
            | 'watchdog'
            | 'manual'
            | 'external-wallet'),
    challengeSigning:
      row.challenge_signing === null
        ? null
        : (String(row.challenge_signing) as
            | 'backend-key'
            | 'watchdog-key'
            | 'external-wallet'),
    controllerHash: String(row.controller_hash),
    duplicateProven: Boolean(row.duplicate_proven),
    faultClass:
      String(row.fault_class ?? 'duplicate_claim') as
        | 'duplicate_claim'
        | 'delivery_contradiction',
    evidenceRoot: row.evidence_root === null ? null : String(row.evidence_root),
    reservedForManual: Boolean(row.reserved_for_manual),
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
           challenger, challenger_type, challenge_signing, controller_hash,
           duplicate_proven, fault_class, evidence_root, reserved_for_manual, transactions_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(action_id) DO UPDATE SET
          invoice_id=excluded.invoice_id, agent=excluded.agent,
          amount=excluded.amount, claim_hash=excluded.claim_hash,
          reasoning=excluded.reasoning, reasoning_hash=excluded.reasoning_hash,
          bond_required=excluded.bond_required, bond_posted=excluded.bond_posted,
          window_end=excluded.window_end, status=excluded.status,
          challenger=excluded.challenger,
          challenger_type=excluded.challenger_type,
          challenge_signing=excluded.challenge_signing,
          controller_hash=excluded.controller_hash,
          duplicate_proven=excluded.duplicate_proven,
          fault_class=excluded.fault_class,
          evidence_root=excluded.evidence_root,
          reserved_for_manual=excluded.reserved_for_manual,
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
        action.challengerType,
        action.challengeSigning ?? null,
        action.controllerHash ?? '',
        Number(action.duplicateProven ?? false),
        action.faultClass ?? 'duplicate_claim',
        action.evidenceRoot ?? null,
        Number(action.reservedForManual),
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

  eventCursor(contract: string): number | undefined {
    const row = this.database
      .prepare('SELECT last_event_index FROM event_cursors WHERE contract = ?')
      .get(contract) as { last_event_index: number } | undefined;
    return row?.last_event_index;
  }

  advanceEventCursor(contract: string, eventIndex: number): void {
    this.database
      .prepare(
        `INSERT INTO event_cursors (contract, last_event_index, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(contract) DO UPDATE SET
           last_event_index = MAX(last_event_index, excluded.last_event_index),
           updated_at = excluded.updated_at`,
      )
      .run(contract, eventIndex, Date.now());
  }

  setSystemState(key: string, value: unknown): void {
    this.database
      .prepare(
        `INSERT INTO system_state (state_key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(state_key) DO UPDATE SET
           value_json = excluded.value_json, updated_at = excluded.updated_at`,
      )
      .run(key, JSON.stringify(value), Date.now());
  }

  systemState<T>(key: string): { value: T; updatedAt: number } | undefined {
    const row = this.database
      .prepare('SELECT value_json, updated_at FROM system_state WHERE state_key = ?')
      .get(key) as { value_json: string; updated_at: number } | undefined;
    if (!row) return undefined;
    return { value: JSON.parse(row.value_json) as T, updatedAt: row.updated_at };
  }

  upsertDeliveryAttestation(attestation: DeliveryAttestationRecord): void {
    this.database
      .prepare(
        `INSERT INTO delivery_attestations
         (evidence_root, invoice_id, action_id, event_type, occurred_at,
          buyer_public_key, signature, payload_json, received_at, used_action_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(evidence_root) DO UPDATE SET
          action_id=excluded.action_id, event_type=excluded.event_type,
          occurred_at=excluded.occurred_at, buyer_public_key=excluded.buyer_public_key,
          signature=excluded.signature, payload_json=excluded.payload_json,
          received_at=excluded.received_at, used_action_id=excluded.used_action_id`,
      )
      .run(
        attestation.evidenceRoot, attestation.invoiceId, attestation.actionId,
        attestation.eventType, attestation.occurredAt, attestation.buyerPublicKey,
        attestation.signature, JSON.stringify(attestation.payload), attestation.receivedAt,
        attestation.usedActionId,
      );
  }

  deliveryAttestationForAction(actionId: number): DeliveryAttestationRecord | undefined {
    const row = this.database.prepare(
      'SELECT * FROM delivery_attestations WHERE action_id = ? ORDER BY occurred_at DESC LIMIT 1',
    ).get(actionId) as Record<string, unknown> | undefined;
    return row ? deliveryAttestationFromRow(row) : undefined;
  }

  upsertPaidQuote(quote: PaidQuoteRecord): void {
    this.database.prepare(
      `INSERT INTO paid_quotes
       (quote_hash, action_type, fault_class, verifier, amount, required_bond,
        challenge_window, quote_expiry, payer, settlement_tx, payment_amount,
        facilitator, status, submit_payload_hash, consumed_action_id,
        created_at, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(quote_hash) DO UPDATE SET
        action_type=excluded.action_type, fault_class=excluded.fault_class,
        verifier=excluded.verifier, amount=excluded.amount,
        required_bond=excluded.required_bond,
        challenge_window=excluded.challenge_window,
        quote_expiry=excluded.quote_expiry, payer=excluded.payer,
        settlement_tx=excluded.settlement_tx,
        payment_amount=excluded.payment_amount,
        facilitator=excluded.facilitator,
        status=paid_quotes.status,
        submit_payload_hash=paid_quotes.submit_payload_hash,
        consumed_action_id=paid_quotes.consumed_action_id,
        consumed_at=paid_quotes.consumed_at`,
    ).run(
      quote.quoteHash, quote.actionType, quote.faultClass, quote.verifier,
      quote.amount, quote.requiredBond, quote.challengeWindow,
      quote.quoteExpiry, quote.payer, quote.settlementTx, quote.paymentAmount,
      quote.facilitator, quote.status, quote.submitPayloadHash,
      quote.consumedActionId, quote.createdAt, quote.consumedAt,
    );
  }

  paidQuote(quoteHash: string): PaidQuoteRecord | undefined {
    const row = this.database.prepare(
      'SELECT * FROM paid_quotes WHERE quote_hash = ?',
    ).get(quoteHash) as Record<string, unknown> | undefined;
    return row ? paidQuoteFromRow(row) : undefined;
  }

  paidQuoteForAction(actionId: number): PaidQuoteRecord | undefined {
    const row = this.database.prepare(
      'SELECT * FROM paid_quotes WHERE consumed_action_id = ?',
    ).get(actionId) as Record<string, unknown> | undefined;
    return row ? paidQuoteFromRow(row) : undefined;
  }

  reservePaidQuote(quoteHash: string, submitPayloadHash: string): boolean {
    const result = this.database.prepare(
      `UPDATE paid_quotes
       SET status = 'consuming', submit_payload_hash = ?
       WHERE quote_hash = ? AND status = 'paid' AND consumed_action_id IS NULL`,
    ).run(submitPayloadHash, quoteHash);
    return result.changes === 1;
  }

  releasePaidQuote(quoteHash: string): void {
    this.database.prepare(
      `UPDATE paid_quotes
       SET status = 'paid', submit_payload_hash = NULL
       WHERE quote_hash = ? AND status = 'consuming'`,
    ).run(quoteHash);
  }

  consumePaidQuote(quoteHash: string, actionId: number): void {
    this.database.prepare(
      `UPDATE paid_quotes
       SET status = 'consumed', consumed_action_id = ?, consumed_at = ?
       WHERE quote_hash = ? AND status = 'consuming'`,
    ).run(actionId, Date.now(), quoteHash);
  }

  useSubmitAuthorizationNonce(input: {
    nonceHash: string;
    payer: string;
    quoteHash: string;
  }): boolean {
    try {
      this.database.prepare(
        `INSERT INTO submit_authorization_nonces
         (nonce_hash, payer, quote_hash, created_at)
         VALUES (?, ?, ?, ?)`,
      ).run(input.nonceHash, input.payer, input.quoteHash, Date.now());
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
      ) {
        return false;
      }
      throw error;
    }
  }

  useDeliveryEvidence(evidenceRoot: string, actionId: number): boolean {
    const result = this.database.prepare(
      `UPDATE delivery_attestations SET used_action_id = ?
       WHERE evidence_root = ? AND (used_action_id IS NULL OR used_action_id = ?)`,
    ).run(actionId, evidenceRoot, actionId);
    return result.changes === 1;
  }

  releaseDeliveryEvidence(evidenceRoot: string, actionId: number): void {
    this.database.prepare(
      `UPDATE delivery_attestations SET used_action_id = NULL
       WHERE evidence_root = ? AND used_action_id = ?`,
    ).run(evidenceRoot, actionId);
  }

  cacheProof(controllerHash: string, actionId: number, proof: unknown): void {
    this.database.prepare(
      `INSERT INTO proof_cache (controller_hash, action_id, proof_json, cached_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(controller_hash, action_id) DO UPDATE SET
        proof_json=excluded.proof_json, cached_at=excluded.cached_at`,
    ).run(controllerHash, actionId, JSON.stringify(proof), Date.now());
  }

  proof(controllerHash: string, actionId: number): unknown | undefined {
    const row = this.database.prepare(
      'SELECT proof_json FROM proof_cache WHERE controller_hash = ? AND action_id = ?',
    ).get(controllerHash, actionId) as { proof_json: string } | undefined;
    return row ? JSON.parse(row.proof_json) : undefined;
  }

  cacheReceipt(controllerHash: string, actionId: number, receipt: unknown): void {
    this.database.prepare(
      `INSERT INTO signed_receipts (controller_hash, action_id, receipt_json, issued_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(controller_hash, action_id) DO UPDATE SET
        receipt_json=excluded.receipt_json, issued_at=excluded.issued_at`,
    ).run(controllerHash, actionId, JSON.stringify(receipt), Date.now());
  }

  receipt(controllerHash: string, actionId: number): unknown | undefined {
    const row = this.database.prepare(
      'SELECT receipt_json FROM signed_receipts WHERE controller_hash = ? AND action_id = ?',
    ).get(controllerHash, actionId) as { receipt_json: string } | undefined;
    return row ? JSON.parse(row.receipt_json) : undefined;
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
         FROM events WHERE event_type IN ('ResolvedSlash', 'ResolvedSlashV2')
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

  recordWatchdogCatch(record: WatchdogCatchRecord): void {
    this.database
      .prepare(
        `INSERT INTO watchdog_catches
          (action_id, reward, reasoning, challenge_tx, resolve_tx, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(action_id) DO UPDATE SET
          reward=excluded.reward, reasoning=excluded.reasoning,
          challenge_tx=excluded.challenge_tx,
          resolve_tx=excluded.resolve_tx, timestamp=excluded.timestamp`,
      )
      .run(
        record.actionId,
        record.reward,
        record.reasoning,
        record.challengeTx,
        record.resolveTx,
        record.timestamp,
      );
  }

  hasWatchdogCatch(actionId: number): boolean {
    return Boolean(
      this.database
        .prepare(
          'SELECT 1 FROM watchdog_catches WHERE action_id = ?',
        )
        .get(actionId),
    );
  }

  watchdogCatch(actionId: number): WatchdogCatchRecord | undefined {
    const row = this.database
      .prepare(
        `SELECT action_id, reward, reasoning, challenge_tx, resolve_tx,
          timestamp FROM watchdog_catches WHERE action_id = ?`,
      )
      .get(actionId) as
      | {
          action_id: number;
          reward: string;
          reasoning: string;
          challenge_tx: string;
          resolve_tx: string;
          timestamp: string;
        }
      | undefined;
    return row
      ? {
          actionId: row.action_id,
          reward: row.reward,
          reasoning: row.reasoning,
          challengeTx: row.challenge_tx,
          resolveTx: row.resolve_tx,
          timestamp: row.timestamp,
        }
      : undefined;
  }

  setWatchdogHeartbeat(account: string, nowMs: number): void {
    this.database
      .prepare(
        `INSERT INTO watchdog_status (singleton, account, heartbeat_at)
         VALUES (1, ?, ?)
         ON CONFLICT(singleton) DO UPDATE SET
          account=excluded.account, heartbeat_at=excluded.heartbeat_at`,
      )
      .run(account, nowMs);
  }

  watchdogSummary(
    nowMs: number = Date.now(),
    heartbeatMaxAgeMs = 600_000,
  ): WatchdogSummary {
    const status = this.database
      .prepare(
        'SELECT account, heartbeat_at FROM watchdog_status WHERE singleton = 1',
      )
      .get() as
      | { account: string; heartbeat_at: number }
      | undefined;
    const recentCatches = (
      this.database
        .prepare(
          `SELECT action_id, reward, reasoning, challenge_tx, resolve_tx,
            timestamp FROM watchdog_catches
           ORDER BY timestamp DESC LIMIT 20`,
        )
        .all() as {
        action_id: number;
        reward: string;
        reasoning: string;
        challenge_tx: string;
        resolve_tx: string;
        timestamp: string;
      }[]
    ).map((row) => ({
      actionId: row.action_id,
      reward: row.reward,
      reasoning: row.reasoning,
      challengeTx: row.challenge_tx,
      resolveTx: row.resolve_tx,
      timestamp: row.timestamp,
    }));
    const totalRewardEarned = (
      this.database
        .prepare('SELECT reward FROM watchdog_catches')
        .all() as { reward: string }[]
    )
      .reduce((total, row) => total + BigInt(row.reward), 0n)
      .toString();
    return {
      running: Boolean(
        status && nowMs - status.heartbeat_at <= heartbeatMaxAgeMs,
      ),
      account: status?.account ?? null,
      recentCatches,
      totalRewardEarned,
    };
  }

  createDemoJob(input: {
    id: string;
    kind: DemoJobKind;
    actionId?: number | null;
    status: string;
  }): DemoJobRecord {
    const now = Date.now();
    this.database
      .prepare(
        `INSERT INTO demo_jobs
          (id, kind, action_id, status, challenge_tx, resolve_tx, error, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
      )
      .run(input.id, input.kind, input.actionId ?? null, input.status, now, now);
    return this.demoJob(input.id)!;
  }

  demoJob(id: string): DemoJobRecord | undefined {
    const row = this.database
      .prepare('SELECT * FROM demo_jobs WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? demoJobFromRow(row) : undefined;
  }

  activeChallengeJob(actionId: number): DemoJobRecord | undefined {
    const row = this.database
      .prepare(
        `SELECT * FROM demo_jobs
         WHERE kind = 'challenge' AND action_id = ?
           AND status NOT IN ('resolved', 'failed')
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(actionId) as Record<string, unknown> | undefined;
    return row ? demoJobFromRow(row) : undefined;
  }

  updateDemoJob(
    id: string,
    update: Partial<Pick<DemoJobRecord, 'actionId' | 'status' | 'challengeTx' | 'resolveTx' | 'error'>>,
  ): DemoJobRecord | undefined {
    const current = this.demoJob(id);
    if (!current) return undefined;
    this.database
      .prepare(
        `UPDATE demo_jobs SET action_id = ?, status = ?, challenge_tx = ?,
          resolve_tx = ?, error = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        update.actionId === undefined ? current.actionId : update.actionId,
        update.status ?? current.status,
        update.challengeTx === undefined ? current.challengeTx : update.challengeTx,
        update.resolveTx === undefined ? current.resolveTx : update.resolveTx,
        update.error === undefined ? current.error : update.error,
        Date.now(),
        id,
      );
    return this.demoJob(id);
  }
}

function demoJobFromRow(row: Record<string, unknown>): DemoJobRecord {
  return {
    id: String(row.id),
    kind: String(row.kind) as DemoJobKind,
    actionId: row.action_id === null ? null : Number(row.action_id),
    status: String(row.status),
    challengeTx: row.challenge_tx === null ? null : String(row.challenge_tx),
    resolveTx: row.resolve_tx === null ? null : String(row.resolve_tx),
    error: row.error === null ? null : String(row.error),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function deliveryAttestationFromRow(
  row: Record<string, unknown>,
): DeliveryAttestationRecord {
  return {
    evidenceRoot: String(row.evidence_root),
    invoiceId: Number(row.invoice_id),
    actionId: row.action_id === null ? null : Number(row.action_id),
    eventType: String(row.event_type) as DeliveryAttestationRecord['eventType'],
    occurredAt: Number(row.occurred_at),
    buyerPublicKey: String(row.buyer_public_key),
    signature: String(row.signature),
    payload: JSON.parse(String(row.payload_json)) as Record<string, unknown>,
    receivedAt: Number(row.received_at),
    usedActionId: row.used_action_id === null ? null : Number(row.used_action_id),
  };
}

function paidQuoteFromRow(row: Record<string, unknown>): PaidQuoteRecord {
  return {
    quoteHash: String(row.quote_hash),
    actionType: String(row.action_type) as PaidQuoteRecord['actionType'],
    faultClass: String(row.fault_class) as PaidQuoteRecord['faultClass'],
    verifier: String(row.verifier),
    amount: String(row.amount),
    requiredBond: String(row.required_bond),
    challengeWindow: Number(row.challenge_window),
    quoteExpiry: String(row.quote_expiry),
    payer: row.payer === null ? null : String(row.payer),
    settlementTx: String(row.settlement_tx),
    paymentAmount: String(row.payment_amount),
    facilitator: String(row.facilitator),
    status: String(row.status) as PaidQuoteRecord['status'],
    submitPayloadHash:
      row.submit_payload_hash === null ? null : String(row.submit_payload_hash),
    consumedActionId:
      row.consumed_action_id === null ? null : Number(row.consumed_action_id),
    createdAt: Number(row.created_at),
    consumedAt: row.consumed_at === null ? null : Number(row.consumed_at),
  };
}
