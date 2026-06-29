'use client';

import { C, DiagramFrame, Node, Arrow, Reveal } from './primitives';

// The chain is authoritative (top). The backend projects it. The app reads the
// projection and sends challenges back through the API.
export default function SystemArchitecture() {
  return (
    <DiagramFrame
      title="System architecture: the chain is the source of truth, the backend projects it, the app reads it"
      caption="The four contracts on Casper hold the truth. The backend listens, projects, and serves. The app only ever reads a projection of the chain."
      viewBox="0 0 520 350"
    >
      {/* Chain region, authoritative */}
      <Reveal order={0}>
        <rect x={14} y={16} width={492} height={86} rx={6} fill={C.ink} stroke={C.copper} strokeWidth={1.4} />
        <text x={26} y={34} fill={C.copper} style={{ fontSize: 8.5, letterSpacing: '0.08em' }}>
          CASPER TESTNET · THE CHAIN IS AUTHORITATIVE
        </text>
      </Reveal>
      <Node x={26} y={48} w={108} h={42} line1="Controller" tone="copper" order={0} />
      <Node x={146} y={48} w={108} h={42} line1="Bond vault" tone="copper" order={0} />
      <Node x={266} y={48} w={108} h={42} line1="Invoice pool" tone="copper" order={1} />
      <Node x={386} y={48} w={108} h={42} line1="csprUSD" tone="copper" order={1} />

      {/* Backend region */}
      <Reveal order={2}>
        <text x={26} y={134} fill={C.muted} style={{ fontSize: 8.5, letterSpacing: '0.08em' }}>
          BACKEND (OFF CHAIN)
        </text>
      </Reveal>
      <Node x={26} y={144} w={108} h={46} line1="Agent" line2="reads, decides" tone="bone" order={2} />
      <Node x={146} y={144} w={108} h={46} line1="Listener" line2="reads events" tone="bone" order={3} />
      <Node x={266} y={144} w={108} h={46} line1="Projection" line2="state store" tone="bone" order={3} />
      <Node x={386} y={144} w={108} h={46} line1="API" line2="serves reads" tone="bone" order={4} />

      {/* App region */}
      <Node x={160} y={266} w={200} h={48} line1="Bondsman app and demo" line2="reads, then challenges" tone="sage" order={5} />

      {/* Write path: agent to chain */}
      <Arrow d="M80 144 L80 92" tone="copper" order={2} />
      <Reveal order={2}>
        <text x={92} y={120} fill={C.copper} style={{ fontSize: 7.5 }}>
          initiates and bonds
        </text>
      </Reveal>

      {/* Event pipeline */}
      <Arrow d="M320 92 L200 144" tone="muted" order={3} />
      <Reveal order={3}>
        <text x={300} y={120} fill={C.muted} style={{ fontSize: 7.5 }}>
          events
        </text>
      </Reveal>
      <Arrow d="M254 167 L266 167" tone="muted" order={3} />
      <Arrow d="M374 167 L386 167" tone="muted" order={4} />

      {/* Reads: API to app */}
      <Arrow d="M440 190 C 440 240, 360 250, 320 266" tone="sage" order={5} />
      <Reveal order={5}>
        <text x={430} y={232} fill={C.sage} style={{ fontSize: 7.5 }}>
          serves reads
        </text>
      </Reveal>

      {/* Challenge: app back through API to chain */}
      <Arrow d="M200 266 C 150 230, 150 120, 134 96" tone="copper" order={6} dashed />
      <Reveal order={6}>
        <text x={120} y={238} fill={C.copper} style={{ fontSize: 7.5 }}>
          challenge
        </text>
      </Reveal>
    </DiagramFrame>
  );
}
