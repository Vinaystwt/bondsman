'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// casper-js-sdk is heavy (~50kB). Loaded lazily so it never lands in the
// shared bundle every route pays for through the root-layout WalletProvider.
async function derivePublicKeyAccountHash(publicKeyHex: string): Promise<string> {
  const { publicKeyToAccountHashHex } = await import('./account-hash');
  return publicKeyToAccountHashHex(publicKeyHex);
}

export interface WalletSignResult {
  cancelled: boolean;
  signatureHex: string;
}

type WalletSignResponse =
  | string
  | {
      cancelled?: boolean;
      canceled?: boolean;
      signatureHex?: string;
      signature?: string;
      approval?: { signature?: string };
      deploy?: { approvals?: Array<{ signer?: string; signature?: string }> };
      signedDeploy?: { approvals?: Array<{ signer?: string; signature?: string }> };
      approvals?: Array<{ signer?: string; signature?: string }>;
    };

interface WalletState {
  available: boolean;
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  accountHash: string | null;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sign: (deployJson: string) => Promise<WalletSignResult>;
}

const WalletContext = createContext<WalletState>({
  available: false,
  connected: false,
  connecting: false,
  publicKey: null,
  accountHash: null,
  balance: null,
  connect: async () => {},
  disconnect: async () => {},
  sign: async () => ({ cancelled: true, signatureHex: '' }),
});

export function useWallet() {
  return useContext(WalletContext);
}

function getProvider(): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const wp = (window as unknown as Record<string, unknown>).CasperWalletProvider;
    if (typeof wp === 'function') return (wp as () => unknown)();
  } catch {
    /* extension not installed */
  }
  return null;
}

function parseMaybeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function firstApprovalSignature(
  approvals: Array<{ signer?: string; signature?: string }> | undefined,
  publicKey: string,
): string | undefined {
  if (!Array.isArray(approvals)) return undefined;
  return approvals.find((approval) => approval.signer === publicKey)?.signature
    ?? approvals[0]?.signature;
}

export function normalizeWalletSignature(
  signature: string,
  publicKey: string,
): string {
  const clean = signature
    .trim()
    .replace(/^signature-/, '')
    .replace(/^0x/, '')
    .toLowerCase();
  if (!/^[0-9a-f]+$/.test(clean)) {
    throw new Error('Casper Wallet returned a non-hex signature.');
  }
  if ((clean.startsWith('01') || clean.startsWith('02')) && clean.length > 128) {
    return clean;
  }
  const algorithm = publicKey.slice(0, 2).toLowerCase();
  if (algorithm !== '01' && algorithm !== '02') {
    throw new Error('Casper Wallet public key has an unknown signature algorithm.');
  }
  return `${algorithm}${clean}`;
}

export function extractWalletSignature(
  raw: WalletSignResponse,
  publicKey: string,
): WalletSignResult {
  const parsed = typeof raw === 'string' ? parseMaybeJson(raw) : raw;
  if (typeof parsed === 'string') {
    return {
      cancelled: false,
      signatureHex: normalizeWalletSignature(parsed, publicKey),
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Casper Wallet returned an empty signing response.');
  }
  const response = parsed as Exclude<WalletSignResponse, string>;
  if (response.cancelled || response.canceled) {
    return { cancelled: true, signatureHex: '' };
  }
  const signature =
    response.signatureHex
    ?? response.signature
    ?? response.approval?.signature
    ?? firstApprovalSignature(response.approvals, publicKey)
    ?? firstApprovalSignature(response.deploy?.approvals, publicKey)
    ?? firstApprovalSignature(response.signedDeploy?.approvals, publicKey);
  if (!signature) {
    throw new Error('Casper Wallet returned no deploy signature.');
  }
  return {
    cancelled: false,
    signatureHex: normalizeWalletSignature(signature, publicKey),
  };
}

// Balance fetch omitted: the testnet RPC requires a purse URef lookup that
// is not reliable from the browser. Show null (omit) rather than a wrong number.

export function WalletProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [accountHash, setAccountHash] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const provider = getProvider();
      setAvailable(!!provider);
      if (provider) {
        try {
          const p = provider as { isConnected: () => boolean; getActivePublicKey: () => Promise<string> };
          if (typeof p.isConnected === 'function' && p.isConnected()) {
            p.getActivePublicKey().then((key) => {
              setPublicKey(key);
              setConnected(true);
            }).catch(() => {});
          }
        } catch {
          /* not connected */
        }
      }
    };
    check();
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (publicKey) setBalance(null);
  }, [publicKey]);

  const connect = useCallback(async () => {
    const provider = getProvider() as {
      requestConnection: () => Promise<string>;
      getActivePublicKey: () => Promise<string>;
    } | null;
    if (!provider) return;
    setConnecting(true);
    try {
      const response = await provider.requestConnection();
      const approved = typeof response === 'string'
        ? JSON.parse(response)?.isConnected
        : response;
      if (approved) {
        const key = await provider.getActivePublicKey();
        setPublicKey(key);
        setConnected(true);
      }
    } catch {
      /* user rejected or extension error */
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getProvider() as {
      disconnectFromSite: () => Promise<void>;
    } | null;
    if (!provider) return;
    try {
      await provider.disconnectFromSite();
    } catch {
      /* ignore */
    }
    setPublicKey(null);
    setBalance(null);
    setConnected(false);
  }, []);

  const sign = useCallback(async (deployJson: string): Promise<WalletSignResult> => {
    const provider = getProvider() as {
      sign: (json: string, pk: string) => Promise<string>;
    } | null;
    if (!provider || !publicKey) {
      return { cancelled: true, signatureHex: '' };
    }
    const raw = await provider.sign(deployJson, publicKey);
    return extractWalletSignature(raw, publicKey);
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setAccountHash(null);
      return;
    }
    let cancelled = false;
    derivePublicKeyAccountHash(publicKey).then((hash) => {
      if (!cancelled) setAccountHash(hash);
    });
    return () => { cancelled = true; };
  }, [publicKey]);

  const value = useMemo(
    () => ({ available, connected, connecting, publicKey, accountHash, balance, connect, disconnect, sign }),
    [available, connected, connecting, publicKey, accountHash, balance, connect, disconnect, sign],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
