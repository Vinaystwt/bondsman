# Wallet-Signed Challenge Backend Design

## Scope

Add a parallel wallet-challenge finalization path without changing contracts or the existing backend-signed challenge endpoint. The backend never constructs, signs, or submits the user's challenge. It independently verifies the submitted transaction and only then resolves the already-challenged action.

## Trust Boundary

The backend queries Casper `info_get_transaction` by hash. A valid wallet challenge must:

- have successful execution information and no execution error;
- use chain `casper-test`;
- target the deployed controller package or exact controller contract;
- call `challenge_action`;
- contain one U64 `action_id` equal to the request;
- identify a signer whose derived account hash equals the challenger stored by the controller;
- use a challenger that is neither the configured backend challenger nor watchdog.

Missing execution information is pending, not success. Failed execution, malformed arguments, mismatched targets, and mismatched signers are terminal structured errors.

## Components

- `casper/transactions.ts`: raw JSON-RPC client, transaction finality parser, and challenge intent validation.
- `api/wallet-challenge.ts`: controller-state verification, backend-signed resolution, reconciliation, evidence persistence, and reward response construction.
- `GET /api/transactions/:hash`: frontend polling surface.
- `POST /api/challenge/wallet-resolve`: verified wallet resolution mutation.

The existing resolution signer remains acceptable because `resolve_action` does not replace the challenger stored on chain.

## Response and Evidence

The success response contains the external wallet account, total slashed bond, challenger and reserve shares read from reconciled slash events, both transaction hashes, finality flags, and exact testnet explorer links. Reconciliation classifies any challenger outside the configured backend and watchdog accounts as `external-wallet`.

## Testing

Unit tests cover pending, failed, wrong-chain, wrong-target, wrong-entrypoint, wrong-action, and valid transactions. API tests cover structured pending/error responses and a successful external-wallet result. Live verification uses an existing non-backend test key to challenge a freshly armed reserved action and confirms the wallet account and token split on chain.
