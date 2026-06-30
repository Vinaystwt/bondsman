# Bondsman

Bondsman is a Casper testnet backend for autonomous invoice payouts backed by slashable csprUSD bonds. An agent evaluates one invoice, commits its reasoning digest, locks a bond, and executes the payout. A duplicate claim can be proven by the InvoicePool and slashed without human judgment; a clean action refunds after its challenge window.

No frontend is included. The stable integration boundaries are `deployments/testnet.json` and the REST API below.

## Architecture

- `MockCsprUSD` is a 9-decimal CEP-18 token with owner minting and delegated allowance transfers.
- `BondVault` pulls approved agent tokens, releases clean bonds, and makes both slash transfers: half to the challenger and half to InvoicePool.
- `BondsmanController` computes risk-tier bonds, owns action lifecycle and reputation, and uses Casper block time in milliseconds. It computes `window_end = block_time_ms + window_secs * 1000`.
- `InvoicePool` stores invoices, pays vendors, records the first paid claim, proves later duplicates, and accounts for its protection reserve.
- The TypeScript agent calls Anthropic Haiku 4.5 once per invoice at temperature zero. The model receives no paid-claim registry or cross-invoice memory.
- The listener reads CES event dictionaries, reconciles authoritative contract state, resolves expired clean actions, and projects into SQLite.
- Fastify serves the projected state and owns challenge and resolution transactions.

The vault performs both token transfers during a slash. The controller calls `pool.add_to_reserve(remainder)` only to update reserve accounting; it never transfers that amount twice.

## Live testnet deployment

| Contract | Package hash | Contract hash |
|---|---|---|
| MockCsprUSD | `hash-03b78eb6e36799af9c9d5f892140e61dc6432b9fd165246b8cdca5f68fda2e1f` | [`hash-410af53a3a93196081eb3b8c7dafab120efeed826b30b23cbed3873203709668`](https://testnet.cspr.live/contract/410af53a3a93196081eb3b8c7dafab120efeed826b30b23cbed3873203709668) |
| BondVault | `hash-1fd15fc112007d0cd2a06ce571bdc9aa6fd0a1d61199294c4b8b8e3ae2183ca0` | [`hash-80e67ef6955e1a5734168c109e18def082c596cc58dba87f50ab523bfe042db6`](https://testnet.cspr.live/contract/80e67ef6955e1a5734168c109e18def082c596cc58dba87f50ab523bfe042db6) |
| BondsmanController | `hash-9bedae33a4f53adcaab4f6c74a2c214b051361e0fe85671be3f82f0ca4c24722` | [`hash-6f1e1b47040f8b90f73b4bb7b8cc6303a18ae09b628fc4870c14eb6250303a2b`](https://testnet.cspr.live/contract/6f1e1b47040f8b90f73b4bb7b8cc6303a18ae09b628fc4870c14eb6250303a2b) |
| InvoicePool | `hash-bb2077d5cc0d2d8340cfe8a3d6e4f7cecbeeb5b18888730d0e0e703c46bdec3d` | [`hash-ada888facd119474d3fb5271f23e403aa7bc033b87def9945e1aa6b2906a0b0a`](https://testnet.cspr.live/contract/ada888facd119474d3fb5271f23e403aa7bc033b87def9945e1aa6b2906a0b0a) |

The machine-readable addresses and public account identifiers live in [`deployments/testnet.json`](deployments/testnet.json).

## Toolchain and pinned packages

- Rust nightly `2026-01-01`
- Odra `2.8.2`
- casper-client `5.0.0`
- Node `24.14.0`
- casper-js-sdk `5.0.12`
- `@anthropic-ai/sdk` `0.106.0`
- npm with the committed lockfiles

The first successful Rust and npm dependency sets are locked and should not be upgraded during this deployment.

## Configuration

Copy `.env.example` to `.env` and fill local secrets:

```dotenv
DEPLOYER_SECRET_KEY_PATH=/absolute/path/to/secret_key.pem
CHAIN_NAME=casper-test
CSPR_CLOUD_API_KEY=
ANTHROPIC_API_KEY=
AGENT_LLM_MODEL=claude-haiku-4-5-20251001
PORT=3001
```

`CSPR_CLOUD_API_KEY` is optional. Without it, all reads and deploys use `https://node.testnet.casper.network/rpc`; event streaming may be slower. Secret PEM files, `.env`, `.keys/`, and `.data/` are ignored by Git. Key material and API keys are never logged.

The deployer account was created in Casper Wallet, funded from the Casper testnet faucet, and exported as a secret PEM before running this repository. No further faucet action is required: deployment creates agent and challenger keys and funds each to an idempotent 400 CSPR operating target.

## Install and run

```bash
npm install
npm run build:contracts
npm test
npm run typecheck
npm run deploy
npm run redeploy
npm run seed
npm run agent
npm run listener
npm run api
npm run demo
```

`npm run demo` is testnet-only. It resolves the contract-proven duplicate slash and executes a clean action, waits for the thirty-minute on-chain deadline, then resolves its refund. It prints confirmed transaction hashes and verifies both terminal states.

## Seed data

- Invoice `2045`: debtor `Globex Manufacturing`, invoice number `GBX-8871`, amount 50,000 csprUSD
- Invoice `2046`: the same debtor and invoice number, therefore the same Blake2b-256 claim digest and amount
- Invoice `2047`: invoice number `GBX-8872`, therefore a clean 50,000 csprUSD claim

The claim digest input is length-delimited debtor plus invoice number and is computed by the runner. Seed pays `2045` first, executes `2046`, and pre-challenges that second action as the deterministic fallback. A fresh demo agent starts at zero reputation, placing the first two actions in the 5% tier with 2,500 csprUSD bonds. Haiku evaluates all three invoices independently without paid-claim context, and its genuine reasoning sentences are persisted with their on-chain digests.

## REST API

Start with `npm run api`. The default origin is `http://127.0.0.1:3001`.

### `GET /api/invoices`

Returns seeded pending and paid invoices.

```json
[
  {
    "id": 2045,
    "invoiceNumber": "GBX-8871",
    "amount": "50000000000000",
    "paid": true
  }
]
```

### `GET /api/actions`

Returns every projected action with status, bond, deadline, reasoning, and transaction hashes.

```json
[
  {
    "actionId": 1,
    "invoiceId": 2046,
    "bondRequired": "2500000000000",
    "bondPosted": "2500000000000",
    "status": "Challenged"
  }
]
```

### `GET /api/actions/:id`

Returns one full lifecycle, reasoning text and digest, CES events, transaction hashes, and testnet explorer links.

```json
{
  "actionId": 3,
  "status": "Executed",
  "reasoningHash": "a8ad930f7e120b2ad0f707846c48a2dca7bd99a14bb30e0d760f2f21279fdaab",
  "events": [],
  "explorerLinks": {
    "execute": "https://testnet.cspr.live/transaction/fe43e8756cabf5de31bf54020763919b7d9cca0fc70d685a78a72355c597de96"
  }
}
```

### `GET /api/agents/:address`

Returns clean and slashed counts, score, and action history.

```json
{
  "agent": "account-hash-ea2a1d98965a16b0e1234a3c3d251732cfb831bcf21ee060ecbae471bdf42fdf",
  "clean": 0,
  "slashed": 0,
  "score": 0,
  "actions": []
}
```

### `GET /api/reserve`

Returns InvoicePool reserve accounting and the slash events that funded it.

```json
{
  "balance": "0",
  "slashes": []
}
```

### `POST /api/demo/arm`

Creates a unique invoice with the seeded duplicate claim digest, then uses the existing agent account to initiate, approve, post its bond, and execute the payout. Calls are serialized, and transport failures are resumed only after authoritative state reads. Each successful call returns the same shape as `GET /api/actions/:id`.

```json
{
  "actionId": 3,
  "invoiceId": 1782790776435,
  "status": "Executed",
  "bondRequired": "2500000000000",
  "windowEnd": 1782793103205,
  "transactions": {
    "approve": "d6b55731b01c41131e918c192b9de0a4c0c5a0e4a02dccdbb4cfde9829fe6651",
    "postBond": "e392bfd050f289187c0dcffaa678f0d04a8f042e82ed5519d9d85dba08a47aca",
    "execute": "fe43e8756cabf5de31bf54020763919b7d9cca0fc70d685a78a72355c597de96"
  },
  "events": [],
  "explorerLinks": {}
}
```

The deployed Controller sets `window_end` exactly `1,800,000` milliseconds after the execution block time, so an armed action has a thirty-minute challenge window.

### `POST /api/challenge`

The backend signs with the challenger account, submits `challenge_action`, waits for confirmation, then submits `resolve_action`.

```json
{ "actionId": 2 }
```

```json
{
  "challenge": "08a9a883c3a71464974074118e01280d911d12cfcaeaa0f3083a8dc60d85cfc5",
  "resolve": "d2d50828b22559eab1be58176212ead6b05eb5beea1f9745ff0d685056cb445e"
}
```

### `POST /api/resolve`

Manually triggers resolution for an already challenged action or an expired clean action.

```json
{ "actionId": 2 }
```

```json
{
  "resolve": "d2d50828b22559eab1be58176212ead6b05eb5beea1f9745ff0d685056cb445e"
}
```

### `GET /api/deployments`

Returns the exact contents of `deployments/testnet.json`.

## Engineering decisions

- Token values are `U256` atomic units with 9 decimals.
- `challenger_bps` uses `u32` because Casper CL types do not support an on-chain `u16`; the constructor enforces `0..=10000`.
- Odra constructors are protected install entrypoints. To break the circular vault/controller/pool address dependency, vault and controller install with deployer placeholders, then deployer-only one-time setters finalize the controller and pool addresses permanently.
- Initial agent and pool mints are 500,000 and 2,000,000 csprUSD. Seed idempotently mints a 100,000 csprUSD operating balance to the fresh demo agent.
- Install gas is capped at 350 CSPR per contract call and normal calls at 50 CSPR; Casper refunds unused payment.
- SQLite is a projection, never the source of contract truth. Reconciliation is idempotent and direct reads repair missed stream events.
- The controller has no owner slash function. A challenge succeeds only when InvoicePool proves that the action paid an already-recorded claim.

## Live arm evidence

- Action `2`: execute [`0ec9aae752aa2dc1d17a5f9d0ea3a617f2f4277ee0d349eda6e82e2be5aca9b2`](https://testnet.cspr.live/transaction/0ec9aae752aa2dc1d17a5f9d0ea3a617f2f4277ee0d349eda6e82e2be5aca9b2), `window_end - block_time = 1,800,000 ms`
- Action `3`: execute [`fe43e8756cabf5de31bf54020763919b7d9cca0fc70d685a78a72355c597de96`](https://testnet.cspr.live/transaction/fe43e8756cabf5de31bf54020763919b7d9cca0fc70d685a78a72355c597de96), `window_end - block_time = 1,800,000 ms`
- Both actions returned `is_action_duplicate = true`. Action `2` was subsequently challenged and slashed with [`08a9a883…`](https://testnet.cspr.live/transaction/08a9a883c3a71464974074118e01280d911d12cfcaeaa0f3083a8dc60d85cfc5) and [`d2d50828…`](https://testnet.cspr.live/transaction/d2d50828b22559eab1be58176212ead6b05eb5beea1f9745ff0d685056cb445e); action `3` remains `Executed` and challengeable.
