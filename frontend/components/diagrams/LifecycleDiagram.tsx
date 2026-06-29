'use client';

import { C, DiagramFrame, Node, Arrow, Reveal } from './primitives';

// The centerpiece. Intent, bond, execute, challenge window, then the two
// branches: clean refund in sage, or the slash in the one red.
export default function LifecycleDiagram() {
  return (
    <DiagramFrame
      title="The lifecycle of a bonded action, from intent to refund or slash"
      caption="Every action follows the same path. It ends one of two ways: the bond returns, or the bond is taken."
      viewBox="0 0 640 270"
    >
      {/* Main spine */}
      <Node x={12} y={108} w={96} h={48} line1="Intent" line2="decision committed" tone="muted" order={0} />
      <Node x={140} y={108} w={96} h={48} line1="Bond" line2="stake locked" tone="copper" order={1} filled />
      <Node x={268} y={108} w={96} h={48} line1="Execute" line2="payout clears" tone="copper" order={2} filled />
      <Node x={396} y={108} w={120} h={48} line1="Challenge window" line2="open to anyone" tone="copper" order={3} />

      <Arrow d="M108 132 L140 132" tone="muted" order={0} />
      <Arrow d="M236 132 L268 132" tone="copper" order={1} />
      <Arrow d="M364 132 L396 132" tone="copper" order={2} />

      {/* Clean branch, up */}
      <Arrow d="M516 120 C 548 120, 548 70, 572 70" tone="sage" order={4} />
      <Node x={520} y={42} w={108} h={48} line1="Refund" line2="bond returns" tone="sage" order={5} filled />
      <Reveal order={5}>
        <circle cx={538} cy={66} r={7} fill="none" stroke={C.sage} strokeWidth={1.6} />
        <path d="M535 66 l2.5 2.5 L543 63" fill="none" stroke={C.sage} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <text x={566} y={104} textAnchor="middle" fill={C.muted} style={{ fontSize: 7.5 }}>
          no challenge holds
        </text>
      </Reveal>

      {/* Slash branch, down */}
      <Arrow d="M516 144 C 548 144, 548 196, 572 196" tone="void" order={5} />
      <Node x={520} y={178} w={108} h={48} line1="Slash" line2="bond taken" tone="void" order={6} filled />
      <Reveal order={6}>
        <circle cx={538} cy={202} r={7} fill="none" stroke={C.void} strokeWidth={1.6} />
        <path d="M533 197 l10 10" stroke={C.void} strokeWidth={1.8} strokeLinecap="round" />
        <text x={566} y={240} textAnchor="middle" fill={C.muted} style={{ fontSize: 7.5 }}>
          duplicate found
        </text>
      </Reveal>
    </DiagramFrame>
  );
}
