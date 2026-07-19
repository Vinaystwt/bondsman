# Casper Agent Assurance Example

This example shows the public Bondsman transition path for an external Casper agent:

- list Assurance Studio templates;
- generate a design-only assurance manifest;
- probe `/v1/actions/quote` without payment and receive x402 `402`;
- replay canonical Action 27 evidence;
- verify the signed receipt;
- prove receipt tampering is rejected.

It does not submit a Casper transaction, provide a payment signature, challenge an action, fund an account, or call any operator endpoint.

```bash
npm run example:casper-agent
```

Set `BONDSMAN_API_BASE` to target a local or staging backend. By default the example uses production.
