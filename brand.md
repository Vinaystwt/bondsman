# Brand — Bondsman

_Status: active_

Concept: a notary for money. Bondsman witnesses a financial promise, holds the
stake, and voids it when the promise breaks. The visual world is the bond
certificate, the ledger, and the seal. The seal is the one element people
remember; boldness is spent there.

## Palette (warm, document-grade). Saturated red appears only on the slash.

| Token   | Hex       | Use                                  |
| ------- | --------- | ------------------------------------ |
| ink     | `#0E0D0B` | base, ink on dark                    |
| surface | `#16140F` | panels and cards                     |
| bone    | `#ECE6D8` | primary text                         |
| muted   | `#8C8473` | secondary text                       |
| copper  | `#B7791F` | bonded / active, the sealed state    |
| sage    | `#5A7D6F` | clean / refund, quiet                 |
| void    | `#E0231C` | slash only, used nowhere else        |
| rule    | `#2A2620` | borders and the ledger grid          |

## Typography

- Display: **Fraunces** — engraved, high-contrast serif, reads like an embossed certificate.
- Body: **Hanken Grotesk** — humanist grotesque, warm and legible, deliberately not Inter or Geist.
- Figures, hashes, addresses: **IBM Plex Mono** — typewriter lineage; numbers are the hero of a financial instrument and read as stamped serial numbers.

Wired through `next/font` in `frontend/lib/fonts.ts`.

## Layout and texture

Faint ledger grid; serial-number styling for action ids (No. 0002); the bond
rendered as a certificate object; perforation and stamp edges only where they
carry meaning; restrained, consistent border radius.

## Voice

Precise, confident, plain, a notary's certainty. Active voice, sentence case,
no hype, no dashes. Name things by what the person controls. One vocabulary:
action, bond, challenge window, slash, refund, reserve, reputation.
