import { buildDomain, CASPER_DOMAIN_TYPES } from '@casper-ecosystem/casper-eip-712';
import { PublicKey } from 'casper-js-sdk';
import type { X402Requirement } from './types';

export const WALLET_SUPPORT_SIGN_MESSAGE = 'sign-message';
export const WALLET_SUPPORT_SIGN_TYPED_DATA = 'sign-typed-data-eip712';

const REQUIRED_PROVIDER_METHODS = [
  'requestConnection',
  'getActivePublicKeySupports',
  'signTypedData',
  'signMessage',
] as const;

export interface CasperWalletState {
  available: boolean;
  connected: boolean;
  locked: boolean;
  publicKey: string | null;
  payerAccountAddress: string | null;
  supports: string[];
  missingMethods: string[];
  version: string | null;
}

type SignatureLike =
  | { cancelled: true; error?: string; errorCode?: string }
  | {
      cancelled?: false;
      signature?: string | Uint8Array | number[];
      signatureHex?: string;
      publicKey?: string;
      digest?: string;
      error?: string;
      errorCode?: string;
    };

interface CasperWalletProviderApi {
  requestConnection(): Promise<boolean | string>;
  disconnectFromSite?(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  getActivePublicKey(): Promise<string>;
  getActivePublicKeySupports?(): Promise<string[]>;
  getVersion?(): Promise<string>;
  signMessage(message: string, signingPublicKeyHex: string): Promise<SignatureLike | string>;
  signTypedData(
    params: { typedData: Record<string, unknown>; options?: Record<string, unknown> },
    signingPublicKeyHex: string,
  ): Promise<SignatureLike | string>;
}

function provider(): CasperWalletProviderApi | null {
  if (typeof window === 'undefined') return null;
  const factory = (window as unknown as { CasperWalletProvider?: () => CasperWalletProviderApi }).CasperWalletProvider;
  return typeof factory === 'function' ? factory() : null;
}

function missingProviderMethods(p: unknown): string[] {
  if (!p || typeof p !== 'object') return [...REQUIRED_PROVIDER_METHODS];
  const record = p as Record<string, unknown>;
  return REQUIRED_PROVIDER_METHODS.filter((method) => typeof record[method] !== 'function');
}

function assertProviderMethods(p: unknown) {
  const missing = missingProviderMethods(p);
  if (missing.length > 0) {
    throw new Error(`Casper Wallet is missing ${missing.join(', ')}. Update Casper Wallet or switch to an account that supports paid execution.`);
  }
}

function parseWalletResponse<T>(response: T | string): T {
  if (typeof response !== 'string') return response;
  try {
    return JSON.parse(response) as T;
  } catch {
    return response as T;
  }
}

export async function readCasperWalletState(): Promise<CasperWalletState> {
  const p = provider();
  if (!p) {
    return {
      available: false,
      connected: false,
      locked: false,
      publicKey: null,
      payerAccountAddress: null,
      supports: [],
      missingMethods: [...REQUIRED_PROVIDER_METHODS],
      version: null,
    };
  }
  const missingMethods = missingProviderMethods(p);
  try {
    const [connected, version] = await Promise.all([
      p.isConnected(),
      p.getVersion?.().catch(() => null) ?? Promise.resolve(null),
    ]);
    if (!connected) {
      return {
        available: true,
        connected: false,
        locked: false,
        publicKey: null,
        payerAccountAddress: null,
        supports: [],
        missingMethods,
        version,
      };
    }
    const [publicKey, supports] = await Promise.all([
      p.getActivePublicKey(),
      p.getActivePublicKeySupports?.().catch(() => []) ?? Promise.resolve([]),
    ]);
    return {
      available: true,
      connected: true,
      locked: false,
      publicKey,
      payerAccountAddress: payerAccountAddress(publicKey),
      supports,
      missingMethods,
      version,
    };
  } catch {
    return {
      available: true,
      connected: false,
      locked: true,
      publicKey: null,
      payerAccountAddress: null,
      supports: [],
      missingMethods,
      version: null,
    };
  }
}

export async function connectCasperWallet(): Promise<CasperWalletState> {
  const p = provider();
  if (!p) throw new Error('Casper Wallet is not installed.');
  assertProviderMethods(p);
  const response = parseWalletResponse(await p.requestConnection());
  const approved =
    response === true ||
    (typeof response === 'object' &&
      response !== null &&
      'isConnected' in response &&
      Boolean((response as { isConnected?: unknown }).isConnected));
  if (!approved) throw new Error('Wallet connection was rejected.');
  const state = await readCasperWalletState();
  assertUsableWallet(state);
  return state;
}

export function assertUsableWallet(state: CasperWalletState) {
  if (!state.available) throw new Error('Casper Wallet is not installed.');
  if (state.locked) throw new Error('Casper Wallet is locked.');
  if (state.missingMethods.length > 0) {
    throw new Error(`Casper Wallet is missing ${state.missingMethods.join(', ')}. Update Casper Wallet before payment.`);
  }
  if (!state.connected || !state.publicKey) {
    throw new Error('Connect Casper Wallet to continue.');
  }
  if (!/^01[0-9a-f]{64}$/i.test(state.publicKey)) {
    throw new Error('Only Ed25519 Casper public keys are supported.');
  }
  if (!state.supports.includes(WALLET_SUPPORT_SIGN_TYPED_DATA)) {
    throw new Error('This wallet account cannot sign Casper EIP 712 typed data.');
  }
  if (!state.supports.includes(WALLET_SUPPORT_SIGN_MESSAGE)) {
    throw new Error('This wallet account cannot sign submit authorization messages.');
  }
}

export function payerAccountAddress(publicKeyHex: string): string {
  return `00${PublicKey.fromHex(publicKeyHex).accountHash().toHex()}`;
}

export function buyerPublicKeyBase64(publicKeyHex: string): string {
  if (!/^01[0-9a-f]{64}$/i.test(publicKeyHex)) {
    throw new Error('Only Ed25519 Casper public keys can be used as evidence signer keys.');
  }
  const bytes = Uint8Array.from(
    publicKeyHex.slice(2).match(/../g)!.map((part) => Number.parseInt(part, 16)),
  );
  return bytesToBase64(bytes);
}

function randomNonceHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeSignatureHex(value: SignatureLike | string): string {
  const response = parseWalletResponse<SignatureLike>(value);
  if (typeof response === 'object' && response && 'cancelled' in response && response.cancelled) {
    throw new Error('Wallet signature was rejected.');
  }
  if (typeof response === 'object' && response?.error) {
    throw new Error(String(response.error));
  }
  const raw =
    typeof response === 'object'
      ? response.signatureHex ?? response.signature
      : response;
  if (raw instanceof Uint8Array) {
    return Array.from(raw, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  if (Array.isArray(raw)) {
    return raw.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  if (typeof raw !== 'string') {
    throw new Error('Wallet did not return a signature.');
  }
  return raw.startsWith('0x') ? raw.slice(2) : raw;
}

function ensurePaymentSignatureLength(signatureHex: string): string {
  if (/^[0-9a-f]{130}$/i.test(signatureHex)) return signatureHex;
  if (/^[0-9a-f]{128}$/i.test(signatureHex)) return `01${signatureHex}`;
  throw new Error('Wallet returned an invalid x402 signature length.');
}

function rawEd25519Signature(signatureHex: string): Uint8Array {
  const raw = /^[0-9a-f]{130}$/i.test(signatureHex)
    ? signatureHex.slice(2)
    : signatureHex;
  if (!/^[0-9a-f]{128}$/i.test(raw)) {
    throw new Error('Wallet returned an invalid submit signature length.');
  }
  return Uint8Array.from(raw.match(/../g)!.map((part) => Number.parseInt(part, 16)));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const transferWithAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

export async function createX402PaymentSignature(input: {
  publicKey: string;
  requirement: X402Requirement;
  resourceUrl: string;
}) {
  const p = provider();
  if (!p) throw new Error('Casper Wallet is not installed.');
  assertProviderMethods(p);
  const name = input.requirement.extra?.name;
  const version = input.requirement.extra?.version;
  if (!name || !version) throw new Error('Payment requirement is missing token metadata.');
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 600;
  const validBefore = now + input.requirement.maxTimeoutSeconds;
  const authorization = {
    from: payerAccountAddress(input.publicKey),
    to: input.requirement.payTo,
    value: input.requirement.amount,
    validAfter: String(validAfter),
    validBefore: String(validBefore),
    nonce: randomNonceHex(),
  };
  const typedData = {
    domain: buildDomain(
      name,
      version,
      input.requirement.network,
      `0x${input.requirement.asset}`,
    ),
    types: transferWithAuthorizationTypes,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: `0x${authorization.from}`,
      to: `0x${authorization.to}`,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: `0x${authorization.nonce}`,
    },
  };
  const signature = ensurePaymentSignatureLength(
    normalizeSignatureHex(
      await p.signTypedData(
        { typedData, options: { domainTypes: CASPER_DOMAIN_TYPES } },
        input.publicKey,
      ),
    ),
  );
  const paymentPayload = {
    x402Version: 2,
    payload: {
      signature,
      publicKey: input.publicKey,
      authorization,
    },
    accepted: {
      scheme: input.requirement.scheme,
      network: input.requirement.network,
      asset: input.requirement.asset,
      amount: input.requirement.amount,
      payTo: input.requirement.payTo,
    },
    resource: {
      method: 'POST',
      url: input.resourceUrl,
      description: 'Bondsman bond quote',
    },
  };
  return {
    header: btoa(JSON.stringify(paymentPayload)),
    authorization,
  };
}

export interface SubmitAuthorizationInput {
  publicKey: string;
  quoteHash: string;
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
  buyerPublicKey?: string;
  eventType: 'delivery_rejected' | 'goods_not_received';
}

export function submitAuthorizationPayload(input: SubmitAuthorizationInput & {
  timestamp: number;
  nonce: string;
}): string {
  return JSON.stringify({
    quoteHash: input.quoteHash,
    faultClass: input.faultClass,
    buyerPublicKey: input.buyerPublicKey ?? null,
    eventType: input.eventType,
    timestamp: input.timestamp,
    nonce: input.nonce,
  });
}

export async function signSubmitAuthorization(input: SubmitAuthorizationInput) {
  const p = provider();
  if (!p) throw new Error('Casper Wallet is not installed.');
  assertProviderMethods(p);
  const timestamp = Date.now();
  const nonce = randomNonceHex();
  const payload = submitAuthorizationPayload({ ...input, timestamp, nonce });
  const signatureHex = normalizeSignatureHex(
    await p.signMessage(payload, input.publicKey),
  );
  return {
    publicKey: input.publicKey,
    timestamp,
    nonce,
    signature: bytesToBase64(rawEd25519Signature(signatureHex)),
    payload,
  };
}
