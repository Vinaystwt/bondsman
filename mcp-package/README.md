# @vinaystwt/bondsman-mcp

An MCP server that exposes the Bondsman protocol to any Model Context Protocol client.

Bondsman is a notary for money on Casper. An autonomous agent must stake real capital before it can move money and loses it when it is wrong. This MCP server gives an external agent a stdio interface to inspect actions, design assurance manifests, replay the canonical proof, probe x402 quote requirements, check reputation, read verifiers, and verify receipts.

## Install

```bash
npm install -g @vinaystwt/bondsman-mcp
```

Or run without installing:

```bash
npx @vinaystwt/bondsman-mcp
```

## Configuration

The server talks to a running Bondsman backend over HTTP. Set the base URL with an environment variable:

```bash
export BONDSMAN_API_BASE=http://127.0.0.1:3001
```

Defaults to `http://127.0.0.1:3001`. The Bondsman backend is open source in the main repository.

## Tools

Twelve tools are registered:

| Tool | Purpose |
| ---- | ------- |
| `list_actions` | Read-only live projection of bonded actions. |
| `get_action` | Read-only detail for one action, including reasoning, events, transactions, explorer links. |
| `get_reputation` | Read-only on-chain reputation projection for an agent address. |
| `get_deployments` | Read-only network, chain, contract package hashes, and account roles. |
| `get_verifiers` | Read-only fault classes and verifier status from the backend registry. |
| `verify_receipt` | Read-only signed receipt verification for a completed action. |
| `get_assurance_templates` | Design-only Assurance Studio templates and implementation status. |
| `design_assurance_policy` | Design-only manifest generation. It does not pay, challenge, settle, or submit Casper transactions. |
| `quote_bonded_action` | Paid HTTP quote surface. Without payment it returns x402 402 requirements and does not mutate protocol state. |
| `submit_bonded_action` | Paid HTTP execution after settled quote plus payer submit authorization. Not a sponsored public mutation. |
| `replay_canonical_proof` | Read-only canonical Action 27 replay with proof, receipt, and checks. |
| `check_canonical_quote` | Read-only check that canonical Action 27 quote is consumed and not replayable. |

## Use with Claude Code

Add to `~/.mcp/config.json`:

```json
{
  "mcpServers": {
    "bondsman": {
      "command": "npx",
      "args": ["-y", "@vinaystwt/bondsman-mcp"],
      "env": {
        "BONDSMAN_API_BASE": "http://127.0.0.1:3001"
      }
    }
  }
}
```

## Example

See `examples/watchdog.ts` for a legacy local-only example. Production public challenge submission is no longer exposed through MCP; use the read-only and design-only tools above unless you have a paid quote and payer authorization for `submit_bonded_action`.

## About Bondsman

- Testnet frontend and demo: https://github.com/vinaystwt/bondsman
- Casper testnet contracts: deployed
- Assurance design is public and non-mutating. Paid quote submission uses real Casper x402 settlement when callers provide valid payment. Backend-sponsored public challenge and demo mutation routes are operator-only.

## License

MIT
