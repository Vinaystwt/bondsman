# Security policy

## Supported scope

Bondsman is a Casper Testnet prototype. Security reports are welcome for:

- Rust contracts under `contracts/`
- TypeScript backend services under `backend/`
- Frontend routes under `frontend/`
- MCP package code under `mcp-package/`
- Deployment metadata under `deployments/`

Do not submit reports for fake value loss on testnet fixtures unless they demonstrate a bug that would carry over to a production deployment.

## Reporting

Please report vulnerabilities privately by email to `vinay11123sharma@gmail.com`.

Include:

- affected component and commit hash
- reproduction steps
- expected impact
- suggested fix, if known

Please do not open public issues for exploitable vulnerabilities until a fix is available.

## Secrets

Never include private keys, `.env` files, PEM files, local SQLite databases, or local logs in a report or pull request. Redact any transaction signing material before sharing screenshots.
