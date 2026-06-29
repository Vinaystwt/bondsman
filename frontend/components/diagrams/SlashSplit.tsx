'use client';

import { C, DiagramFrame, Node, Arrow, Reveal } from './primitives';

// A slashed bond divides in two: half to the challenger, half to the reserve.
export default function SlashSplit() {
  return (
    <DiagramFrame
      title="A slashed bond splits in half: one share to the challenger, one to the reserve"
      caption="Paying the challenger rewards the work of catching a wrong payout. The reserve share protects the people whose money the agent moves."
      viewBox="0 0 420 230"
    >
      <Node x={150} y={16} w={120} h={48} line1="Slashed bond" tone="void" order={0} filled />

      <Arrow d="M178 64 C 150 100, 110 120, 92 150" tone="copper" order={1} />
      <Arrow d="M242 64 C 270 100, 310 120, 328 150" tone="sage" order={1} />

      <Node x={20} y={150} w={150} h={56} line1="To the challenger" line2="50 percent" tone="copper" order={2} filled />
      <Node x={250} y={150} w={150} h={56} line1="To the reserve" line2="50 percent" tone="sage" order={2} filled />

      <Reveal order={1}>
        <text x={210} y={110} textAnchor="middle" fill={C.muted} style={{ fontSize: 8 }}>
          split in two
        </text>
      </Reveal>
    </DiagramFrame>
  );
}
