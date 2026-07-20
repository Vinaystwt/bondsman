# Product Loop Redesign Phase 0 Audit

Date: 2026-07-20
Branch: `product-loop-redesign`

## Required repository checks

- Started from `/Users/vinaysharma/bondsman`.
- `git fetch origin` completed.
- Current source branch before creating this branch was `final-frontend`.
- `final-frontend` was up to date with `origin/final-frontend`.
- Required tip commit present: `9dace0d Slice 9: narrow final QA correction`.
- Created `product-loop-redesign` from latest `final-frontend`.
- `main` was not checked out, merged into, or modified.
- Working tree before audit had one untracked source asset directory: `design-inputs/`.

## Asset audit

Both provided logo source files exist and are valid PNG images. These are source inputs only and must not be overwritten.

| File | Dimensions | SHA256 |
| --- | ---: | --- |
| `design-inputs/bondsman-logo-reference.png` | 1254 by 1254 | `b7db25f29f2439e52994dbea1155d2444bfc36226b79dd66127050760100f2b7` |
| `design-inputs/bondsman-logo-final.png` | 1254 by 1254 | `66a2db4292803e8644c1a9fdadfa99c0258c4a81182aa20de01ef6caddcbaf66` |

The final image is the primary logo reference. The reference image is concept context only.

## Frontend app routes

Current files under `frontend/app/`:

- `/` implemented by `frontend/app/page.tsx`.
- `/proof` implemented by `frontend/app/proof/page.tsx`.
- `/assurance` implemented by `frontend/app/assurance/page.tsx`.
- `/build` implemented by `frontend/app/build/page.tsx`.
- `/docs` implemented by `frontend/app/docs/page.tsx`.
- API proxy helpers exist at `frontend/app/api/health/route.ts` and `frontend/app/api/deployments/route.ts`.

Current route configuration in `frontend/next.config.mjs` rewrites `/api/*`, `/v1/*`, and `/.well-known/*` to the backend. It also permanently redirects `/app`, `/app/actions`, `/app/arena`, `/app/ledger`, `/app/leaderboard`, `/app/agents`, and any `/app/:path*` path to `/proof`. This must be replaced for the new operational app.

## Frontend components to retain

- `frontend/components/ui/*`: strong primitives, status pills, copy hash, amount formatting surfaces.
- `frontend/components/assurance/ScenarioForm.tsx`: useful input mechanics for amount, confidence, counterparty status, evidence source, max tolerated loss, urgency.
- `frontend/components/assurance/AnalysisResult.tsx`: useful split between model interpretation, deterministic policy, verifier evidence, and manifest.
- `frontend/components/proof/ReceiptTamperLab.tsx`: should stay prominent for `/verify` and historical proof.
- `frontend/components/proof/ReplayTimeline.tsx`: useful transaction and evidence rendering, but needs simplification and relabeling.
- `frontend/components/proof/BondEconomicsCard.tsx`: useful compact economics panel.
- `frontend/components/proof/CanonicalSummary.tsx`, `ReceiptPanel.tsx`, `PanelGrid.tsx`: reusable proof detail building blocks.
- `frontend/lib/format.ts`: useful amount, hash, explorer helpers.
- `frontend/lib/types.ts`: useful current backend type coverage, but missing paid quote and submit action client types.

## Frontend components to reposition

- `frontend/components/proof/LiveQuoteProbe.tsx`: move from primary proof experience to Build as "Test the payment requirement", labelled live request, no payment, no transaction.
- `frontend/components/proof/QuoteSingleUseCheck.tsx`: move under advanced historical proof details.
- `frontend/components/assurance/StudioClient.tsx`: current design flow should become the first half of `/app/new`, not a standalone primary nav item.
- `frontend/app/assurance/page.tsx`: legacy route should redirect to or wrap `/app/new` with the policy step selected.
- `frontend/app/docs/page.tsx`: keep for deep documentation but remove from primary navigation.

## Frontend components to simplify

- `frontend/app/page.tsx`: currently proof first with three equal onboarding cards. It should become product first, with the required narrative and action creation CTA.
- `frontend/app/proof/page.tsx`: currently too long and repeats Action 27 facts. Replace with one lifecycle rail, one replay interaction, compact economics, evidence drawer, verifier, and tamper lab.
- `frontend/components/landing/BondedExecutionAnimation.tsx`: currently repeats indefinitely and fades to empty during reset. Replace with one run, persistent final state, replay button, and reduced motion final state.
- `frontend/components/Nav.tsx`: remove hover dropdown and replace nav labels with Product, App, Proof, Build.
- `frontend/components/Footer.tsx`: update to Product, App, Proof, Build, Verify, Docs.

## Frontend components or routes to remove from primary product

- No restored Arena.
- No public operator funded demo transaction UI.
- No public wallet challenge bounty flow.
- No leaderboard, ledger, ready cases, public demo, or proof console CTA as the product shell.
- The current `/assurance` primary navigation item should be removed. The capability lives inside `/app/new` and Build docs.

## Final route map to create

- `/`: product homepage.
- `/app`: operational application home.
- `/app/new`: staged bonded action creation.
- `/app/actions/[id]`: action monitor and receipt page.
- `/proof`: historical proof library.
- `/proof/27`: canonical Action 27 replay.
- `/verify`: portable receipt verifier.
- `/build`: developer integration.
- `/docs`: deep docs, not primary nav.

Legacy redirects should preserve safe access and avoid trapping `/app` paths at `/proof`.

## Backend surfaces already available

Public read and design:

- `GET /api/health`
- `GET /api/public-capabilities`
- `GET /api/deployments`
- `GET /api/actions`
- `GET /api/actions/:id`
- `GET /api/verifiers`
- `GET /api/verifiers/:faultClass`
- `GET /api/assurance/templates`
- `POST /api/assurance/analyze`
- `GET /api/proofs/canonical`
- `GET /api/replay/canonical`
- `POST /api/replay/canonical/quote-check`
- `GET /api/receipt/:id`
- `GET /api/receipt/:id/verify`
- `POST /api/receipt/:id/verify`
- `GET /.well-known/agent.json`

Public paid execution:

- `POST /v1/actions/quote`
- `POST /v1/actions/submit`

Public evidence input:

- `POST /api/delivery-attestation`

Public transaction read:

- `GET /api/transactions/:hash`

Operator protected or disabled surfaces:

- `/api/challenge`
- `/api/resolve`
- `/api/demo/*`
- `/api/watchdog/demo*`
- `/api/jobs/:id`
- `/api/challenge/wallet-resolve`
- `/api/ops/*`

## Wallet code history

Deleted wallet files are recoverable from earlier frontend commits, especially `c5319ac feat(frontend): arena, docket, wallet-signed challenge, correctness pass`:

- `frontend/lib/wallet.tsx`
- `frontend/lib/challenge-deploy.ts`
- `frontend/components/WalletButton.tsx`
- `frontend/components/arena/ManualChallenge.tsx`

Those files used `window.CasperWalletProvider`, `requestConnection`, `getActivePublicKey`, `disconnectFromSite`, and `sign(transactionJson, publicKey)`. They are reference only because they supported the removed wallet challenge Arena and should not be restored as a public challenge bounty flow.

## Packages and docs

- `packages/` does not exist in the current worktree.
- `examples/casper-agent-assurance/` is read only and currently demonstrates design, unpaid 402 probe, canonical replay, receipt verify, and tamper rejection. It does not submit paid actions.
- `backend/docs/` does not exist. Project docs live under `docs/`.
- `docs/X402_STATUS.md`, `docs/INTEGRATION.md`, `docs/THREAT_MODEL.md`, `docs/POLICY_ENGINE.md`, and `docs/CANONICAL_PROOF.md` contain the most useful integration truth.
- Root workspace includes `backend` only. Frontend is its own package under `frontend/`.

## Phase 0 conclusion

The strongest existing frontend is the proof and assurance component set, not the current route architecture. The backend already exposes the paid execution loop, but the frontend intentionally omits paid quote settlement, payer authorization, paid action submit, operational action monitoring, and user owned receipt retrieval. The product loop redesign should restructure routes and reuse existing design primitives while adding a real wallet and paid HTTP state machine.
