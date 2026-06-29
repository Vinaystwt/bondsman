import type { CesEvent, EventType } from './types';
import { formatMoney, parseEventData } from './format';

// Plain-language headline and detail for each CES event. The data blobs carry
// atomic-unit amounts and Key::Account wrappers; we surface only what reads well.

function amount(data: Record<string, unknown>, key: string): string | null {
  const v = data[key];
  if (typeof v === 'string' && /^\d+$/.test(v)) return formatMoney(v);
  return null;
}

const TONE: Record<EventType, 'copper' | 'sage' | 'void' | 'muted'> = {
  ActionInitiated: 'muted',
  BondLocked: 'copper',
  BondPosted: 'copper',
  PayoutApproved: 'copper',
  ActionExecuted: 'copper',
  DuplicateDetected: 'void',
  BondSlashed: 'void',
  ResolvedSlash: 'void',
  BondReleased: 'sage',
  ResolvedRefund: 'sage',
};

export interface EventView {
  headline: string;
  detail: string | null;
  tone: 'copper' | 'sage' | 'void' | 'muted';
}

export function describeEvent(event: CesEvent): EventView {
  const data = parseEventData(event.data);
  const tone = TONE[event.eventType] ?? 'muted';

  switch (event.eventType) {
    case 'ActionInitiated':
      return {
        headline: 'Action initiated',
        detail: `Invoice ${String(data.invoice_id ?? '')}, ${
          amount(data, 'amount') ?? 'amount on file'
        }. The reasoning hash was committed on-chain.`,
        tone,
      };
    case 'BondLocked':
      return {
        headline: 'Bond locked',
        detail: amount(data, 'amount')
          ? `${amount(data, 'amount')} held in the vault.`
          : 'Stake held in the vault.',
        tone,
      };
    case 'BondPosted':
      return {
        headline: 'Bond posted',
        detail: amount(data, 'amount'),
        tone,
      };
    case 'PayoutApproved':
      return {
        headline: 'Payout approved',
        detail: amount(data, 'amount')
          ? `${amount(data, 'amount')} cleared to the vendor.`
          : 'Cleared to the vendor.',
        tone,
      };
    case 'ActionExecuted':
      return { headline: 'Action executed', detail: 'The payout went out.', tone };
    case 'DuplicateDetected':
      return {
        headline: 'Duplicate claim detected',
        detail: `This claim matches action ${String(
          data.first_action_id ?? '',
        )}. The same invoice was already paid.`,
        tone,
      };
    case 'BondSlashed':
      return {
        headline: 'Bond slashed',
        detail: `${amount(data, 'challenger_amount') ?? '?'} to the challenger, ${
          amount(data, 'pool_amount') ?? amount(data, 'reserve_amount') ?? '?'
        } to the reserve.`,
        tone,
      };
    case 'ResolvedSlash':
      return {
        headline: 'Resolved: bond slashed',
        detail: 'The contract found the duplicate. The bond is gone.',
        tone,
      };
    case 'BondReleased':
      return {
        headline: 'Bond released',
        detail: 'Returned to the agent in full.',
        tone,
      };
    case 'ResolvedRefund':
      return {
        headline: 'Resolved: bond refunded',
        detail: 'The action held up. The bond returns in full.',
        tone,
      };
    default:
      return { headline: event.eventType, detail: null, tone };
  }
}
