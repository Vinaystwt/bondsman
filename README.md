# Bondsman

**An on-chain accountability layer for autonomous finance agents on Casper.**

Bondsman forces an autonomous agent to post a slashable bond before it can move tokenized capital. If the agent's action is later proven wrong, the contract slashes the bond automatically. No committee, no appeal, no human judgment. If the action holds up, the bond is refunded in full and the agent's on-chain reputation improves.

Live on Casper Testnet. Every bond, every slash, every refund is a real transaction, verifiable on the public explorer.

---

## The problem

Autonomous agents are being handed the keys to DeFi vaults and tokenized asset pools. An agent can approve a payout in milliseconds. Today, if it is wrong, whether from a hallucination, a stale input, or an outright duplicate, the loss lands on depositors, and the agent risks nothing.

Bondsman closes that gap. It makes an agent stake real capital before it can act, so a confident mistake has a cost, and that cost lands exactly where the decision was made.

## The use case: paying invoices, without paying twice

An agent processing accounts payable approves invoices for payment. The expensive, common failure is paying the same invoice twice: a duplicate slips through and the money is gone.

Bondsman gives every invoice a claim hash, a fingerprint of what it claims. When a payout reuses a fingerprint that was already paid, the contract proves the duplicate and slashes the bond. The agent loses its own stake before anyone else loses a cent.

![How it works: the bonded action lifecycle](frontend/public/diagrams/lifecycle.svg)

Every bonded action follows the same path: an agent commits its reasoning and initiates the action, locks a risk-weighted bond, executes the payout, and opens a challenge window. It ends one of two ways: the bond returns, or the bond is taken.

---

## The contract proves the fraud, nobody judges it

No human decides a slash. Each invoice carries a claim hash, `blake2b(debtor + invoice_number)`. When a payout reuses a hash that was already paid, the pool contract sees the collision and the slash follows automatically. It is a fact the chain can verify, not a verdict someone renders.

![Duplicate claim proof](frontend/public/diagrams/duplicate-proof.svg)

When a bond is slashed, it splits: half rewards whoever proved the fault, half funds a protection reserve that backstops the pool's depositors.

![The slash split](frontend/public/diagrams/slash-split.svg)

A confident mistake costs the agent its own capital. The money lands where the harm would have.

---

## Two autonomous agents, one contract as referee

Bondsman runs two agents against each other, with no human in the loop:

- **The approver** is model-driven. It reviews an invoice with a language model (Claude Haiku), decides whether to approve it, and commits a hash of its reasoning on chain before it acts. It can be wrong, and confidently so, because it sees only the invoice in front of it, exactly what a real payout agent sees in production.
- **The watchdog** is deterministic. It has its own funded Casper account, independently detects duplicate claims by comparing on-chain fingerprints, and autonomously challenges and slashes them, earning the reward itself. It never sleeps and it never asks permission.

![The two-agent economy](frontend/public/diagrams/agent-economy.svg)

Production public judging is now centered on the canonical proof console and Assurance Studio. Legacy public challenge and wallet challenge modes are disabled in production; fresh demo actions, challenges, resolutions, and watchdog demo writes are operator-only.

---

## Architecture

![System architecture](frontend/public/diagrams/architecture.svg)

- **Smart contracts** (Rust, Odra framework, compiled to WASM, deployed on Casper Testnet):
  - `MockCsprUSD`, a CEP-18 testnet stablecoin used for bonds and payouts.
  - `BondVault`, custodies bonds, refunds clean ones, and splits a slash between the challenger and the reserve.
  - `BondsmanController`, owns the action lifecycle, the risk-weighted bond calculation, agent reputation, and challenge resolution.
  - `InvoicePool`, stores invoices, pays vendors, records the first paid claim per fingerprint, and proves duplicates on chain.
- **Backend** (TypeScript): a Fastify API, an event listener that projects Casper Event Standard events into SQLite, the approver agent runner, watchdog daemon, canonical replay service, Assurance Studio policy surface, paid x402 action submission, and operator-only demo controls.
- **Frontend** (Next.js, TypeScript, Tailwind): the public site and the app, including the Challenge Arena, the action Docket, My Ledger, the Agents directory, and the Leaderboard.
- **MCP server**: exposes read-only state, assurance design, canonical replay, quote probing, paid submit, receipt verification, verifier discovery, and deployment metadata so bonded accountability is adoptable infrastructure, not just a demo.

### Verifiers, proofs, and integrations

The live controller settles duplicate-claim evidence on chain and has verifier contracts for duplicate claims and signed delivery contradictions. The delivery verifier checks that a buyer or logistics rejection is bound to the intended action and consumes the evidence once, preventing replay. Wallet-signed challenges remain labeled experimental until they have enough production traffic to treat as the default reviewer path.

Completed actions expose a cacheable proof object and a signed portable receipt. Agents can discover the service through its [A2A Agent Card](https://bondsman-backend-production.up.railway.app/.well-known/agent.json) or use remote MCP at `https://bondsman-backend-production.up.railway.app/mcp`.

Integration and security references:

- `docs/INTEGRATION.md`
- `docs/FAULT_CLASSES.md`
- `docs/BOND_ECONOMICS.md`
- `docs/POLICY_ENGINE.md`
- `docs/ASSURANCE_MANIFEST.md`
- `docs/JUDGING_EVIDENCE.md`
- `docs/RECEIPT_VERIFICATION.md`
- `docs/INVARIANTS.md`
- `docs/THREAT_MODEL.md`
- `docs/X402_STATUS.md`
- `docs/CASPER_IMPACT.md`
- `docs/ECOSYSTEM_INTEGRATION_BLUEPRINTS.md`
- `docs/DESIGN_PARTNER_BRIEF.md`

### The bond and reputation

The required bond scales with the size of the payout, and rises further if the agent's on-chain reputation is negative. A clean action adds to reputation; a slash subtracts far more. The bond floor by amount tier never discounts below the base rate, so there is no way to grind a good reputation on small actions and then defect on a large one.

### Current testnet deployment

Bondsman is deployed as a live Casper Testnet prototype with real on-chain execution. The core accountability loop is active today: agents post bonds, payouts execute through the invoice pool, duplicate claims can be challenged, bonds can be slashed, reserves update, and agent reputation changes on chain.

The invoice dataset uses controlled testnet fixtures so duplicate and delivery-contradiction scenarios can be reproduced safely and consistently during demos. The stablecoin is a testnet CEP 18 asset. The paid quote flow uses real Casper x402 settlement through WCSPR and the CSPR.cloud facilitator: `/v1/actions/quote` settles the paid quote, then `/v1/actions/submit` binds that quote to exactly one bonded action. The older `/api/labs/x402-sandbox` path remains only as a labeled reference and never fabricates a settlement receipt. See `docs/X402_STATUS.md` for the current payment status.

---

## Live deployment (Casper Testnet)

| Contract | Address |
|---|---|
| BondsmanController | `hash-859c4d7c4ca016fa02ffd0f45c2ddc30705225de173369bbab25e5b21167ce16` |
| BondVault | `hash-bb32349cd7f139f88fed900c115dba18e504412d140c38e4c0818b5a2ff391bd` |
| InvoicePool | `hash-7c240fe8ac023d32fa8fefbf0748167163407135cf30244a3da09c1a2b554874` |
| MockCsprUSD | `hash-410af53a3a93196081eb3b8c7dafab120efeed826b30b23cbed3873203709668` |
| DuplicateClaimVerifier | `hash-991eb33db15d2e0e0e917bdfe6c32ed57f93a8c6cc60be712559d24b265feea2` |
| DeliveryContradictionVerifier | `hash-6964d72173a0a04c54b16c977c586877f4c6d1f3b852aa8fb7e926dd94215177` |

The canonical, up-to-date set lives in `deployments/testnet.json`, since contracts may be redeployed as the product evolves. Every address above is a live link on `testnet.cspr.live`.

### Judge testing playbook

1. Confirm the backend is healthy at [the health endpoint](https://bondsman-backend-production.up.railway.app/api/health).
2. Confirm canonical Action 27 at [the canonical proof endpoint](https://bondsman-backend-production.up.railway.app/api/proofs/canonical).
3. Replay the canonical evidence at [the replay endpoint](https://bondsman-backend-production.up.railway.app/api/replay/canonical).
4. Verify the receipt at [the receipt verification endpoint](https://bondsman-backend-production.up.railway.app/api/receipt/27/verify).
5. Probe `/v1/actions/quote` without payment and expect x402 HTTP 402 with no protocol mutation.
6. Try Assurance Studio through `/api/assurance/templates` and `/api/assurance/analyze`.

Recent real duplicate slash proof:

| Step | Transaction |
|---|---|
| Initiate | `f255ae41faa267612373fe22ff827c0f3ac9e60b6e71521a0c53b8203364001b` |
| Approve bond spend | `ea36e1b5e23e58af10d40f6e217b5523063f5a7518d94bc3d52e804968c0fc07` |
| Post bond | `e90e29852b2ac41bfc069c883ecea9025112cf76ee065942d280f2464ef67410` |
| Execute payout | `c1965e592dca5369172550d0b05443d77c112d76e40803f6e96ee0096994fba5` |
| Challenge | `5ceee10ac13d83e3f0c7d24cc4db82f043959212b1d501fc09021a9035ca1164` |
| Resolve slash | `084a544a003335df3b6e76c72dc66d265a340ae10946127791bef8b17f835183` |

The historical transaction set above remains useful context, but canonical production judging should use Action 27 and the replay bundle instead of creating a fresh challenge.

---

## MCP: integrate bonded accountability into your own agent

Bondsman exposes an MCP server so any Casper agent can check reputation, price a bond, or challenge a bad action without reading the contracts directly.

Published on npm: **[@vinaystwt/bondsman-mcp](https://www.npmjs.com/package/@vinaystwt/bondsman-mcp)**

```bash
npm install -g @vinaystwt/bondsman-mcp
bondsman-mcp
```

Tools exposed include `get_action`, `list_actions`, `get_reputation`, `get_deployments`, `get_verifiers`, `verify_receipt`, `get_assurance_templates`, `design_assurance_policy`, `quote_bonded_action`, `submit_bonded_action`, `replay_canonical_proof`, `check_canonical_quote`, and `public_capabilities`. See `mcp-package/` for source and a runnable example.

---

## Roadmap

- **Q3 2026.** Harden the bond and slash logic through external review. Replace the testnet stablecoin with live csprUSD. Sign a first design partner running a real invoice or private credit pool on Casper.
- **Q4 2026.** Agent operator tools and a proof center. The x402 metered quote path documented for real service integration.
- **Q1 2027.** An underwriting and policy layer: reserve analytics, policy templates for challenge windows and risk tiers, and a portable agent reputation passport other Casper protocols can read.
- **Q2 2027 and the mainnet path.** Production contracts with production csprUSD, oracle backed delivery attestation, production x402 settlement, and reputation APIs for integrators.

Full detail on the [roadmap page](https://bondsman.vercel.app/roadmap).

---

## Running it locally

```bash
git clone https://github.com/vinaystwt/bondsman
cd bondsman
npm install

# Backend
npm run build:contracts   # already deployed; only needed if you redeploy
npm run api               # Fastify API on :3001
npm run listener          # projects on-chain events into SQLite
npm run watchdog          # the autonomous watchdog agent

# Frontend
cd frontend
npm install
npm run dev                # :3000, proxies to the local API
```

Copy `.env.example` to `.env` and fill in your own testnet keys and an Anthropic API key for the approver agent. See `deployments/testnet.json` for the live contract addresses this repo already targets.

## Live demo

[bondsman.vercel.app](https://bondsman.vercel.app)

The hosted frontend requires the backend to be reachable at the URL set in `NEXT_PUBLIC_API_BASE`. See the deployment notes in the repository for how the backend is hosted for the public demo.

---

## License

MIT
