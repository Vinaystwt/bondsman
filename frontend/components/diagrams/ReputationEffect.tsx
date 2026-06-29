'use client';

import { C, DiagramFrame, Node, Arrow, Reveal } from './primitives';

// A clean record lowers future bonds; a slash raises them. Tied to the real
// 20 versus 24 csprUSD bond on a 1,000 csprUSD payout.
export default function ReputationEffect() {
  return (
    <DiagramFrame
      title="A clean record lowers the next bond; a slash raises it"
      caption="The same 1,000 csprUSD payout needs a 20 csprUSD bond from an agent in good standing, and 24 csprUSD once a slash has pushed its score negative."
      viewBox="0 0 540 240"
    >
      <Node x={16} y={20} w={150} h={46} line1="Clean action" line2="adds 10 to score" tone="sage" order={0} />
      <Node x={374} y={20} w={150} h={46} line1="Slash" line2="drops 50 from score" tone="void" order={0} />

      <Node x={200} y={92} w={140} h={46} line1="Reputation score" tone="bone" order={1} />

      <Arrow d="M120 66 C 150 90, 190 100, 200 110" tone="sage" order={1} />
      <Arrow d="M420 66 C 390 90, 350 100, 340 110" tone="void" order={1} />

      <Arrow d="M236 138 C 200 170, 160 175, 130 188" tone="sage" order={2} />
      <Arrow d="M304 138 C 340 170, 380 175, 410 188" tone="copper" order={2} />

      <Node x={16} y={180} w={210} h={52} line1="Bond on 1,000 csprUSD: 20" line2="good standing" tone="sage" order={3} filled />
      <Node x={314} y={180} w={210} h={52} line1="Bond on 1,000 csprUSD: 24" line2="after a slash" tone="copper" order={3} filled />

      <Reveal order={2}>
        <text x={150} y={165} textAnchor="middle" fill={C.muted} style={{ fontSize: 7.5 }}>
          score up, bond down
        </text>
        <text x={392} y={165} textAnchor="middle" fill={C.muted} style={{ fontSize: 7.5 }}>
          score down, bond up
        </text>
      </Reveal>
    </DiagramFrame>
  );
}
