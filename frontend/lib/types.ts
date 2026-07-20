// Shapes mirror the live backend at http://127.0.0.1:3001 exactly.
// All money values are strings in atomic units, 9 decimals.
// Only the types the final public frontend actually consumes are exposed.

export interface Health {
  ok: true;
  version: string;
  controller: string;
  watchdog: { running: boolean };
  uptimeSec: number;
  deploymentsPath: string;
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

export type AssuranceStatus = 'executable_now' | 'blueprint' | string;

export interface AssuranceTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  implementationStatus: AssuranceStatus;
  executableNow: boolean;
  currentAdapter: string | null;
  supportedFaultClasses: string[];
  proposedFaultClass: string | null;
  proposedVerifier: string | null;
  objectiveEvidence: string[];
  casperValue: string;
  requiredFields: string[];
}

export interface AssuranceTemplatesResponse {
  schemaId: string;
  templates: AssuranceTemplate[];
}

export type AssuranceCounterpartyStatus = 'new' | 'known' | 'trusted' | 'unknown';
export type AssuranceEvidenceSource =
  | 'signed_delivery_attestation'
  | 'paid_claim_registry'
  | 'multisig_approval'
  | 'oracle_report'
  | 'execution_receipt';
export type AssuranceUrgency = 'low' | 'normal' | 'high';

export interface AssuranceAnalyzeRequest {
  templateId: string;
  description: string;
  amount: string;
  agentConfidence: number;
  counterpartyStatus: AssuranceCounterpartyStatus;
  evidenceSource: AssuranceEvidenceSource;
  maxLossBps: number;
  urgency: AssuranceUrgency;
}

export interface AssuranceRiskFactor {
  code: string;
  severity: 'low' | 'medium' | 'high' | string;
  explanation: string;
}

export interface AssuranceModelAnalysis {
  source: 'live_model' | 'deterministic_fallback' | string;
  modelAvailable: boolean;
  model: string | null;
  failureCode: string | null;
  summary: string;
  riskFactors: AssuranceRiskFactor[];
  confidence: number;
  recommendedDecision: string;
}

export interface AssurancePolicy {
  authority: string;
  formulaVersion: string;
  riskTier: string;
  estimatedMinimumBond: string;
  bondBasisPoints: number;
  faultClass: string | null;
  verifier: string | null;
  estimatedBond: string;
  challengeWindowSeconds: number;
  evidenceRequirements: string[];
  implementationStatus: AssuranceStatus;
  executableNow: boolean;
}

export interface AssuranceManifest {
  schemaId: string;
  scenarioId: string;
  scenarioHash: string;
  template: {
    id: string;
    name: string;
    implementationStatus: AssuranceStatus;
    executableNow: boolean;
  };
  actionCategory: string;
  amount: { value: string; asset: string; decimals: number };
  riskIndicators: AssuranceRiskFactor[];
  modelAnalysisHash: string;
  riskTier: string;
  bondPolicy: {
    authority: string;
    estimatedBond: string;
    bondBasisPoints: number;
  };
  faultClass: string | null;
  verifier: string | null;
  proposedFaultClass: string | null;
  proposedVerifier: string | null;
  challengeWindowSeconds: number;
  evidenceRequirements: string[];
  implementationStatus: AssuranceStatus;
  executableNow: boolean;
  quoteRequestShape?: {
    method: string;
    path: string;
    amount: string;
    faultClass: string;
  };
  submitRequirements: string[];
  expectedReceiptFields: string[];
  casperNetwork: string;
  contractReferences: Record<string, string>;
  boundaries: Record<string, boolean>;
  policyResultHash: string;
  manifestHash: string;
}

export interface AssuranceAnalysis {
  schemaId: string;
  mode: 'design_only' | string;
  scenarioHash: string;
  generatedAt: string;
  modelAnalysis: AssuranceModelAnalysis;
  policy: AssurancePolicy;
  manifest: AssuranceManifest;
  integrationManifest: AssuranceManifest;
}
