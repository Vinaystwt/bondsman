import type { ActionRecord } from '../db/repositories.js';

export async function watchdogReasoning(
  action: ActionRecord,
): Promise<string> {
  return `Action ${action.actionId} repeats a claim fingerprint that an earlier executed payout already used.`;
}
