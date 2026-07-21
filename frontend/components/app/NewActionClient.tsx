'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnalysisResult from '@/components/assurance/AnalysisResult';
import ScenarioForm from '@/components/assurance/ScenarioForm';
import { rememberActionId } from '@/components/app/RecentActions';
import CopyHash from '@/components/ui/CopyHash';
import { Label, StatusPill } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/States';
import { clientApi } from '@/lib/api';
import { findActionByQuoteHash, shouldRecoverSubmit } from '@/lib/action-monitor';
import { formatIsoUtc, formatWcspr, truncateHash } from '@/lib/format';
import type { CasperWalletState } from '@/lib/casper-wallet';
import type {
  AssuranceAnalysis,
  AssuranceAnalyzeRequest,
  AssuranceTemplate,
  PaidQuoteResponse,
  X402PaymentResponse,
} from '@/lib/types';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ProbeState =
  | { kind: 'idle' }
  | { kind: 'loading'; requestedAt: string }
  | {
      kind: 'ready';
      requestedAt: string;
      status: number;
      x402?: X402PaymentResponse;
      other?: unknown;
      error?: string;
    };

type PaymentState =
  | { kind: 'idle' }
  | { kind: 'payload_constructing' }
  | { kind: 'awaiting_wallet' }
  | { kind: 'wallet_signature_received'; authorization: { validBefore: string } }
  | { kind: 'verification_pending'; authorization: { validBefore: string } }
  | { kind: 'settled'; quote: PaidQuoteResponse }
  | { kind: 'rejected'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'malformed'; message: string }
  | { kind: 'failed'; message: string };

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'signing' }
  | { kind: 'submitting' }
  | { kind: 'created'; actionId: number }
  | { kind: 'recovery_pending'; message: string; quoteHash: string }
  | { kind: 'failed'; message: string };

interface Props {
  templates: AssuranceTemplate[];
  liveModelAvailable: boolean;
  liveQuoteProbeAvailable: boolean;
}

const STEP_LABELS: { step: Step; label: string }[] = [
  { step: 1, label: 'Choose policy' },
  { step: 2, label: 'Describe action' },
  { step: 3, label: 'Calculate policy' },
  { step: 4, label: 'Review parties' },
  { step: 5, label: 'Connect payer' },
  { step: 6, label: 'Payment terms' },
  { step: 7, label: 'Paid quote' },
];

const EMPTY_WALLET: CasperWalletState = {
  available: false,
  connected: false,
  locked: false,
  publicKey: null,
  payerAccountAddress: null,
  supports: [],
  missingMethods: [],
  version: null,
};

const FLOW_KEY = 'bondsman.newAction.v2';
const OLD_FLOW_KEY = 'bondsman.newAction.v1';
const RECOVERY_SCHEMA_VERSION = 1;

interface PaidQuoteRecoveryRecord {
  schemaVersion: 1;
  quoteHash: string;
  quoteExpiry: string;
  payerAccount: string;
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
  principalAmount: string;
  selectedTemplateId: string;
  scenarioHash: string | null;
  paymentSettlementTx: string;
  actionId: number | null;
  savedAt: string;
}

interface SubmitAttempt {
  quoteHash: string;
  authorization: {
    publicKey: string;
    timestamp: number;
    nonce: string;
    signature: string;
  };
  buyerPublicKey: string;
  eventType: 'delivery_rejected' | 'goods_not_received';
  idempotencyKey: string;
}

const QUOTE_HASH_RE = /^0x[0-9a-f]{64}$/i;
const ACCOUNT_HASH_RE = /^00[0-9a-f]{64}$/i;
const TX_HASH_RE = /^[0-9a-f]{64}$/i;

function isExecutableFaultClass(value: string): value is PaidQuoteRecoveryRecord['faultClass'] {
  return value === 'duplicate_claim' || value === 'delivery_contradiction';
}

function isPositiveAtomic(value: string): boolean {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function schemaRecord(value: unknown): PaidQuoteRecoveryRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== RECOVERY_SCHEMA_VERSION) return null;
  if (!QUOTE_HASH_RE.test(String(record.quoteHash ?? ''))) return null;
  if (!Date.parse(String(record.quoteExpiry ?? ''))) return null;
  if (Date.parse(String(record.quoteExpiry)) <= Date.now()) return null;
  if (!ACCOUNT_HASH_RE.test(String(record.payerAccount ?? ''))) return null;
  if (!isExecutableFaultClass(String(record.faultClass))) return null;
  if (!isPositiveAtomic(String(record.principalAmount ?? ''))) return null;
  if (typeof record.selectedTemplateId !== 'string' || record.selectedTemplateId.length === 0) return null;
  if (record.scenarioHash !== null && typeof record.scenarioHash !== 'string') return null;
  if (!TX_HASH_RE.test(String(record.paymentSettlementTx ?? ''))) return null;
  if (record.actionId !== null && typeof record.actionId !== 'number') return null;
  if (!Date.parse(String(record.savedAt ?? ''))) return null;
  return {
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    quoteHash: String(record.quoteHash),
    quoteExpiry: String(record.quoteExpiry),
    payerAccount: String(record.payerAccount),
    faultClass: String(record.faultClass) as PaidQuoteRecoveryRecord['faultClass'],
    principalAmount: String(record.principalAmount),
    selectedTemplateId: String(record.selectedTemplateId),
    scenarioHash: record.scenarioHash === null ? null : String(record.scenarioHash),
    paymentSettlementTx: String(record.paymentSettlementTx),
    actionId: record.actionId === null ? null : Number(record.actionId),
    savedAt: String(record.savedAt),
  };
}

function quoteFromRecovery(
  record: PaidQuoteRecoveryRecord,
  analysis: AssuranceAnalysis | null,
): PaidQuoteResponse {
  return {
    actionType: 'paid_assurance_action',
    faultClass: record.faultClass,
    verifier: analysis?.policy.verifier ?? 'recovered',
    riskTier: analysis?.policy.riskTier ?? 'recovered',
    requiredBond: analysis?.policy.estimatedMinimumBond ?? record.principalAmount,
    quotedMinimumBond: analysis?.manifest.quoteRequestShape?.amount ?? record.principalAmount,
    bondSemantics: 'recovered paid quote',
    challengeWindow: analysis?.policy.challengeWindowSeconds ?? 0,
    agentReputation: 0,
    policyModule: analysis?.policy.authority ?? 'recovered',
    policySnapshot: {},
    quoteExpiry: record.quoteExpiry,
    quoteHash: record.quoteHash,
    paymentReceipt: {
      network: 'casper-test',
      asset: 'WCSPR',
      amount: record.principalAmount,
      transaction: record.paymentSettlementTx,
      facilitator: 'recovered',
      payer: record.payerAccount,
      settled: true,
    },
  };
}

export default function NewActionClient({
  templates,
  liveModelAvailable,
  liveQuoteProbeAvailable,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const defaultTemplate =
    templates.find((template) => template.id === requestedTemplate && template.executableNow) ??
    templates.find((template) => template.id === 'invoice_delivery') ??
    templates.find((template) => template.executableNow) ??
    null;

  const [selectedId, setSelectedId] = useState<string | null>(defaultTemplate?.id ?? null);
  const [step, setStep] = useState<Step>(defaultTemplate ? 2 : 1);
  const [analysis, setAnalysis] = useState<AssuranceAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probe, setProbe] = useState<ProbeState>({ kind: 'idle' });
  const [wallet, setWallet] = useState<CasperWalletState>(EMPTY_WALLET);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({ kind: 'idle' });
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });
  const [recoveryRecord, setRecoveryRecord] = useState<PaidQuoteRecoveryRecord | null>(null);
  const stepRefs = useRef<Record<number, HTMLElement | null>>({});
  const paymentBusyRef = useRef(false);
  const requirementBusyRef = useRef(false);
  const submitBusyRef = useRef(false);
  const submitAttemptRef = useRef<SubmitAttempt | null>(null);

  const executable = useMemo(
    () => templates.filter((template) => template.executableNow),
    [templates],
  );
  const primary = executable.find((template) => template.id === 'invoice_delivery') ?? executable[0] ?? null;
  const advanced = executable.filter((template) => template.id !== primary?.id);
  const selected = templates.find((template) => template.id === selectedId) ?? null;
  const quoteShape = analysis?.manifest.quoteRequestShape ?? null;
  const canProbe = Boolean(quoteShape && liveQuoteProbeAvailable);
  const requirement = probe.kind === 'ready' ? probe.x402?.payment.accepts[0] ?? null : null;
  const paidQuote = payment.kind === 'settled' ? payment.quote : null;
  const payerMismatch = Boolean(
    paidQuote?.paymentReceipt.payer &&
      wallet.connected &&
      wallet.payerAccountAddress &&
      wallet.payerAccountAddress.toLowerCase() !== paidQuote.paymentReceipt.payer.toLowerCase(),
  );

  useEffect(() => {
    stepRefs.current[step]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    import('@/lib/casper-wallet').then(({ readCasperWalletState }) => readCasperWalletState()).then((state) => {
      if (!cancelled) setWallet(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.removeItem(OLD_FLOW_KEY);
      const saved = schemaRecord(JSON.parse(window.localStorage.getItem(FLOW_KEY) ?? 'null'));
      const restoredTemplate = saved
        ? templates.find((template) => template.id === saved.selectedTemplateId)
        : null;
      if (saved && restoredTemplate?.supportedFaultClasses.includes(saved.faultClass)) {
        setSelectedId(saved.selectedTemplateId);
        setRecoveryRecord(saved);
        setPayment({ kind: 'settled', quote: quoteFromRecovery(saved, null) });
        setStep(7);
      }
      if (typeof saved?.actionId === 'number') {
        setSubmit({ kind: 'created', actionId: saved.actionId });
      }
    } catch {
      /* ignore malformed recovery state */
    }
  }, [templates]);

  function clearPersistedFlow() {
    try {
      window.localStorage.removeItem(FLOW_KEY);
      window.localStorage.removeItem(OLD_FLOW_KEY);
    } catch {
      /* noncritical local recovery */
    }
    setRecoveryRecord(null);
    submitAttemptRef.current = null;
  }

  function persistPaidQuote(quote: PaidQuoteResponse, actionId: number | null) {
    if (!selectedId || !quote.paymentReceipt.payer || !quote.paymentReceipt.settled) return;
    const record: PaidQuoteRecoveryRecord = {
      schemaVersion: RECOVERY_SCHEMA_VERSION,
      quoteHash: quote.quoteHash,
      quoteExpiry: quote.quoteExpiry,
      payerAccount: quote.paymentReceipt.payer,
      faultClass: quote.faultClass,
      principalAmount: quoteShape?.amount ?? quote.paymentReceipt.amount,
      selectedTemplateId: selectedId,
      scenarioHash: analysis?.scenarioHash ?? analysis?.manifest.scenarioHash ?? null,
      paymentSettlementTx: quote.paymentReceipt.transaction,
      actionId,
      savedAt: new Date().toISOString(),
    };
    if (!schemaRecord(record)) return;
    try {
      window.localStorage.setItem(FLOW_KEY, JSON.stringify(record));
      setRecoveryRecord(record);
    } catch {
      /* noncritical local recovery */
    }
  }

  function chooseTemplate(id: string) {
    clearPersistedFlow();
    setSelectedId(id);
    setAnalysis(null);
    setProbe({ kind: 'idle' });
    setPayment({ kind: 'idle' });
    setSubmit({ kind: 'idle' });
    setError(null);
    setStep(2);
  }

  async function runAnalysis(body: AssuranceAnalyzeRequest) {
    clearPersistedFlow();
    setRunning(true);
    setError(null);
    setProbe({ kind: 'idle' });
    setPayment({ kind: 'idle' });
    setSubmit({ kind: 'idle' });
    try {
      const result = await clientApi.assuranceAnalyze(body);
      setAnalysis(result);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setRunning(false);
    }
  }

  async function requestPaymentRequirement() {
    if (!quoteShape || requirementBusyRef.current || probe.kind === 'loading') return;
    requirementBusyRef.current = true;
    const requestedAt = new Date().toISOString();
    setProbe({ kind: 'loading', requestedAt });
    try {
      const result = await clientApi.liveQuoteProbe({
        amount: quoteShape.amount,
        faultClass: quoteShape.faultClass,
      });
      setProbe({ kind: 'ready', requestedAt, ...result });
      setStep(6);
    } finally {
      requirementBusyRef.current = false;
    }
  }

  async function connectWallet() {
    setWalletBusy(true);
    setWalletError(null);
    try {
      const { connectCasperWallet } = await import('@/lib/casper-wallet');
      setWallet(await connectCasperWallet());
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Wallet connection failed.');
    } finally {
      setWalletBusy(false);
    }
  }

  async function settlePaidQuote() {
    if (!quoteShape || !requirement || !wallet.publicKey || paymentBusyRef.current) return;
    paymentBusyRef.current = true;
    setPayment({ kind: 'payload_constructing' });
    setWalletError(null);
    try {
      const {
        assertUsableWallet,
        createX402PaymentSignature,
        readCasperWalletState,
      } = await import('@/lib/casper-wallet');
      const freshWallet = await readCasperWalletState();
      setWallet(freshWallet);
      assertUsableWallet(freshWallet);
      if (!freshWallet.publicKey) throw new Error('Connect Casper Wallet to continue.');
      setPayment({ kind: 'awaiting_wallet' });
      const paymentSignature = await createX402PaymentSignature({
        publicKey: freshWallet.publicKey,
        requirement,
        resourceUrl: new URL('/v1/actions/quote', window.location.origin).toString(),
      });
      setPayment({
        kind: 'wallet_signature_received',
        authorization: {
          validBefore: paymentSignature.authorization.validBefore,
        },
      });
      setPayment({
        kind: 'verification_pending',
        authorization: {
          validBefore: paymentSignature.authorization.validBefore,
        },
      });
      const quote = await clientApi.paidQuote(
        { amount: quoteShape.amount, faultClass: quoteShape.faultClass },
        paymentSignature.header,
      );
      setPayment({ kind: 'settled', quote });
      persistPaidQuote(quote, null);
      setSubmit({ kind: 'idle' });
      setStep(7);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment settlement failed.';
      const lower = message.toLowerCase();
      setPayment({
        kind: lower.includes('expired')
          ? 'expired'
          : lower.includes('malformed')
            ? 'malformed'
            : lower.includes('rejected') || lower.includes('cancel')
              ? 'rejected'
              : 'failed',
        message,
      });
    } finally {
      paymentBusyRef.current = false;
    }
  }

  function validatePaidQuoteBeforeSubmit(quote: PaidQuoteResponse, freshWallet: CasperWalletState): string | null {
    if (!QUOTE_HASH_RE.test(quote.quoteHash)) return 'Recovered quote hash is malformed. Start a new action.';
    if (Date.parse(quote.quoteExpiry) <= Date.now()) {
      clearPersistedFlow();
      setPayment({ kind: 'expired', message: 'Paid quote expired. Request a fresh payment requirement.' });
      return 'Paid quote expired. Request a fresh payment requirement.';
    }
    if (!selected) return 'Choose the original policy before submitting this paid quote.';
    if (!selected.supportedFaultClasses.includes(quote.faultClass)) {
      return 'The selected policy does not match this paid quote fault class.';
    }
    if (!isPositiveAtomic(quote.paymentReceipt.amount)) {
      return 'Paid quote amount is invalid. Start a new action.';
    }
    if (!quote.paymentReceipt.settled || !quote.paymentReceipt.payer) {
      return 'Paid quote does not have a settled payer receipt.';
    }
    if (
      freshWallet.payerAccountAddress?.toLowerCase() !==
      quote.paymentReceipt.payer.toLowerCase()
    ) {
      return 'Wallet account changed. Reconnect the original payer before submitting this paid quote.';
    }
    if (recoveryRecord) {
      if (recoveryRecord.quoteHash.toLowerCase() !== quote.quoteHash.toLowerCase()) {
        return 'Recovered quote record does not match the active quote.';
      }
      if (recoveryRecord.selectedTemplateId !== selected.id) {
        return 'Recovered quote belongs to another policy.';
      }
      if (recoveryRecord.faultClass !== quote.faultClass) {
        return 'Recovered quote fault class changed. Start a new action.';
      }
      if (
        analysis?.scenarioHash &&
        recoveryRecord.scenarioHash &&
        analysis.scenarioHash !== recoveryRecord.scenarioHash
      ) {
        return 'Recovered quote belongs to a different scenario. Start a new action.';
      }
    }
    if (quoteShape) {
      if (quoteShape.faultClass !== quote.faultClass) {
        return 'Current scenario fault class does not match the paid quote.';
      }
      if (recoveryRecord && quoteShape.amount !== recoveryRecord.principalAmount) {
        return 'Current scenario amount does not match the paid quote.';
      }
    }
    return null;
  }

  async function recoverSubmittedAction(quoteHash: string): Promise<number | null> {
    const actions = await clientApi.actions();
    const found = findActionByQuoteHash(actions, quoteHash);
    if (!found) return null;
    rememberActionId(found.actionId);
    if (paidQuote) persistPaidQuote(paidQuote, found.actionId);
    setSubmit({ kind: 'created', actionId: found.actionId });
    router.push(`/app/actions/${found.actionId}`);
    return found.actionId;
  }

  async function createAction() {
    if (!paidQuote || !wallet.publicKey || submitBusyRef.current) return;
    submitBusyRef.current = true;
    setSubmit({ kind: 'signing' });
    try {
      const {
        assertUsableWallet,
        buyerPublicKeyBase64,
        readCasperWalletState,
        signSubmitAuthorization,
      } = await import('@/lib/casper-wallet');
      const freshWallet = await readCasperWalletState();
      setWallet(freshWallet);
      assertUsableWallet(freshWallet);
      if (!freshWallet.publicKey) throw new Error('Connect Casper Wallet to continue.');
      const validationError = validatePaidQuoteBeforeSubmit(paidQuote, freshWallet);
      if (validationError) throw new Error(validationError);
      const eventType = 'goods_not_received' as const;
      const existingAttempt = submitAttemptRef.current?.quoteHash === paidQuote.quoteHash
        ? submitAttemptRef.current
        : null;
      const prepared = existingAttempt ?? (() => {
        const buyerPublicKey = buyerPublicKeyBase64(freshWallet.publicKey!);
        return { buyerPublicKey };
      })();
      let attempt = existingAttempt;
      if (!attempt) {
        const authorization = await signSubmitAuthorization({
          publicKey: freshWallet.publicKey,
          quoteHash: paidQuote.quoteHash,
          faultClass: paidQuote.faultClass,
          buyerPublicKey: prepared.buyerPublicKey,
          eventType,
        });
        attempt = {
          quoteHash: paidQuote.quoteHash,
          buyerPublicKey: prepared.buyerPublicKey,
          eventType,
          authorization: {
            publicKey: authorization.publicKey,
            timestamp: authorization.timestamp,
            nonce: authorization.nonce,
            signature: authorization.signature,
          },
          idempotencyKey: `submit:${paidQuote.quoteHash}:${authorization.nonce}`,
        };
        submitAttemptRef.current = attempt;
      }
      setSubmit({ kind: 'submitting' });
      const response = await clientApi.submitPaidAction({
        quoteHash: paidQuote.quoteHash,
        faultClass: paidQuote.faultClass,
        buyerPublicKey: attempt.buyerPublicKey,
        eventType: attempt.eventType,
        submitAuthorization: attempt.authorization,
        idempotencyKey: attempt.idempotencyKey,
      });
      rememberActionId(response.action.actionId);
      persistPaidQuote(paidQuote, response.action.actionId);
      setSubmit({ kind: 'created', actionId: response.action.actionId });
      router.push(`/app/actions/${response.action.actionId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action creation failed.';
      if (paidQuote && shouldRecoverSubmit(message)) {
        try {
          const recoveredActionId = await recoverSubmittedAction(paidQuote.quoteHash);
          if (recoveredActionId) return;
        } catch {
          /* keep pending recovery state */
        }
        setSubmit({
          kind: 'recovery_pending',
          quoteHash: paidQuote.quoteHash,
          message: 'Recovery pending. The submit response was lost or the quote may already be consumed.',
        });
      } else {
        if (submit.kind === 'signing') submitAttemptRef.current = null;
        setSubmit({ kind: 'failed', message });
      }
    } finally {
      submitBusyRef.current = false;
    }
  }

  async function checkRecovery() {
    if (!paidQuote || submitBusyRef.current) return;
    submitBusyRef.current = true;
    try {
      const recoveredActionId = await recoverSubmittedAction(paidQuote.quoteHash);
      if (!recoveredActionId) {
        setSubmit({
          kind: 'recovery_pending',
          quoteHash: paidQuote.quoteHash,
          message: 'Recovery pending. No created action is visible for this paid quote yet.',
        });
      }
    } finally {
      submitBusyRef.current = false;
    }
  }

  function startNewAction() {
    if (!window.confirm('Clear the recovered paid quote and start a new action?')) return;
    clearPersistedFlow();
    setPayment({ kind: 'idle' });
    setSubmit({ kind: 'idle' });
    setProbe({ kind: 'idle' });
    setStep(selected ? 2 : 1);
  }

  return (
    <div className="space-y-10">
      <StepRail activeStep={step} maxStep={paidQuote ? 7 : analysis ? 6 : selected ? 2 : 1} onGo={setStep} />

      {!liveModelAvailable && (
        <div className="rounded-md border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200">
          Live AI analysis is unavailable. The deterministic fallback will still calculate the policy.
        </div>
      )}

      <section ref={(node) => { stepRefs.current[1] = node; }} aria-labelledby="new-action-policy">
        <StepHeading
          step={1}
          label="LIVE POLICY"
          title="Choose the executable policy"
          body="Delivery contradiction is the default path for delayed objective evidence. Duplicate claim stays available for advanced testing."
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          {primary ? (
            <PolicyCard
              template={primary}
              selected={selectedId === primary.id}
              tone="primary"
              onSelect={() => chooseTemplate(primary.id)}
            />
          ) : (
            <EmptyState
              title="No executable policy available"
              body="The backend did not return a deployed policy template."
            />
          )}
          <div className="rounded-md border border-rule bg-surface p-5">
            <Label>Advanced test vectors</Label>
            <div className="mt-4 grid gap-3">
              {advanced.length > 0 ? (
                advanced.map((template) => (
                  <PolicyCard
                    key={template.id}
                    template={template}
                    selected={selectedId === template.id}
                    tone="compact"
                    onSelect={() => chooseTemplate(template.id)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted">No advanced executable vector is currently listed.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section ref={(node) => { stepRefs.current[2] = node; }} aria-labelledby="new-action-scenario">
        <StepHeading
          step={2}
          label="CONTROLLED TESTNET INPUT"
          title="Describe the intended action"
          body="The policy engine needs the principal, confidence, counterparty status, objective evidence, tolerated loss and urgency."
        />
        {selected ? (
          <ScenarioForm template={selected} running={running} onSubmit={runAnalysis} />
        ) : (
          <EmptyState title="Choose a policy" body="Select an executable policy to unlock the action form." />
        )}
        {error && (
          <p className="mt-4 rounded-md border border-slash/40 bg-slash/10 px-4 py-3 text-sm text-slash">
            {error}
          </p>
        )}
      </section>

      <section ref={(node) => { stepRefs.current[3] = node; }} aria-labelledby="new-action-policy-result">
        <StepHeading
          step={3}
          label="LIVE ANALYSIS"
          title="Calculate policy and minimum bond"
          body="AI risk interpretation stays separate from deterministic bond pricing and deployed verifier checks."
        />
        {analysis && selected ? (
          <AnalysisResult analysis={analysis} template={selected} />
        ) : (
          <EmptyState title="No policy result yet" body="Analyze the action to see the minimum bond." />
        )}
      </section>

      <section ref={(node) => { stepRefs.current[4] = node; }} aria-labelledby="new-action-parties">
        <StepHeading
          step={4}
          label="LIVE POLICY"
          title="Review responsible parties"
          body="The connected payer authorizes the paid quote. The configured backend accounts fund the bond and submit Casper transactions."
        />
        <PartyReview analysis={analysis} />
      </section>

      <section ref={(node) => { stepRefs.current[5] = node; }} aria-labelledby="new-action-connect">
        <StepHeading
          step={5}
          label="LIVE PAYMENT REQUIREMENT"
          title="Continue to paid quote"
          body="Connect Casper Wallet only after the policy and responsible parties are clear."
        />
        <WalletConnector
          wallet={wallet}
          busy={walletBusy}
          error={walletError}
          onConnect={connectWallet}
        />
      </section>

      <section ref={(node) => { stepRefs.current[6] = node; }} aria-labelledby="new-action-payment">
        <StepHeading
          step={6}
          label="LIVE PAYMENT REQUIREMENT"
          title="Review payment terms"
          body="A 402 response is the expected unpaid result. Settle only after reviewing the exact amount, asset, network and payer."
        />
        <PaymentRequirement
          probe={probe}
          canProbe={canProbe}
          canSettle={Boolean(
            requirement &&
              wallet.connected &&
              wallet.publicKey &&
              wallet.missingMethods.length === 0 &&
              ['idle', 'rejected', 'expired'].includes(payment.kind),
          )}
          liveQuoteProbeAvailable={liveQuoteProbeAvailable}
          quoteReady={Boolean(quoteShape)}
          wallet={wallet}
          payment={payment}
          onRequest={requestPaymentRequirement}
          onSettle={settlePaidQuote}
        />
      </section>

      <section ref={(node) => { stepRefs.current[7] = node; }} aria-labelledby="new-action-paid-quote">
        <StepHeading
          step={7}
          label="LIVE PAYER BOUND QUOTE"
          title="Review paid quote"
          body="The paid quote is bound to the payer and can be submitted once after authorization."
        />
        <PaidQuotePanel
          quote={paidQuote}
          submit={submit}
          wallet={wallet}
          recovered={Boolean(recoveryRecord)}
          payerMismatch={payerMismatch}
          onCreate={createAction}
          onCheckRecovery={checkRecovery}
          onStartNew={startNewAction}
        />
      </section>
    </div>
  );
}

function StepRail({
  activeStep,
  maxStep,
  onGo,
}: {
  activeStep: Step;
  maxStep: number;
  onGo: (step: Step) => void;
}) {
  return (
    <ol className="grid gap-2 rounded-md border border-rule bg-surface/70 p-2 md:grid-cols-7">
      {STEP_LABELS.map((item) => {
        const enabled = item.step <= maxStep;
        const active = activeStep === item.step;
        return (
          <li key={item.step}>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onGo(item.step)}
              className={`flex h-full min-h-14 w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${
                active
                  ? 'bg-accent/10 text-accent'
                  : enabled
                    ? 'text-bone hover:bg-ink'
                    : 'text-muted/45'
              }`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current font-mono text-[0.65rem]">
                {item.step}
              </span>
              <span>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({
  step,
  label,
  title,
  body,
}: {
  step: number;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mb-4 flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/10 font-mono text-sm text-accent">
        {step}
      </span>
      <div>
        <Label>{label}</Label>
        <h2 className="mt-1 text-xl font-semibold text-bone">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

function PolicyCard({
  template,
  selected,
  tone,
  onSelect,
}: {
  template: AssuranceTemplate;
  selected: boolean;
  tone: 'primary' | 'compact';
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-full rounded-md border p-5 text-left transition-colors ${
        selected
          ? 'border-accent/60 bg-accent/[0.05]'
          : 'border-rule bg-surface hover:border-accent/40'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>{template.category}</Label>
        <StatusPill tone="ok">Executable</StatusPill>
      </div>
      <h3 className={`${tone === 'primary' ? 'text-2xl' : 'text-base'} mt-3 font-semibold text-bone`}>
        {template.name}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{template.description}</p>
      <dl className="mt-5 grid gap-3 border-t border-rule pt-4 text-xs sm:grid-cols-2">
        <MiniField label="Fault class">
          {template.supportedFaultClasses.join(', ')}
        </MiniField>
        <MiniField label="Evidence">
          {template.objectiveEvidence.join(', ')}
        </MiniField>
        <MiniField label="Adapter">
          {template.currentAdapter ?? 'not listed'}
        </MiniField>
      </dl>
    </button>
  );
}

function PartyReview({ analysis }: { analysis: AssuranceAnalysis | null }) {
  const faultClass = analysis?.policy.faultClass ?? 'pending policy';
  const verifier = analysis?.policy.verifier ?? 'pending policy';
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Party label="Payer" value="Connected Casper Wallet payer" note="Pays the x402 quote and signs submit authorization." />
      <Party label="Acting agent" value="Configured backend agent" note="Creates the bonded action after the paid quote is authorized." />
      <Party label="Bond funder" value="Configured backend agent account" note="Funds the bond on the current backend architecture." />
      <Party label="Transaction submitter" value="Backend deployer and agent accounts" note="Submits Casper transactions after payer authorization." />
      <Party label="Gas funder" value="Backend deployer and agent accounts" note="Pays action gas for invoice setup, bond approval, bond posting and execution." />
      <Party label="Evidence signer" value="Buyer Ed25519 public key" note="Required for delivery contradiction submit evidence binding." />
      <Party label="Watchdog" value="Autonomous watchdog service" note={`Challenges objective faults through ${faultClass} and ${verifier}.`} />
    </div>
  );
}

function Party({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface p-4">
      <Label>{label}</Label>
      <p className="mt-2 font-medium text-bone">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{note}</p>
    </div>
  );
}

function WalletConnector({
  wallet,
  busy,
  error,
  onConnect,
}: {
  wallet: CasperWalletState;
  busy: boolean;
  error: string | null;
  onConnect: () => void;
}) {
  const payer = wallet.payerAccountAddress;
  return (
    <div className="rounded-md border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Label>Payer wallet</Label>
          <h3 className="mt-2 text-lg font-semibold text-bone">
            {wallet.connected ? 'Casper Wallet connected' : 'Connect Casper Wallet'}
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            The wallet pays the x402 quote and later signs the submit authorization. It does not fund the bond in the current backend architecture.
          </p>
        </div>
        <StatusPill tone={wallet.connected ? 'ok' : wallet.available ? 'info' : 'warn'}>
          {wallet.connected ? 'Connected' : wallet.available ? 'Wallet detected' : 'Wallet absent'}
        </StatusPill>
      </div>
      {wallet.publicKey && (
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <MiniField label="Public key">
            <CopyHash value={wallet.publicKey} label={truncateHash(wallet.publicKey)} />
          </MiniField>
          {payer && (
            <MiniField label="Payer account">
              <CopyHash value={payer} label={truncateHash(payer)} />
            </MiniField>
          )}
          <MiniField label="Wallet version">{wallet.version ?? 'not reported'}</MiniField>
          <MiniField label="Required features">
            {wallet.missingMethods.length === 0 && wallet.supports.includes('sign-typed-data-eip712') && wallet.supports.includes('sign-message')
              ? 'available'
              : 'not available'}
          </MiniField>
        </dl>
      )}
      {wallet.missingMethods.length > 0 && (
        <p className="mt-4 rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
          Unsupported capability: {wallet.missingMethods.join(', ')}. Update Casper Wallet, unlock it, then reconnect before payment.
        </p>
      )}
      {wallet.locked && (
        <p className="mt-4 rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
          Unlock Casper Wallet and connect again.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded border border-slash/40 bg-slash/10 px-3 py-2 text-sm text-slash">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onConnect}
        disabled={busy}
        className="mt-5 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? 'Connecting' : wallet.connected ? 'Reconnect wallet' : 'Connect payer'}
      </button>
    </div>
  );
}

function PaymentRequirement({
  probe,
  canProbe,
  canSettle,
  liveQuoteProbeAvailable,
  quoteReady,
  wallet,
  payment,
  onRequest,
  onSettle,
}: {
  probe: ProbeState;
  canProbe: boolean;
  canSettle: boolean;
  liveQuoteProbeAvailable: boolean;
  quoteReady: boolean;
  wallet: CasperWalletState;
  payment: PaymentState;
  onRequest: () => void;
  onSettle: () => void;
}) {
  if (probe.kind === 'idle') {
    return (
      <div className="rounded-md border border-rule bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>Payment boundary</Label>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
              Requesting terms is unpaid. Settlement starts only after wallet approval in this step.
            </p>
          </div>
          <StatusPill tone="info">No payment yet</StatusPill>
        </div>
        <button
          type="button"
          onClick={onRequest}
          disabled={!canProbe}
          className="mt-5 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          Request payment requirement
        </button>
        {!quoteReady && (
          <p className="mt-3 text-xs text-muted">
            Calculate an executable policy before requesting payment terms.
          </p>
        )}
        {quoteReady && !liveQuoteProbeAvailable && (
          <p className="mt-3 text-xs text-muted">
            The backend reports that live payment terms are unavailable.
          </p>
        )}
      </div>
    );
  }

  if (probe.kind === 'loading') {
    return (
      <div className="rounded-md border border-rule bg-surface p-5">
        <StatusPill tone="info">Live request</StatusPill>
        <p className="mt-3 text-sm text-muted">
          Requested at {formatIsoUtc(probe.requestedAt)}
        </p>
      </div>
    );
  }

  const req = probe.x402?.payment.accepts[0];
  const expected = probe.status === 402 && Boolean(req);

  return (
    <div className="rounded-md border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>LIVE PAYMENT REQUIREMENT</Label>
          <h3 className="mt-2 text-lg font-semibold text-bone">
            {expected ? 'Payment terms returned' : 'Unexpected response'}
          </h3>
          <p className="mt-2 text-sm text-muted">
            Requested at {formatIsoUtc(probe.requestedAt)}
          </p>
        </div>
        <StatusPill tone={expected ? 'ok' : 'warn'}>HTTP {probe.status}</StatusPill>
      </div>

      {probe.error && (
        <p className="mt-4 rounded border border-slash/40 bg-slash/10 px-3 py-2 text-sm text-slash">
          Network error while requesting payment terms.
        </p>
      )}

      {req ? (
        <>
          <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <MiniField label="Amount">{formatWcspr(req.amount)}</MiniField>
            <MiniField label="Asset">
              {req.extra?.symbol ?? 'WCSPR'}
            </MiniField>
            <MiniField label="Network">{req.network}</MiniField>
            <MiniField label="Payer">
              {wallet.payerAccountAddress ? (
                <CopyHash
                  value={wallet.payerAccountAddress}
                  label={truncateHash(wallet.payerAccountAddress)}
                />
              ) : (
                'not connected'
              )}
            </MiniField>
            <MiniField label="Pay to">
              <CopyHash value={req.payTo} label={truncateHash(req.payTo)} />
            </MiniField>
            <MiniField label="Asset package">
              <CopyHash value={req.asset} label={truncateHash(req.asset)} />
            </MiniField>
            <MiniField label="Timeout">{req.maxTimeoutSeconds}s</MiniField>
          </dl>
          <div className="mt-5 border-t border-rule pt-5">
            <PaymentStatus payment={payment} />
            <button
              type="button"
              onClick={onSettle}
              disabled={!canSettle}
              className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
            >
              {payment.kind === 'awaiting_wallet'
                ? 'Waiting for wallet'
                : payment.kind === 'payload_constructing'
                  ? 'Preparing payload'
                  : payment.kind === 'wallet_signature_received'
                    ? 'Signature received'
                    : payment.kind === 'verification_pending'
                      ? 'Verifying payment'
                  : payment.kind === 'settled'
                    ? 'Payment settled'
                    : 'Settle payment'}
            </button>
          </div>
        </>
      ) : (
        <pre className="mt-4 max-h-56 overflow-auto rounded border border-rule bg-ink p-3 text-[11px] leading-relaxed text-bone">
          <code>{JSON.stringify(probe.other ?? probe.x402 ?? null, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}

function PaymentStatus({ payment }: { payment: PaymentState }) {
  if (payment.kind === 'idle') {
    return (
      <p className="text-sm text-muted">
        Review the terms, then approve the x402 typed data signature in Casper Wallet.
      </p>
    );
  }
  if (payment.kind === 'awaiting_wallet') {
    return <StatusPill tone="info">Awaiting wallet approval</StatusPill>;
  }
  if (payment.kind === 'payload_constructing') {
    return <StatusPill tone="info">Constructing payment payload</StatusPill>;
  }
  if (payment.kind === 'wallet_signature_received') {
    return <StatusPill tone="ok">Wallet signature received</StatusPill>;
  }
  if (payment.kind === 'verification_pending') {
    return (
      <div className="space-y-2">
        <StatusPill tone="info">Payment verification pending</StatusPill>
        <p className="text-sm text-muted">
          Authorization valid until {formatIsoUtc(new Date(Number(payment.authorization.validBefore) * 1000).toISOString())}.
        </p>
      </div>
    );
  }
  if (payment.kind === 'failed' || payment.kind === 'rejected' || payment.kind === 'expired' || payment.kind === 'malformed') {
    return (
      <div className="rounded border border-slash/40 bg-slash/10 px-3 py-2 text-sm text-slash">
        <p>{payment.message}</p>
        {payment.kind === 'failed' && (
          <p className="mt-2 text-slash/85">
            Do not retry from this state if the wallet showed a submitted payment. Check wallet history before starting a new attempt.
          </p>
        )}
      </div>
    );
  }
  return <StatusPill tone="ok">Payment settled</StatusPill>;
}

function PaidQuotePanel({
  quote,
  submit,
  wallet,
  recovered,
  payerMismatch,
  onCreate,
  onCheckRecovery,
  onStartNew,
}: {
  quote: PaidQuoteResponse | null;
  submit: SubmitState;
  wallet: CasperWalletState;
  recovered: boolean;
  payerMismatch: boolean;
  onCreate: () => void;
  onCheckRecovery: () => void;
  onStartNew: () => void;
}) {
  if (!quote) {
    return (
      <EmptyState
        title="No paid quote yet"
        body="Settle the payment requirement to receive a live payer bound quote."
      />
    );
  }
  return (
    <div className="rounded-md border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>LIVE PAYER BOUND QUOTE</Label>
          <h3 className="mt-2 text-lg font-semibold text-bone">
            {recovered ? 'Recovered paid quote' : 'Quote ready for authorization'}
          </h3>
        </div>
        <StatusPill tone="ok">Settled</StatusPill>
      </div>
      {recovered && (
        <div className="mt-4 rounded border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-bone">
          <p>Recovered paid quote.</p>
          <p className="mt-1 text-muted">Reconnect the original payer to continue.</p>
        </div>
      )}
      <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <MiniField label="Quote hash">
          <CopyHash value={quote.quoteHash} label={truncateHash(quote.quoteHash)} />
        </MiniField>
        <MiniField label="Payer">
          {quote.paymentReceipt.payer ? (
            <CopyHash
              value={quote.paymentReceipt.payer}
              label={truncateHash(quote.paymentReceipt.payer)}
            />
          ) : (
            'not reported'
          )}
        </MiniField>
        <MiniField label="Expiry">{formatIsoUtc(quote.quoteExpiry)}</MiniField>
        <MiniField label="Minimum bond">{formatWcspr(quote.quotedMinimumBond)}</MiniField>
        <MiniField label="Fault class">{quote.faultClass}</MiniField>
        <MiniField label="Verifier">{quote.verifier}</MiniField>
        <MiniField label="Challenge window">{quote.challengeWindow}s</MiniField>
        <MiniField label="Settlement transaction">
          <CopyHash
            value={quote.paymentReceipt.transaction}
            label={truncateHash(quote.paymentReceipt.transaction)}
          />
        </MiniField>
      </dl>
      <div className="mt-5 rounded border border-rule bg-ink px-4 py-3 text-sm text-muted">
        The submit authorization will bind this quote hash, fault class, evidence signer, event type, timestamp and nonce.
      </div>
      {payerMismatch && (
        <div className="mt-4 rounded border border-slash/40 bg-slash/10 px-3 py-2 text-sm text-slash">
          <p>Connected payer does not match the paid quote.</p>
          <p className="mt-2 break-all text-slash/85">
            Expected {quote.paymentReceipt.payer}; connected {wallet.payerAccountAddress ?? 'none'}.
          </p>
        </div>
      )}
      <div className="mt-5 border-t border-rule pt-5">
        <SubmitStatus submit={submit} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCreate}
            disabled={
              !wallet.connected ||
              !wallet.publicKey ||
              payerMismatch ||
              submit.kind === 'signing' ||
              submit.kind === 'submitting' ||
              submit.kind === 'created' ||
              submit.kind === 'recovery_pending'
            }
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong disabled:opacity-60"
          >
            {submit.kind === 'signing'
              ? 'Waiting for signature'
              : submit.kind === 'submitting'
                ? 'Creating action'
                : submit.kind === 'created'
                  ? 'Action created'
                  : 'Sign authorization and create action'}
          </button>
          {(submit.kind === 'recovery_pending' || submit.kind === 'failed') && (
            <button
              type="button"
              onClick={onCheckRecovery}
              className="rounded-md border border-rule px-5 py-2.5 text-sm text-bone transition-colors hover:border-accent/60"
            >
              Check for created action
            </button>
          )}
          <button
            type="button"
            onClick={onStartNew}
            className="rounded-md border border-rule px-5 py-2.5 text-sm text-bone transition-colors hover:border-slash/60"
          >
            Start new action
          </button>
        </div>
        {!wallet.connected && (
          <p className="mt-3 text-xs text-muted">
            Reconnect the payer wallet before submitting the paid quote.
          </p>
        )}
      </div>
    </div>
  );
}

function SubmitStatus({ submit }: { submit: SubmitState }) {
  if (submit.kind === 'idle') {
    return (
      <p className="text-sm text-muted">
        No action has been submitted. One click asks the payer to sign authorization, then submits the paid quote once.
      </p>
    );
  }
  if (submit.kind === 'signing') {
    return <StatusPill tone="info">Awaiting submit signature</StatusPill>;
  }
  if (submit.kind === 'submitting') {
    return <StatusPill tone="info">Submitting paid quote</StatusPill>;
  }
  if (submit.kind === 'created') {
    return <StatusPill tone="ok">Action {submit.actionId} created</StatusPill>;
  }
  if (submit.kind === 'recovery_pending') {
    return (
      <div className="rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
        <p>Recovery pending.</p>
        <p className="mt-2 text-yellow-100/85">
          {submit.message} Check for the created action before starting any new payment or signing attempt.
        </p>
      </div>
    );
  }
  return (
    <p className="rounded border border-slash/40 bg-slash/10 px-3 py-2 text-sm text-slash">
      {submit.message}
      {submit.message.includes('consumed') && (
        <span className="mt-2 block text-slash/85">
          The quote may already have created an action. Open App to check recent public actions before signing again.
        </span>
      )}
    </p>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="serial text-[0.58rem] text-muted">{label}</dt>
      <dd className="mt-1 break-all text-bone">{children}</dd>
    </div>
  );
}
