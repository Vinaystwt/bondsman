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
