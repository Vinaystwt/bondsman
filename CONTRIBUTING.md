# Contributing

Thanks for helping harden Bondsman.

## Local setup

```bash
npm install
npm run typecheck
npm test
```

Contract tests live under `contracts/` and can be run with Cargo from that directory.

## Pull requests

- Keep changes small and focused.
- Do not commit secrets, PEM files, `.env` files, `.data`, logs, recordings, or local evidence artifacts.
- Preserve honest labeling around testnet assets, backend-signed demo flows, wallet-signed experiments, and x402 settlement status.
- Include tests for contract accounting, API consistency, and safety controls when changing those areas.
- Update docs when deployment hashes, API behavior, or operational runbooks change.

## Coding notes

- Backend code is TypeScript.
- Contracts are Rust using Odra.
- The source of truth for live testnet hashes is `deployments/testnet.json`.
- The public product must continue to work on Casper Testnet.
