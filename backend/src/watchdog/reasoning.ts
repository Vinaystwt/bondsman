import type { ActionRecord } from '../db/repositories.js';

export async function watchdogReasoning(
  action: ActionRecord,
): Promise<string> {
  if (action.faultClass === 'delivery_contradiction') {
    return `Action ${action.actionId} has a signed delivery contradiction bound to the executed invoice.`;
  }
  return `Action ${action.actionId} repeats a claim fingerprint that an earlier executed payout already used.`;
}
