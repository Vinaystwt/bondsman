import { describe, expect, it } from 'vitest';
import {
  KeyAlgorithm,
  PrivateKey,
} from '../../src/casper/sdk.js';
import { buildTransferDeploy } from '../../src/casper/transfers.js';

describe('buildTransferDeploy', () => {
  it('builds a signed Casper testnet transfer', () => {
    const sender = PrivateKey.generate(KeyAlgorithm.ED25519);
    const recipient = PrivateKey.generate(KeyAlgorithm.ED25519);

    const deploy = buildTransferDeploy(
      sender,
      recipient.publicKey,
      '250000000000',
    );

    expect(deploy.header.chainName).toBe('casper-test');
    expect(deploy.approvals).toHaveLength(1);
    expect(
      deploy.session.transfer?.args
        .getByName('amount')
        ?.ui512?.toString(),
    ).toBe('250000000000');
  });
});
