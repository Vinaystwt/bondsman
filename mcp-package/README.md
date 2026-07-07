# @vinaystwt/bondsman-mcp

An MCP server that exposes the Bondsman protocol to any Model Context Protocol client.

Bondsman is a notary for money on Casper. An autonomous agent must stake real capital before it can move money and loses it when it is wrong. This MCP server gives an external agent a stdio interface to check reputation, quote a bond, submit a challenge, and settle on chain.

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

Six tools are registered:

| Tool | Purpose |
| ---- | ------- |
| `list_actions` | List every bonded action from the live projection. |
| `get_action` | Full detail for one action, including reasoning, events, transactions, explorer links. |
| `get_reputation` | On-chain reputation for an agent address: clean, slashed, score, action history. |
| `get_deployments` | Network, chain, contract package hashes, and account roles. |
| `get_bond_requirement` | Documented as a controller call; the HTTP API does not expose it. |
| `challenge_action` | Submit a challenge against an action. Returns the challenge and resolve transaction hashes. |

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

See `examples/watchdog.ts` for a minimal external agent that lists actions, looks for duplicates, and submits a challenge.

## About Bondsman

- Testnet frontend and demo: https://github.com/vinaystwt/bondsman
- Casper testnet contracts: deployed
- Approver is model-driven. Watchdog is deterministic. x402 is a sandbox on testnet.

## License

MIT
