'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { clientApi, ApiError } from '@/lib/api';
import { useWallet } from '@/lib/wallet';
import { buildChallengeDeploy, attachSignature } from '@/lib/challenge-deploy';
import type { ActionDetail, WalletResolveResult } from '@/lib/types';
import { parseEventData, serial, truncateHash, txExplorer, accountExplorer } from '@/lib/format';
import Seal from '@/components/Seal';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { Label } from '@/components/ui/Primitives';
import Countdown from './Countdown';

type Phase =
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitted'
  | 'finalizing'
  | 'resolving'
  | 'success'
  | 'rejected'
  | 'timeout'
  | 'resolve_error'
  | 'error'
  | 'expired'
  | 'backend_submitting'
  | 'backend_pending'
  | 'backend_resolved';

function asAmount(v: unknown): string | null {
  return typeof v === 'string' && /^\d+$/.test(v) ? v : null;
}

export default function ManualChallenge({
  initial,
  onResolved,
}: {
  initial: ActionDetail;
  onResolved: () => void;
}) {
  const reduce = useReducedMotion();
  const wallet = useWallet();
  const [action, setAction] = useState<ActionDetail>(initial);
  const [phase, setPhase] = useState<Phase>(() => {
    if (initial.status === 'ResolvedSlash') return 'backend_resolved';
    if (initial.status !== 'Executed' || initial.windowEnd <= Date.now() || initial.challenger)
      return 'expired';
    return 'idle';
  });
  const [deployHash, setDeployHash] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<WalletResolveResult | null>(null);
  const [error, setError] = useState('');
  const [controllerHash, setControllerHash] = useState('');
  const pollAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase !== 'idle') return;
    if (action.windowEnd <= Date.now()) {
      setPhase('expired');
      return;
    }
    const timer = setTimeout(() => setPhase('expired'), action.windowEnd - Date.now());
    return () => clearTimeout(timer);
  }, [phase, action.windowEnd]);

  useEffect(() => {
    return () => { pollAbort.current?.abort(); };
  }, []);

  const walletChallenge = useCallback(async () => {
    if (action.windowEnd <= Date.now()) {
      setPhase('expired');
      return;
    }
    setError('');
    setDeployHash(null);
    setWalletResult(null);

    try {
      setPhase('building');
      const deployments = await clientApi.deployments();
      const pkgHash = deployments.contracts?.controller?.packageHash ?? '';
      setControllerHash(pkgHash);
      if (!pkgHash) throw new Error('Controller contract not found');

      const { deployJson, deployHash: hash } = buildChallengeDeploy(
        wallet.publicKey!,
        pkgHash,
        action.actionId,
      );
      setDeployHash(hash);

      setPhase('signing');
      const signResult = await wallet.sign(JSON.stringify(deployJson));
      if (signResult.cancelled) {
        setPhase('rejected');
        return;
      }

      const signedDeploy = attachSignature(
        deployJson,
        signResult.signatureHex,
        wallet.publicKey!,
      );

      setPhase('submitted');
      const putResult = await clientApi.putDeploy(
        signedDeploy,
        deployments.nodeRpcUrl,
      );
      const finalHash = putResult.deploy_hash || hash;
      setDeployHash(finalHash);

      setPhase('finalizing');
      const controller = new AbortController();
      pollAbort.current = controller;
      const startTime = Date.now();

      while (!controller.signal.aborted) {
        if (Date.now() - startTime > 120_000) {
          setPhase('timeout');
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
        if (controller.signal.aborted) return;
        try {
          const tx = await clientApi.transactionStatus(finalHash);
          if (tx.final && tx.success) break;
          if (tx.final && !tx.success) {
            setError(tx.error || 'The challenge deploy failed on chain.');
            setPhase('error');
            return;
          }
        } catch {
          // keep polling
        }
      }
      if (controller.signal.aborted) return;

      setPhase('resolving');
      let resolveResult: WalletResolveResult | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          resolveResult = await clientApi.walletResolve(action.actionId, finalHash);
          break;
        } catch (err) {
          if (err instanceof ApiError && err.code === 'CHALLENGE_NOT_FINAL') {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          throw err;
        }
      }

      if (!resolveResult) {
        setPhase('resolve_error');
        return;
      }

      setWalletResult(resolveResult);
      setPhase('success');
      onResolved();
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'The challenge could not be completed.';
      setError(msg);
      setPhase('error');
    }
  }, [action, wallet, onResolved]);

  const retryResolve = useCallback(async () => {
    if (!deployHash) return;
    setPhase('resolving');
    try {
      const result = await clientApi.walletResolve(action.actionId, deployHash);
      setWalletResult(result);
      setPhase('success');
      onResolved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Resolution is still delayed.';
      setError(msg);
      setPhase('resolve_error');
    }
  }, [action.actionId, deployHash, onResolved]);

  const recheckFinality = useCallback(async () => {
    if (!deployHash) return;
    setPhase('finalizing');
    try {
      const tx = await clientApi.transactionStatus(deployHash);
      if (tx.final && tx.success) {
        setPhase('resolving');
        const result = await clientApi.walletResolve(action.actionId, deployHash);
        setWalletResult(result);
        setPhase('success');
        onResolved();
        return;
      }
      if (tx.final && !tx.success) {
        setError(tx.error || 'The challenge deploy failed on chain.');
        setPhase('error');
        return;
      }
    } catch {
      // still not final
    }
    setPhase('timeout');
  }, [action.actionId, deployHash, onResolved]);

  // Backend-signed challenge (fallback path, existing behavior)
  const [backendChallengeTx, setBackendChallengeTx] = useState<string | null>(null);

  const backendChallenge = useCallback(async () => {
    if (action.windowEnd <= Date.now()) {
      setPhase('expired');
      return;
    }
    setPhase('backend_submitting');
    setError('');
    try {
      const { challenge: cTx } = await clientApi.challenge(action.actionId);
      setBackendChallengeTx(cTx ?? null);
      setPhase('backend_pending');
      for (let i = 0; i < 40; i++) {
        try {
          const fresh = await clientApi.action(action.actionId);
          setAction(fresh);
          if (fresh.status === 'ResolvedSlash' || fresh.status === 'ResolvedRefund') {
            setPhase('backend_resolved');
            onResolved();
            return;
          }
        } catch { /* keep polling */ }
        await new Promise((r) => setTimeout(r, 2500));
      }
      setPhase('timeout');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'The challenge could not be submitted.';
      setError(msg);
      setPhase('error');
    }
  }, [action, onResolved]);

  const slash = action.events.find((e) => e.eventType === 'BondSlashed');
  const data = slash ? parseEventData(slash.data) : {};
  const challengerAmount = asAmount(data.challenger_amount);
  const reserveAmount = asAmount(data.pool_amount) ?? asAmount(data.reserve_amount);
  const resolvedSlash = action.status === 'ResolvedSlash';

  const sealState =
    (phase === 'success' || (phase === 'backend_resolved' && resolvedSlash)) ? 'strike' : 'stamp';

  const isWalletPhase = [
    'building', 'signing', 'submitted', 'finalizing',
    'resolving', 'success', 'rejected', 'timeout', 'resolve_error',
  ].includes(phase);

  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface">
      <div className="grid gap-6 border-b border-rule p-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <motion.div
          className="grid place-items-center"
          animate={
            (phase === 'finalizing' || phase === 'backend_pending' || phase === 'resolving') && !reduce
              ? { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 1.6 } }
              : { scale: 1 }
          }
        >
          <Seal state={sealState} size={116} />
        </motion.div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="serial text-[0.62rem] text-muted">{serial(action.actionId)}</span>
            {phase === 'idle' && <Countdown windowEnd={action.windowEnd} />}
          </div>
          <p className="mt-2 font-mono text-3xl text-bone tabular">
            <Money atomic={action.amount} />
          </p>
          <p className="mt-1 text-sm text-muted">
            Bond at stake <Money atomic={action.bondPosted} />
          </p>
        </div>
      </div>

      <div className="p-6">
        <Label>The agent approved this payout</Label>
        <blockquote className="mt-2 border-l-2 border-rule pl-4 text-sm leading-relaxed text-bone">
          {action.reasoning?.trim()
            ? `“${action.reasoning}”`
            : 'This payout reused a claim that had already been paid. The invoice was paid once before.'}
        </blockquote>

        <p className="mt-4 rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm leading-relaxed text-bone">
          This payout is a duplicate claim. The same invoice was already paid.
          Challenging it will slash the bond.
        </p>

        <AnimatePresence mode="wait">
          {/* IDLE: dual buttons */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-4"
            >
              {wallet.connected && wallet.publicKey ? (
                <>
                  <div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                    Connected as {truncateHash(wallet.publicKey)}
                  </div>
                  <button
                    type="button"
                    onClick={backendChallenge}
                    className="w-full rounded-md bg-accent px-5 py-3.5 font-medium text-ink transition-colors hover:bg-accent-strong"
                  >
                    Demo Challenge (Backend Key)
                  </button>
                  <button
                    type="button"
                    onClick={walletChallenge}
                    className="w-full rounded-md border border-rule px-5 py-2.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-bone"
                  >
                    Experimental wallet challenge
                  </button>
                  <p className="text-xs text-muted">
                    The primary demo uses a funded backend key so the contract
                    slash is reliable during judging. Wallet signing is available
                    for testnet users and costs ~50 CSPR gas.{' '}
                    <a
                      href="https://testnet.cspr.live/tools/faucet"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline decoration-rule underline-offset-2 hover:decoration-accent"
                    >
                      Need testnet gas?
                    </a>
                  </p>
                </>
              ) : (
                <>
                  {wallet.available ? (
                    <button
                      type="button"
                      onClick={wallet.connect}
                      className="w-full rounded-md bg-accent/20 border border-accent/40 px-5 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <WalletIcon />
                        Connect Wallet to Challenge
                      </span>
                    </button>
                  ) : (
                    <a
                      href="https://www.casperwallet.io"
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-accent/20 border border-accent/40 px-5 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
                    >
                      <WalletIcon />
                      Install Casper Wallet to Challenge
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={backendChallenge}
                    className="w-full rounded-md bg-accent px-5 py-3.5 font-medium text-ink transition-colors hover:bg-accent-strong"
                  >
                    Demo Challenge (Backend Key)
                  </button>
                  <p className="text-xs text-muted">
                    A funded backend key signs this challenge. The reward goes to
                    that key, not your wallet.
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* BUILDING */}
          {phase === 'building' && (
            <PhaseBox key="building">
              <StatusLine icon="spinner" text="Preparing the challenge transaction..." />
              <Detail label="Action" value={serial(action.actionId)} />
              {controllerHash && (
                <Detail label="Controller" value={truncateHash(controllerHash)} />
              )}
            </PhaseBox>
          )}

          {/* SIGNING */}
          {phase === 'signing' && (
            <PhaseBox key="signing">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={reduce ? {} : { scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <WalletIcon size={20} />
                </motion.div>
                <p className="text-sm text-accent">Confirm in your Casper Wallet.</p>
              </div>
              <Detail label="Action" value={serial(action.actionId)} />
              <Detail label="Estimated gas" value="~50 CSPR" />
            </PhaseBox>
          )}

          {/* REJECTED */}
          {phase === 'rejected' && (
            <PhaseBox key="rejected">
              <p className="rounded-md border border-rule bg-ink px-4 py-3 text-sm text-muted">
                Challenge cancelled. No transaction was sent and no gas was spent.
              </p>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Back
              </button>
            </PhaseBox>
          )}

          {/* SUBMITTED */}
          {phase === 'submitted' && (
            <PhaseBox key="submitted">
              <StatusLine icon="spinner" text="Challenge broadcast to Casper testnet." />
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
            </PhaseBox>
          )}

          {/* FINALIZING */}
          {phase === 'finalizing' && (
            <PhaseBox key="finalizing">
              <StatusLine
                icon="spinner"
                text="Waiting for block finality. This usually takes 30 to 90 seconds on testnet."
              />
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
            </PhaseBox>
          )}

          {/* TIMEOUT */}
          {phase === 'timeout' && (
            <PhaseBox key="timeout">
              <p className="rounded-md border border-rule bg-ink px-4 py-3 text-sm text-bone">
                Finality is taking longer than expected. Your transaction is live on the explorer.
              </p>
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
              <button
                type="button"
                onClick={recheckFinality}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Check again
              </button>
            </PhaseBox>
          )}

          {/* RESOLVING */}
          {phase === 'resolving' && (
            <PhaseBox key="resolving">
              <StatusLine icon="spinner" text="Resolving on contract..." />
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
            </PhaseBox>
          )}

          {/* RESOLVE_ERROR */}
          {phase === 'resolve_error' && (
            <PhaseBox key="resolve_error">
              <p className="rounded-md border border-rule bg-ink px-4 py-3 text-sm text-bone">
                Your challenge is confirmed on chain, but resolution is delayed.
                The protocol will settle within minutes.
              </p>
              {deployHash && <TxLine label="Challenge" hash={deployHash} />}
              <button
                type="button"
                onClick={retryResolve}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Try resolving again
              </button>
            </PhaseBox>
          )}

          {/* SUCCESS (wallet) */}
          {phase === 'success' && walletResult && (
            <motion.div
              key="success"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-4"
            >
              <p className="text-lg font-medium text-slash">Bond slashed.</p>
              <p className="text-sm text-bone">
                You claimed <Money atomic={walletResult.rewardAmount} /> csprUSD.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <SplitCard
                  label="To you, the challenger"
                  amount={walletResult.challengerShare}
                  delay={0.05}
                  reduce={!!reduce}
                />
                <SplitCard
                  label="To the reserve"
                  amount={walletResult.reserveShare}
                  delay={0.15}
                  reduce={!!reduce}
                />
              </div>
              <ChallengerLine
                storedChallenger={walletResult.challenger}
                connectedKey={wallet.publicKey}
              />
              <div className="space-y-2 border-t border-rule pt-3">
                <TxLine label="Challenge" hash={walletResult.challengeDeployHash} />
                <TxLine label="Resolve" hash={walletResult.resolveDeployHash} />
              </div>
              <Link
                href="/app/arena"
                className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-strong"
              >
                Find the next case
              </Link>
            </motion.div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <PhaseBox key="error">
              <p className="rounded-md border border-slash/30 bg-slash/5 px-4 py-3 text-sm text-bone">
                {error}
              </p>
              {deployHash && <TxLine label="Deploy" hash={deployHash} />}
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="rounded-md border border-rule px-4 py-2 text-sm text-bone hover:border-accent/50"
              >
                Try again
              </button>
            </PhaseBox>
          )}

          {/* EXPIRED */}
          {phase === 'expired' && (
            <motion.div
              key="expired"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5"
            >
              <p className="rounded-md border border-rule bg-surface px-4 py-3 text-sm text-muted">
                The challenge window for this action has closed.
              </p>
            </motion.div>
          )}

          {/* BACKEND submitting/pending (fallback path) */}
          {(phase === 'backend_submitting' || phase === 'backend_pending') && (
            <motion.div
              key="backend_pending"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-5 space-y-3"
            >
              <p className="flex items-center gap-2 text-sm text-accent">
                <Spinner />
                {phase === 'backend_submitting'
                  ? 'Submitting a real transaction to Casper testnet'
                  : 'Waiting for the slash to confirm on chain'}
              </p>
              {backendChallengeTx && <TxLine label="Challenge" hash={backendChallengeTx} />}
              <p className="text-xs text-muted">
                This can take up to a minute on testnet. Expected, not a hang.
                Demo Challenge (Backend Key); the reward goes to the backend key.
              </p>
            </motion.div>
          )}

          {/* BACKEND resolved (fallback path) */}
          {phase === 'backend_resolved' && (
            <BackendBondSplit
              resolvedSlash={resolvedSlash}
              challengerAmount={challengerAmount}
              reserveAmount={reserveAmount}
              challengeTx={backendChallengeTx ?? action.transactions.challenge ?? null}
              resolveTx={action.transactions.resolve ?? null}
              actionId={action.actionId}
              reduce={!!reduce}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChallengerLine({
  storedChallenger,
  connectedKey,
}: {
  storedChallenger: string;
  connectedKey: string | null;
}) {
  const isYou =
    connectedKey &&
    storedChallenger.toLowerCase().includes(connectedKey.toLowerCase().slice(0, 20));
  return (
    <div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
      {isYou ? (
        <>
          <span className="font-medium text-accent">Challenger: You</span>
          <CopyHash value={storedChallenger} href={accountExplorer(storedChallenger)} label={truncateHash(storedChallenger)} />
        </>
      ) : (
        <>
          <span className="text-muted">Challenger:</span>
          <CopyHash value={storedChallenger} href={accountExplorer(storedChallenger)} label={truncateHash(storedChallenger)} />
        </>
      )}
    </div>
  );
}

function PhaseBox({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-5 space-y-3"
      {...props}
    >
      {children}
    </motion.div>
  );
}

function StatusLine({ icon, text }: { icon: 'spinner'; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-accent">
      {icon === 'spinner' && <Spinner />}
      {text}
    </p>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-muted">
      {label}: <span className="font-mono text-bone">{value}</span>
    </p>
  );
}

function BackendBondSplit({
  resolvedSlash,
  challengerAmount,
  reserveAmount,
  challengeTx,
  resolveTx,
  actionId,
  reduce,
}: {
  resolvedSlash: boolean;
  challengerAmount: string | null;
  reserveAmount: string | null;
  challengeTx: string | null;
  resolveTx: string | null;
  actionId: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      key="backend_resolved"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 space-y-4"
    >
      <p className={`text-lg font-medium ${resolvedSlash ? 'text-slash' : 'text-accent'}`}>
        {resolvedSlash
          ? 'Payout challenged. Bond slashed.'
          : 'The window closed clean. The bond returned in full.'}
      </p>
      {resolvedSlash && (
        <p className="text-sm text-muted">
          Demo Challenge (Backend Key). The reward went to the backend key.
        </p>
      )}

      {resolvedSlash && (challengerAmount || reserveAmount) && (
        <div className="grid grid-cols-2 gap-3">
          <SplitCard label="To the backend key" amount={challengerAmount} delay={0.05} reduce={reduce} />
          <SplitCard label="To the reserve" amount={reserveAmount} delay={0.15} reduce={reduce} />
        </div>
      )}

      <div className="space-y-2 border-t border-rule pt-3">
        {challengeTx && <TxLine label="Challenge" hash={challengeTx} />}
        {resolveTx && <TxLine label="Resolve" hash={resolveTx} />}
      </div>
      <Link
        href={`/app/actions/${actionId}`}
        className="inline-block text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
      >
        See the full action
      </Link>
    </motion.div>
  );
}

function SplitCard({
  label,
  amount,
  delay,
  reduce,
}: {
  label: string;
  amount: string | null;
  delay: number;
  reduce: boolean;
}) {
  if (!amount) return null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-md border border-rule bg-ink px-4 py-3"
    >
      <Label>{label}</Label>
      <p className="mt-1 text-lg text-bone">
        <Money atomic={amount} />
      </p>
    </motion.div>
  );
}

function TxLine({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label} transaction</span>
      <CopyHash value={hash} href={txExplorer(hash)} label={truncateHash(hash)} />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
      <rect x="2" y="5" width="20" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
      <path d="M6 5V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
