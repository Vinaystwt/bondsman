import type { Deploy as DeployType } from 'casper-js-sdk';
import {
  makeCsprTransferDeploy,
  type PrivateKeyInstance,
  type PublicKeyInstance,
} from './sdk.js';

const TRANSFER_PAYMENT_MOTES = '100000000';

export function buildTransferDeploy(
  sender: PrivateKeyInstance,
  recipient: PublicKeyInstance,
  amountMotes: string,
): DeployType {
  const deploy = makeCsprTransferDeploy({
    senderPublicKeyHex: sender.publicKey.toHex(),
    recipientPublicKeyHex: recipient.toHex(),
    transferAmount: amountMotes,
    paymentAmount: TRANSFER_PAYMENT_MOTES,
    chainName: 'casper-test',
  });
  deploy.sign(sender);
  return deploy;
}
