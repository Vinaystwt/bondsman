import { Label } from '@/components/ui/Primitives';

export default function FaucetHint({ className }: { className?: string }) {
  return (
    <div className={`rounded-md border border-rule bg-surface p-4 ${className ?? ''}`}>
      <Label>No testnet gas?</Label>
      <p className="mt-2 text-sm leading-relaxed text-bone">
        Signing a challenge costs about 50 CSPR of testnet gas. If your wallet
        is empty, request testnet CSPR from the Casper faucet.
      </p>
      <a
        href="https://testnet.cspr.live/tools/faucet"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
      >
        Open Casper faucet
      </a>
    </div>
  );
}
