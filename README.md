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
| BondVault | `hash-c186fafb66c07d16185d845098ce44022f5e41ec658b44632047f242be58fe9e` | [`hash-256d38d33de00d86915c163c7458a9d0ce9ce2a087b31a457984cfe2ca423e42`](https://testnet.cspr.live/contract/256d38d33de00d86915c163c7458a9d0ce9ce2a087b31a457984cfe2ca423e42) |
| BondsmanController | `hash-2ed52e6c3a8709e7322f64011d563669483d96f5ac1816f395794dcaacc8f599` | [`hash-d5bac55b8ce24a69ba78a11a95c13c708f28adaac1982bf7041af8784607ca44`](https://testnet.cspr.live/contract/d5bac55b8ce24a69ba78a11a95c13c708f28adaac1982bf7041af8784607ca44) |
| InvoicePool | `hash-a9320ae95af3e12c8d43c8d7d810bf81144d7b76c9102030bb3c55577caed77c` | [`hash-f3d6302f339b2de20ee1fbf92a5041cef10dc78df4ae20e38d33886573fc3297`](https://testnet.cspr.live/contract/f3d6302f339b2de20ee1fbf92a5041cef10dc78df4ae20e38d33886573fc3297) |

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

The deployer account was created in Casper Wallet, funded from the Casper testnet faucet, and exported as a secret PEM before running this repository. No further faucet action is required: deployment creates agent and challenger keys and funds each to an idempotent 750 CSPR operating target.

## Install and run

```bash
npm install
npm run build:contracts
npm test
npm run typecheck
npm run deploy
npm run seed
npm run agent
npm run listener
npm run api
npm run demo
```

`npm run demo` is testnet-only. It resolves the contract-proven duplicate slash and executes a clean action, waits for the five-minute on-chain deadline, then resolves its refund. It prints confirmed transaction hashes and verifies both terminal states.

## Seed data

- Invoice `1045`: debtor `Globex Manufacturing`, invoice number `GBX-7781`
- Invoice `1046`: the same debtor and invoice number, therefore the same Blake2b-256 claim digest
- Invoice `1047`: invoice number `GBX-7782`, therefore a clean claim

The claim digest input is length-delimited debtor plus invoice number and is computed by the runner. Seed pays `1045` first, executes `1046`, and pre-challenges that second action as the deterministic fallback.

## REST API

Start with `npm run api`. The default origin is `http://127.0.0.1:3001`.

### `GET /api/invoices`

Returns seeded pending and paid invoices.

```json
[
  {
    "id": 1045,
    "invoiceNumber": "GBX-7781",
    "amount": "1000000000000",
    "paid": true
  }
]
```

### `GET /api/actions`

Returns every projected action with status, bond, deadline, reasoning, and transaction hashes.

```json
[
  {
    "actionId": 2,
    "invoiceId": 1046,
    "bondRequired": "20000000000",
    "bondPosted": "20000000000",
    "status": "ResolvedSlash"
  }
]
```

### `GET /api/actions/:id`

Returns one full lifecycle, reasoning text and digest, CES events, transaction hashes, and testnet explorer links.

```json
{
  "actionId": 3,
  "status": "ResolvedRefund",
  "reasoningHash": "b311a7b6b68e7e11f7776b37b4a5207540abfe04439a71a979f39fd221d7fadd",
  "events": [],
  "explorerLinks": {
    "execute": "https://testnet.cspr.live/transaction/7aaacbf79351637b4e72e37866e7f1f329da8d96d3574888ae90d2c76bdaf04a"
  }
}
```

### `GET /api/agents/:address`

Returns clean and slashed counts, score, and action history.

```json
{
  "agent": "account-hash-ea2a1d98965a16b0e1234a3c3d251732cfb831bcf21ee060ecbae471bdf42fdf",
  "clean": 3,
  "slashed": 1,
  "score": -20,
  "actions": []
}
```

### `GET /api/reserve`

Returns InvoicePool reserve accounting and the slash events that funded it.

```json
{
  "balance": "10000000000",
  "slashes": []
}
```

### `POST /api/challenge`

The backend signs with the challenger account, submits `challenge_action`, waits for confirmation, then submits `resolve_action`.

```json
{ "actionId": 2 }
```

```json
{
  "challenge": "9fcd2f838faa72c27566d1a6b3f2fb7d5d6cb70528ec722d837d8ba134ec3727",
  "resolve": "362cc7d7d41e373590ec0fe25135edb466d51e07032e1843c3c5a9ef3ed39622"
}
```

### `POST /api/resolve`

Manually triggers resolution for an already challenged action or an expired clean action.

```json
{ "actionId": 3 }
```

```json
{
  "resolve": "44b34116d9d22b9fcae2925eadf11011fb7190ec6065169674de547508ea0c3a"
}
```

### `GET /api/deployments`

Returns the exact contents of `deployments/testnet.json`.

## Engineering decisions

- Token values are `U256` atomic units with 9 decimals.
- `challenger_bps` uses `u32` because Casper CL types do not support an on-chain `u16`; the constructor enforces `0..=10000`.
- Odra constructors are protected install entrypoints. To break the circular vault/controller/pool address dependency, vault and controller install with deployer placeholders, then deployer-only one-time setters finalize the controller and pool addresses permanently.
- Agent and pool mints are 500,000 and 2,000,000 csprUSD.
- Install gas is capped at 500 CSPR per contract call and normal calls at 50 CSPR; Casper refunds unused payment.
- SQLite is a projection, never the source of contract truth. Reconciliation is idempotent and direct reads repair missed stream events.
- The controller has no owner slash function. A challenge succeeds only when InvoicePool proves that the action paid an already-recorded claim.

## Live demo evidence

Duplicate path:

- Action: `2`
- Challenge: [`9fcd2f838faa72c27566d1a6b3f2fb7d5d6cb70528ec722d837d8ba134ec3727`](https://testnet.cspr.live/transaction/9fcd2f838faa72c27566d1a6b3f2fb7d5d6cb70528ec722d837d8ba134ec3727)
- Slash resolution: [`362cc7d7d41e373590ec0fe25135edb466d51e07032e1843c3c5a9ef3ed39622`](https://testnet.cspr.live/transaction/362cc7d7d41e373590ec0fe25135edb466d51e07032e1843c3c5a9ef3ed39622)
- Terminal state: `ResolvedSlash`

Clean path:

- Action: `3`
- Execute: [`7aaacbf79351637b4e72e37866e7f1f329da8d96d3574888ae90d2c76bdaf04a`](https://testnet.cspr.live/transaction/7aaacbf79351637b4e72e37866e7f1f329da8d96d3574888ae90d2c76bdaf04a)
- Refund resolution: [`44b34116d9d22b9fcae2925eadf11011fb7190ec6065169674de547508ea0c3a`](https://testnet.cspr.live/transaction/44b34116d9d22b9fcae2925eadf11011fb7190ec6065169674de547508ea0c3a)
- Terminal state: `ResolvedRefund`
