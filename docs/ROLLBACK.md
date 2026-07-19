# Runtime rollback

Bondsman keeps both deployed controller suites in `deployments/testnet.json`. The active suite can be selected at process start without editing deployment hashes.

## Lever

Set:

```bash
ACTIVE_CONTROLLER_VERSION=v1
```

or:

```bash
ACTIVE_CONTROLLER_VERSION=v2
```

The API, listener, watchdog, agent runner, integrator runner, and MCP server all apply the same override during startup. If the variable is absent, the `current` field in `deployments/testnet.json` is used.

## Safe rollback flow

1. Set `ACTIVE_CONTROLLER_VERSION=v1` in the backend runtime environment.
2. Restart the API, listener, watchdog, and any worker processes.
3. Check `/api/health`; `activeControllerVersion` and `controller` must point to the V1 controller hash.
4. If healthy, keep serving from the V1 projection database. The database filename is keyed by controller hash, so V1 and V2 projections do not collide.
5. To restore the newer suite, set `ACTIVE_CONTROLLER_VERSION=v2` and restart the same processes.

## Limits

This is a runtime traffic lever. It does not redeploy contracts, mutate on-chain state, change keys, or rewrite `deployments/testnet.json`.

