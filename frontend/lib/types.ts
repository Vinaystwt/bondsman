// Shapes mirror the live backend at http://127.0.0.1:3001 exactly.
// All money values are strings in atomic units, 9 decimals.

export type ActionStatus =
  | 'Initiated'
  | 'Bonded'
  | 'Executed'
  | 'Challenged'
  | 'ResolvedSlash'
  | 'ResolvedRefund';

export type EventType =
  | 'BondLocked'
  | 'ActionInitiated'
  | 'PayoutApproved'
  | 'DuplicateDetected'
  | 'BondSlashed'
  | 'ResolvedSlash'
  | 'BondReleased'
  | 'ResolvedRefund'
  | 'BondPosted'
  | 'ActionExecuted';

export interface Invoice {
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

export interface ActionSummary {
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
  status: ActionStatus;
  challenger: string | null;
  challengerType: 'watchdog' | 'manual' | 'external-wallet' | null;
  reservedForManual: boolean;
  transactions: ActionTransactions;
}

export interface WatchdogCatch {
  actionId: number;
  reward: string;
  reasoning: string;
  challengeTx: string | null;
  resolveTx: string | null;
  timestamp: number;
}

export interface Watchdog {
  running: boolean;
  account: string;
  recentCatches: WatchdogCatch[];
  totalRewardEarned: string;
}

export interface Health {
  ok: true;
  version: string;
  controller: string;
  watchdog: { running: boolean };
  uptimeSec: number;
  deploymentsPath: string;
}

export interface ActionTransactions {
  initiate?: string;
  approve?: string;
  postBond?: string;
  execute?: string;
  challenge?: string;
  resolve?: string;
}

export interface CesEvent {
  contract: string;
  eventIndex: number;
  eventType: EventType;
  actionId: number;
  data: string;
  transactionHash: string | null;
  explorerLink: string | null;
}

export interface ActionDetail extends ActionSummary {
  events: CesEvent[];
  explorerLinks: Partial<Record<keyof ActionTransactions, string>>;
}

export interface DemoReadyCase extends ActionDetail {
  demo: true;
  remainingMs: number;
  minRemainingMs: number;
  safeToChallengeNow: boolean;
}

export interface SlashProof {
  actionId: number;
  status: 'ResolvedSlash';
  challenger: string | null;
  challengerType: 'manual' | 'watchdog' | 'external-wallet' | null;
  bond: string;
  amount: string;
  challengeTx: string | null;
  resolveTx: string | null;
  explorerLinks: Partial<Record<keyof ActionTransactions, string>>;
}

export interface DemoProofs {
  latestManualSlash: SlashProof | null;
  latestWatchdogSlash: SlashProof | null;
  readyCases: DemoReadyCase[];
  totals?: {
    slashes: number;
    refunds: number;
    slashedBonds: string;
  };
}

export type DemoJobStatus =
  | 'queued'
  | 'arming'
  | 'action_ready'
  | 'submitting_challenge'
  | 'challenge_finalized'
  | 'resolving'
  | 'resolved'
  | 'failed';

export interface DemoJob {
  id: string;
  kind: 'challenge' | 'arm' | 'watchdog';
  actionId: number | null;
  status: DemoJobStatus;
  challengeTx: string | null;
  resolveTx: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export type DemoReady =
  | {
      success: true;
      count: number;
      minRemainingMs: number;
      best: DemoReadyCase;
      cases: DemoReadyCase[];
    }
  | {
      success: false;
      code: 'NO_READY_CASE';
      message: string;
      nextStep: string;
      count: 0;
      minRemainingMs: number;
      cases: [];
    };

export interface AgentReputation {
  agent: string;
  clean: number;
  slashed: number;
  score: number;
  actions: ActionSummary[];
}

export interface SlashEvent {
  contract: string;
  eventIndex: number;
  eventType: string;
  actionId: number;
  data: string;
  transactionHash: string | null;
}

export interface Reserve {
  balance: string;
  slashes: SlashEvent[];
}

export interface Deployment {
  network: string;
  chainName: string;
  nodeRpcUrl: string;
  contracts: Record<
    string,
    { packageHash: string; contractHash: string }
  >;
  accounts: Record<
    string,
    { publicKey: string; accountHash: string }
  >;
}

export interface ChallengeResult {
  challenge: string;
  resolve: string;
}

export interface ResolveResult {
  resolve: string;
}

export interface TransactionStatus {
  status: string;
  final: boolean;
  success: boolean;
  error: string | null;
}

export interface WalletResolveResult {
  success: boolean;
  challenger: string;
  challengerType: 'external-wallet';
  rewardAmount: string;
  challengerShare: string;
  reserveShare: string;
  challengeDeployHash: string;
  resolveDeployHash: string;
  challengeExplorerLink: string;
  resolveExplorerLink: string;
}

export type CanonicalOutcome = 'SLASHED' | 'REFUNDED';

export interface CanonicalTimelineStage {
  stage:
    | 'initiate'
    | 'bond_posted'
    | 'execute'
    | 'evidence_arrived'
    | 'challenge'
    | 'resolve';
  at: string | null;
  actor: string;
  txHash?: string | null;
  explorerUrl?: string | null;
  signature?: string | null;
  outcome?: CanonicalOutcome;
  payload?: Record<string, unknown>;
}

export interface CanonicalPayment {
  protocol: string;
  scheme: string;
  network: string;
  asset: string;
  assetPackage: string;
  paymentAmount: string;
  payer: string;
  payTo: string;
  facilitator: string;
  settlementTransaction: string;
  settlementExplorerUrl: string;
  settled: boolean;
}

export interface CanonicalPaidQuote {
  quoteHash: string;
  actionType: string;
  faultClass: string;
  verifier: string;
  principalAmount: string;
  requiredBond: string;
  challengeWindow: number;
  issuedAt: string;
  expiresAt: string;
  consumedAt: string | null;
  consumedActionId: number | null;
  status: string;
}

export interface CanonicalDeliveryAttestation {
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  buyerPublicKey: string;
  evidenceRoot: string;
  signatureVerified: boolean;
  usedActionId: number;
}

export interface CanonicalEconomicImpact {
  challengerReward: string;
  challengerRewardSource: string;
  reserveCredit: string;
  reserveCreditSource: string;
  currentReserveSnapshot: string;
  reputationBefore: number | null;
  reputationDelta: number | null;
  reputationDeltaSource: string;
  reputationAfter: number | null;
  resolutionEventTransaction: string;
  resolutionEventExplorerUrl: string;
}

export interface CanonicalFaultCondition {
  class: string;
  verifierModule: string;
  evidenceRoot: string;
  verificationDetails: string;
}

export interface CanonicalParticipant {
  account: string;
  role: string;
}

export interface CanonicalReasoning {
  text: string;
  commitHash: string;
  recomputedHash: string;
  verifiedMatches: boolean;
}

export interface CanonicalProof {
  proofSchemaVersion: number;
  actionId: string;
  controller: string;
  outcome: CanonicalOutcome;
  faultClass: string;
  oneLine: string;
  timeline: CanonicalTimelineStage[];
  participants: {
    approver: CanonicalParticipant;
    challenger: CanonicalParticipant;
  };
  valueAtRisk: string;
  bond: string;
  faultCondition: CanonicalFaultCondition;
  payment?: CanonicalPayment;
  paidQuote?: CanonicalPaidQuote;
  deliveryAttestation?: CanonicalDeliveryAttestation;
  modelReasoning?: CanonicalReasoning;
  economicImpact: CanonicalEconomicImpact;
  receiptUrl: string;
  cachedAt: string;
}

export interface PortableReceipt {
  protocol: string;
  version: string;
  schemaId: string;
  network: string;
  actionId: string;
  controller: string;
  actor: string;
  actorRole: string;
  actionType: string;
  verifier: string;
  faultClass: string;
  principal: string;
  bond: string;
  outcome: CanonicalOutcome;
  faultCode: string;
  challenger: string;
  challengerType: string;
  challengeSigning: string;
  watchdogChallengeTransaction: string;
  resolveTransaction: string;
  economics: CanonicalEconomicImpact;
  deployHashes: Record<string, string>;
  reasoningCommitment: CanonicalReasoning;
  deliveryEvidence?: CanonicalDeliveryAttestation;
  payment?: CanonicalPayment;
  paidQuote?: CanonicalPaidQuote;
  issuedAt: string;
  signerPublicKey: string;
  signature: string;
}

export interface ReceiptVerification {
  valid: boolean;
  reason?: string;
}

export interface Verifier {
  id: string;
  title: string;
  onChain: boolean;
  schema: Record<string, unknown>;
  example: Record<string, unknown>;
}

export interface Coverage {
  reserveBalance: string;
  openBondedExposure: string;
  coverageRatio: number;
  cumulativeSlashes: string;
  cumulativeRefunds: string;
  maxSingleActionCoverage: string;
  largestPossibleUncoveredLoss: string;
  explanation: {
    bondCoverageRatio: string;
    reserveRole: string;
    uncoveredCap: string;
  };
}

export interface AgentCardSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  provider: { organization: string; url: string };
  version: string;
  capabilities: Record<string, boolean>;
  authentication: { schemes: string[] };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentCardSkill[];
}

export interface CanonicalBondEconomics {
  quotedMinimumBond: string;
  actualPostedBond: string;
  bondRelation: 'overcollateralized' | 'exact' | 'undercollateralized' | string;
  bondDifference: string;
  minimumSatisfied: boolean;
  exactMatch: boolean;
}

export interface EvidenceLabels {
  quoteProbe: string;
  payment: string;
  quote: string;
  action: string;
  deliveryInput: string;
  challenge: string;
  receipt: string;
}

export interface CanonicalReplay {
  schemaId: string;
  mode: 'canonical_replay' | string;
  actionId: number;
  source: 'live_projection' | 'committed_bundle' | string;
  liveProjectionAvailable: boolean;
  generatedAt: string;
  evidenceLabels: EvidenceLabels;
  proof: CanonicalProof & {
    bondEconomics: CanonicalBondEconomics;
    paidQuote?: CanonicalPaidQuote & {
      quotedMinimumBond?: string;
      bondSemantics?: string;
      policySnapshot?: Record<string, unknown> | null;
      actualPostedBond?: string;
      bondRelation?: string;
      bondDifference?: string;
      minimumSatisfied?: boolean;
      exactMatch?: boolean;
    };
  };
  receipt: PortableReceipt;
}

export interface X402Requirement {
  scheme: string;
  network: string;
  payTo: string;
  amount: string;
  asset: string;
  extra: {
    name?: string;
    symbol?: string;
    version?: string;
    decimals?: string;
  };
  maxTimeoutSeconds: number;
}

export interface X402PaymentResponse {
  success: false;
  code: 'X402_PAYMENT_REQUIRED' | string;
  message: string;
  payment: {
    x402Version: number;
    accepts: X402Requirement[];
    error?: string;
  };
}

export interface QuoteCheckResponse {
  success: boolean;
  actionId: number | null;
  quoteHash: string;
  status: 'consumed' | 'issued' | 'expired' | string;
  payerBound: boolean;
  consumedActionId: number | null;
  singleUse: boolean;
  wouldAcceptNewSubmission: boolean;
  expectedRejectionCode: string | null;
  explanation: string;
}

export interface PublicCapabilities {
  productCategory: string;
  proofConsole: { enabled: boolean; canonicalActionId: number };
  assuranceStudio: {
    enabled: boolean;
    mode: 'design_only' | string;
    liveModelAvailable: boolean;
  };
  liveQuoteProbe: {
    enabled: boolean;
    createsTransactionWithoutPayment: boolean;
  };
  paidHttpIntegration: {
    enabled: boolean;
    quoteSurface: string;
    submitSurface: string;
  };
  receiptVerification: { enabled: boolean };
  sponsoredLiveRun: { enabled: boolean };
  publicChallengeArena: { enabled: boolean };
  externalWalletChallenge: { enabled: boolean };
  operatorDemoWrites: { enabled: boolean; public: boolean };
  mcp: { mode: string };
}

export interface HealthPublicExperience {
  proofConsoleReady: boolean;
  assuranceStudioReady: boolean;
  assuranceModelConfigured: boolean;
  assuranceModelAvailable: boolean;
  assuranceModelStatus: 'available' | 'unavailable' | 'unknown' | string;
  assuranceModelLastCheckedAt: string | null;
  assuranceModelLastSuccessAt: string | null;
  assuranceModelLastFailureCode: string | null;
  canonicalActionId: number;
  canonicalProofAvailable: boolean;
  canonicalReceiptValid: boolean;
  liveQuoteProbeAvailable: boolean;
  publicMutationModesEnabled: boolean;
}
