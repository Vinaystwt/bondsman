# Copy and Tone

The voice rules for every word Bondsman renders — UI labels, headings, empty
states, errors, receipts, docs. This document is binding in the same way
`PRINCIPLES.md` is: copy that violates a rule here does not ship, however good
it looks.

Bondsman is an operational instrument, not a marketing site (Part 1 §1). The
copy reports on a real settlement system; it never sells one. When in doubt,
write the sentence a settlement log would write.

---

## Voice

- **Direct and factual.** State what happened or what the user must do. No
  hype, no persuasion, no adjectives that only exist to impress.
- **Non-marketing.** The homepage is short and mechanical (Part 1 §1). Describe
  the mechanism; let the mechanism be the pitch.
- **Attributed, not vague.** Name the authority that owns an action (Principle
  6). Say "Policy priced the bond," never "the system priced the bond."
- **Precise about consequence.** Say plainly when money was lost. "Bond
  slashed. The action was wrong." (Part 1 §28). Do not soften it and do not
  dramatise it.
- **Quiet on good outcomes.** A refund is not a celebration. "Bond refunded. No
  valid challenge." No confetti language; the story is that consequences
  happen, not that they always happen (Part 1 §24).

---

## Mechanics

- **Sentence case.** Headings, buttons, labels — sentence case throughout. Not
  Title Case, not ALL CAPS in the copy itself. (Small-caps as a *typographic*
  rendering of a rule is a Task-6 styling choice, not a casing decision in the
  copy string.)
- **Active voice.** "The contract slashed the bond," not "the bond was slashed
  by the contract." Passive is allowed only where the actor is genuinely
  unknown or irrelevant.
- **Present tense for state, past tense for events.** State: "Bond in flight."
  Event log: "Watchdog submitted a challenge."
- **Numbers follow Principle 1.** Any hash, address, transaction id, bond
  amount, or basis-point figure is a machine-checkable value and renders in the
  monospace numeral face; the prose around it does not borrow that face. A
  human-readable gloss ("48 hours") is prose; the machine value it glosses
  ("172800 s") is monospace.
- **No exclamation marks** in product copy.
- **Spell out the mantra verbatim** wherever it applies (see below).

---

## Banned words

These never appear in Bondsman copy. Most are marketing filler; a few are
banned because they are *wrong* for this product, not merely tacky.

**Marketing filler — banned:**

- revolutionary
- seamless
- unlock
- empower
- leverage (as a buzzword — "leverage our platform"; the plain financial noun
  "leverage" is fine only if a real leverage concept is ever meant)
- game-changing
- cutting-edge
- next-gen / next-generation
- effortless
- magic / magical
- supercharge
- disrupt / disruptive
- world-class / best-in-class
- blazing-fast
- frictionless
- delight (as a verb — "delight your users")
- powerful, robust, simply, just — when used as empty intensifiers/minimisers
  ("simply connect", "just works", "powerful engine")

**Wrong for this product — banned:**

- **decides / decide / decision** to describe the AI model or a challenger.
  Part 1 §4 reserves no "decides" verb for anyone: the verifier *checks*, the
  contract *settles*. The AI's output is a "recommendation," never "the AI's
  decision." (Principle 6.)
- **trustless.** Bondsman's value is *verifiable* trust with named authorities,
  not the absence of trust. Say "independently verifiable," not "trustless."
- **guarantee / guaranteed** applied to correctness. Bondsman does not promise
  the AI is correct or that a challenger cannot be wrong (Part 1 §4).
- **secure / safe** as a bare reassurance with nothing behind it. State the
  specific mechanism instead (signature verified, anchored to a Casper tx).
- any **paraphrase of the mantra** (see below).

---

## Canonical vocabulary

One word per concept, reused everywhere. These are Part 1's exact terms — **do
not invent synonyms for any of them anywhere in the product.** If a layout
cannot fit the canonical term, the layout is wrong, not the term.

| Concept | Use exactly | Never say |
| --- | --- | --- |
| A bonded unit of agent activity | **action** (or "bonded action") | task, job, transaction (for the action itself), operation, request |
| The locked collateral | **bond** | deposit, stake, escrow, guarantee, security |
| The dispute period | **challenge window** | dispute period, contest window, grace period, timeout |
| Losing the bond on proven fault | **slash** | penalise, forfeit, burn, confiscate, dock |
| Returning the bond when unchallenged | **refund** | return, release, payback, reimburse |
| Where the slashed bond goes | **reserve** | treasury, pool, vault, fund |
| The portable signed outcome record | **receipt** | proof (as the object — "proof" is fine as the page name `/proof/27`), certificate, record (loosely), attestation |
| The independent disputer | **watchdog** / **challenger** | validator, auditor, monitor (as the actor), disputer |
| The party paid from a slash | **challenger reward** | bounty, payout, incentive |
| The on-chain fault check | **verifier** | oracle, arbiter, judge, checker |
| The deterministic pricing rule | **policy** | ruleset, engine, algorithm (as the name) |
| The x402-bound price | **paid quote** / **quote** | estimate, invoice, order |
| The party the quote binds | **payer** | buyer (payer ≠ buyer here), sender, funder (the *bond* funder is a distinct role) |

Where a distinction matters (payer vs bond funder; watchdog the role vs
challenger the actor in a specific case), keep both terms and keep them
distinct — do not collapse them for brevity.

---

## The mantra (verbatim, always)

Wherever two or more authority rows are adjacent (Principle 6, Part 1 §4), this
sentence appears **exactly**, word for word:

> AI explains. Policy prices. Verifier checks. Watchdog challenges. Contract
> settles.

- Never reworded ("AI thinks, policy prices, chain settles" — banned).
- Never shortened for space; if it does not fit, the layout is wrong.
- The verbs are reserved: only the **verifier** *checks* and only the
  **contract** *settles*. No component applies "decides," "approves," or
  "authorises" to the AI model.

---

## Worked examples

| Instead of | Write |
| --- | --- |
| "Unlock seamless, revolutionary agent accountability." | "Bondsman puts a bond in front of every consequential action." |
| "The AI decided the action was too risky." | "The AI's recommendation flagged the action as high risk. Policy priced the bond." |
| "Your deposit was returned." | "Bond refunded. No valid challenge." |
| "The transaction was penalised." | "The contract slashed the bond. The action was wrong." |
| "Trustless, secure settlement." | "Every outcome is a signed receipt, independently verifiable against Casper." |
| "The system settled the dispute." | "The contract settled: refund." |
