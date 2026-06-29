'use client';

import { C, DiagramFrame, Node, Arrow, Reveal } from './primitives';

// Two invoices share one claim hash. The contract detects the collision and
// slashes. No human judges it.
export default function DuplicateClaim() {
  return (
    <DiagramFrame
      title="Two invoices with the same claim hash collide, and the contract slashes the bond"
      caption="The claim hash is a fingerprint of what an invoice claims. When the same fingerprint is paid twice, the contract proves the duplicate on its own. No human decides it."
      viewBox="0 0 520 250"
    >
      <Node x={12} y={28} w={150} h={52} line1="Invoice already paid" line2="claim a1b2…f3" tone="muted" order={0} />
      <Node x={12} y={150} w={150} h={52} line1="New payout" line2="claim a1b2…f3" tone="copper" order={1} />

      <Arrow d="M162 54 C 200 54, 210 100, 248 116" tone="muted" order={1} />
      <Arrow d="M162 176 C 200 176, 210 130, 248 124" tone="copper" order={1} />

      <Node x={250} y={96} w={140} h={56} line1="Invoice pool" line2="same hash detected" tone="void" order={2} filled />

      <Arrow d="M390 124 L432 124" tone="void" order={3} />
      <Node x={420} y={96} w={90} h={56} line1="Slash" tone="void" order={3} filled />

      <Reveal order={3}>
        <text x={300} y={196} textAnchor="middle" fill={C.muted} style={{ fontSize: 8 }}>
          no human in the path
        </text>
      </Reveal>
    </DiagramFrame>
  );
}
