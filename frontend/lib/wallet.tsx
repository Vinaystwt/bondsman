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

export interface WalletSignResult {
  cancelled: boolean;
  signatureHex: string;
}

interface WalletState {
  available: boolean;
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
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

// Balance fetch omitted: the testnet RPC requires a purse URef lookup that
// is not reliable from the browser. Show null (omit) rather than a wrong number.

export function WalletProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

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
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed.cancelled) {
      return { cancelled: true, signatureHex: '' };
    }
    return { cancelled: false, signatureHex: parsed.signatureHex ?? '' };
  }, [publicKey]);

  const value = useMemo(
    () => ({ available, connected, connecting, publicKey, balance, connect, disconnect, sign }),
    [available, connected, connecting, publicKey, balance, connect, disconnect, sign],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
