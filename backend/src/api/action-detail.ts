import type { Repository } from '../db/repositories.js';

function explorer(hash: string): string {
  return `https://testnet.cspr.live/transaction/${hash}`;
}

export function actionDetail(
  repository: Repository,
  actionId: number,
) {
  const action = repository.action(actionId);
  if (!action) return undefined;
  return {
    ...action,
    proof:
      Object.values(action.transactions).some((hash) => hash.length === 64)
        ? { available: true }
        : {
            available: false,
            message: 'proof unavailable for this contract version',
          },
    events: repository.eventsForAction(actionId).map((event) => ({
      ...event,
      explorerLink: event.transactionHash
        ? explorer(event.transactionHash)
        : null,
    })),
    explorerLinks: Object.fromEntries(
      Object.entries(action.transactions)
        .filter(([, hash]) => hash.length === 64)
        .map(([key, hash]) => [key, explorer(hash)]),
    ),
  };
}
