'use client';

import { C, DiagramFrame, Node, Arrow, Reveal } from './primitives';

// Invoice in, the model reasons, the decision and its reasoning hash are
// committed on-chain, the action is initiated.
export default function AgentDecision() {
  return (
    <DiagramFrame
      title="The agent reads an invoice, reasons, and commits its decision on-chain"
      caption="The reasoning is written by the model and its hash is committed with the action, so the decision cannot be quietly rewritten later."
      viewBox="0 0 580 180"
    >
      <Node x={12} y={62} w={116} h={56} line1="Invoice in" line2="amount, claim hash" tone="muted" order={0} />
      <Node x={162} y={62} w={116} h={56} line1="Model reasons" line2="checks the policy" tone="bone" order={1} />
      <Node x={312} y={62} w={120} h={56} line1="Decision and hash" line2="committed on-chain" tone="copper" order={2} filled />
      <Node x={466} y={62} w={104} h={56} line1="Action" line2="initiated" tone="copper" order={3} filled />

      <Arrow d="M128 90 L162 90" tone="muted" order={0} />
      <Arrow d="M278 90 L312 90" tone="copper" order={1} />
      <Arrow d="M432 90 L466 90" tone="copper" order={2} />

      <Reveal order={1}>
        <text x={220} y={146} textAnchor="middle" fill={C.muted} style={{ fontSize: 7.5 }}>
          approve or reject, with a written reason
        </text>
      </Reveal>
    </DiagramFrame>
  );
}
