# Assurance Manifest

Assurance Studio accepts a bounded scenario and returns a `bondsman.assurance-manifest.v1` object. The manifest is design-only: it does not make an x402 payment, challenge an action, settle a quote, fund an account, or submit a Casper transaction.

The public endpoints are:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/assurance/templates` | list executable and blueprint templates |
| `GET /api/assurance/schema` | JSON schema for manifests |
| `POST /api/assurance/analyze` | return model-assisted or deterministic manifest |

The model path is used only when `ANTHROPIC_API_KEY` is present and `ASSURANCE_STUDIO_ENABLED` is not `false`. If the model times out, errors, or is not configured, the API returns a deterministic fallback with the same manifest schema and `source: "deterministic_fallback"`.

Required input fields are `templateId`, `description`, `amount`, `agentConfidence`, `counterpartyStatus`, `evidenceSource`, `maxLossBps`, and `urgency`. Unknown fields are rejected.

The schema lives at `spec/bondsman-assurance-manifest-v1.schema.json`.

Executable templates are `invoice_delivery` and `duplicate_invoice_test`; they expose deployed fault classes and verifiers and can describe the paid quote request shape. Blueprint templates are `treasury_payment`, `dex_execution`, and `x402_service_delivery`; they must return `implementationStatus: "blueprint"`, `executableNow: false`, `faultClass: null`, `verifier: null`, `quoteRequestShape: null`, and `submitRequirements: []`. Their future integration intent is carried only in `proposedFaultClass` and `proposedVerifier`.
