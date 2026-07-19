import { generateKeyPairSync } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { blake2b256 } from '../../src/agent/hashing.js';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import type { Deployment } from '../../src/shared/deployment.js';
import {
  canonicalProof,
  featuredProofs,
  proofFor,
} from '../../src/proofs/service.js';
import {
  issueReceipt,
  verifyReceipt,
  type PortableReceipt,
} from '../../src/receipts/service.js';

const contractHash = `hash-${'1'.repeat(64)}`;
const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  current: 'v2',
  contracts: {
    mockCsprUsd: { packageHash: contractHash, contractHash },
    bondVault: { packageHash: contractHash, contractHash },
    controller: { packageHash: contractHash, contractHash },
    invoicePool: { packageHash: contractHash, contractHash },
  },
  accounts: {
    deployer: { publicKey: `01${'1'.repeat(64)}`, accountHash: '1'.repeat(64) },
    agent: { publicKey: `01${'2'.repeat(64)}`, accountHash: '2'.repeat(64) },
    challenger: { publicKey: `01${'3'.repeat(64)}`, accountHash: '3'.repeat(64) },
    watchdog: { publicKey: `01${'4'.repeat(64)}`, accountHash: '4'.repeat(64) },
  },
} as Deployment;

function seedCanonical(repository: Repository, actionId = 27, reasoningHash?: string) {
  const reasoning = 'Release was contradicted by signed buyer non-delivery evidence.';
  repository.upsertAction({
    actionId,
    invoiceId: 4027,
    agent: `account-hash-${deployment.accounts.agent.accountHash}`,
    amount: '50000000000000',
    claimHash: 'delivery-claim',
    reasoning,
    reasoningHash: reasoningHash ?? blake2b256(reasoning).toString('hex'),
    bondRequired: '2800000000000',
    bondPosted: '2800000000000',
    windowEnd: Date.now() - 60_000,
    status: 'ResolvedSlash',
    challenger: `account-hash-${deployment.accounts.watchdog.accountHash}`,
    challengerType: 'watchdog',
    challengeSigning: 'watchdog-key',
    controllerHash: deployment.contracts.controller.contractHash,
    duplicateProven: false,
    faultClass: 'delivery_contradiction',
    evidenceRoot: `0x${'a'.repeat(64)}`,
    reservedForManual: false,
    transactions: {
      execute: '7'.repeat(64),
      challenge: '8'.repeat(64),
      resolve: '9'.repeat(64),
    },
  });
  repository.upsertEvent({
    contract: 'BondsmanControllerV2',
    eventIndex: actionId,
    eventType: 'ResolvedSlashV2',
    actionId,
    data: JSON.stringify({
      challenger_amount: '1400000000000',
      reserve_amount: '1400000000000',
    }),
    transactionHash: '9'.repeat(64),
  });
  repository.upsertPaidQuote({
    quoteHash: `0x${String(actionId).padStart(2, '0')}${'b'.repeat(62)}`,
    actionType: 'invoice_payout',
    faultClass: 'delivery_contradiction',
    verifier: 'delivery-contradiction-v2',
    amount: '50000000000000',
    requiredBond: '2800000000000',
    challengeWindow: 1800,
    quoteExpiry: new Date(Date.now() + 60_000).toISOString(),
    payer: `00${'5'.repeat(64)}`,
    settlementTx: '6'.repeat(64),
    paymentAmount: '100000000',
    facilitator: 'x402-facilitator.cspr.cloud',
    status: 'consumed',
    submitPayloadHash: `0x${'c'.repeat(64)}`,
    consumedActionId: actionId,
    createdAt: Date.now() - 120_000,
    consumedAt: Date.now() - 60_000,
  });
  repository.upsertDeliveryAttestation({
    evidenceRoot: `0x${'a'.repeat(64)}`,
    invoiceId: 4027,
    actionId,
    eventType: 'goods_not_received',
    occurredAt: Date.now() - 180_000,
    buyerPublicKey: Buffer.alloc(32, 7).toString('base64'),
    signature: Buffer.alloc(64, 8).toString('base64'),
    payload: { invoiceId: 4027, actionId, eventType: 'goods_not_received' },
    receivedAt: Date.now() - 120_000,
    usedActionId: actionId,
  });
  repository.setReserve('1400000000000');
  repository.setReputation(
    `account-hash-${deployment.accounts.agent.accountHash}`,
    -50,
    0,
    0,
  );
}

describe('canonical proof evidence', () => {
  it('invalidates stale proof cache and prioritizes the paid watchdog delivery slash', () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    seedCanonical(repository);
    repository.upsertAction({
      ...repository.action(27)!,
      actionId: 26,
      invoiceId: 4026,
      claimHash: 'duplicate-claim',
      faultClass: 'duplicate_claim',
      challengerType: 'manual',
      transactions: { resolve: '5'.repeat(64) },
    });
    repository.cacheProof(
      deployment.contracts.controller.contractHash,
      27,
      { proofSchemaVersion: 2, stale: true },
    );

    const proof = proofFor(
      repository,
      27,
      deployment.contracts.controller.contractHash,
      deployment,
    )!;
    expect(proof).toMatchObject({
      proofSchemaVersion: 3,
      actionId: '27',
      faultClass: 'delivery_contradiction',
      payment: {
        protocol: 'x402',
        asset: 'WCSPR',
        settlementTransaction: '6'.repeat(64),
        settled: true,
      },
      paidQuote: {
        consumedActionId: 27,
        status: 'consumed',
      },
      deliveryAttestation: {
        eventType: 'goods_not_received',
        signatureVerified: true,
        usedActionId: 27,
      },
      modelReasoning: {
        verifiedMatches: true,
      },
      economicImpact: {
        challengerReward: '1400000000000',
        challengerRewardSource: 'chain_event',
        reserveCredit: '1400000000000',
        reserveCreditSource: 'chain_event',
      },
    });
    expect((featuredProofs(
      repository,
      deployment.contracts.controller.contractHash,
      deployment,
    )[0] as Record<string, unknown>).actionId).toBe('27');
    expect(canonicalProof(
      repository,
      deployment.contracts.controller.contractHash,
      deployment,
    )?.actionId).toBe('27');
    database.close();
  });

  it('reports a recomputed reasoning hash mismatch for tampered reasoning', () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    seedCanonical(repository, 28, '0'.repeat(64));

    const proof = proofFor(
      repository,
      28,
      deployment.contracts.controller.contractHash,
      deployment,
    )!;
    expect(proof.modelReasoning).toMatchObject({
      commitHash: '0'.repeat(64),
      verifiedMatches: false,
    });
    expect(
      (proof.modelReasoning as Record<string, unknown>).recomputedHash,
    ).toMatch(/^[0-9a-f]{64}$/);
    database.close();
  });

  it('signs receipt v2 golden-path evidence and rejects field tampering', async () => {
    const repositoryPath = join(
      tmpdir(),
      `bondsman-receipt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    await mkdir(join(repositoryPath, '.keys'), { recursive: true });
    const { privateKey } = generateKeyPairSync('ed25519');
    await writeFile(
      join(repositoryPath, '.keys/receipt-signer.pem'),
      privateKey.export({ format: 'pem', type: 'pkcs8' }),
      'utf8',
    );
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    seedCanonical(repository);
    repository.cacheReceipt(
      deployment.contracts.controller.contractHash,
      27,
      { protocol: 'bondsman', version: '1', stale: true },
    );

    const receipt = await issueReceipt({
      repositoryPath,
      repository,
      actionId: 27,
      controllerHash: deployment.contracts.controller.contractHash,
      deployment,
    });
    expect(receipt).toMatchObject({
      protocol: 'bondsman',
      version: '2',
      schemaId: 'bondsman.portable-receipt.golden-path.v2',
      actionId: '27',
      challengerType: 'watchdog',
      watchdogChallengeTransaction: '8'.repeat(64),
      payment: {
        protocol: 'x402',
        settlementTransaction: '6'.repeat(64),
      },
      paidQuote: {
        consumedActionId: 27,
      },
      deliveryEvidence: {
        evidenceRoot: `0x${'a'.repeat(64)}`,
      },
    });
    expect(verifyReceipt(receipt!)).toEqual({ valid: true });

    const tamperedSettlement = structuredClone(receipt!) as PortableReceipt;
    tamperedSettlement.payment!.settlementTransaction = '0'.repeat(64);
    expect(verifyReceipt(tamperedSettlement).valid).toBe(false);

    const tamperedQuote = structuredClone(receipt!) as PortableReceipt;
    tamperedQuote.paidQuote!.quoteHash = `0x${'0'.repeat(64)}`;
    expect(verifyReceipt(tamperedQuote).valid).toBe(false);

    const tamperedAction = structuredClone(receipt!) as PortableReceipt;
    tamperedAction.actionId = '28';
    expect(verifyReceipt(tamperedAction).valid).toBe(false);

    const tamperedOutcome = structuredClone(receipt!) as PortableReceipt;
    tamperedOutcome.outcome = 'REFUNDED';
    expect(verifyReceipt(tamperedOutcome).valid).toBe(false);

    const tamperedBond = structuredClone(receipt!) as PortableReceipt;
    tamperedBond.bond = '1';
    expect(verifyReceipt(tamperedBond).valid).toBe(false);

    const tamperedEvidence = structuredClone(receipt!) as PortableReceipt;
    tamperedEvidence.deliveryEvidence!.evidenceRoot = `0x${'f'.repeat(64)}`;
    expect(verifyReceipt(tamperedEvidence).valid).toBe(false);

    const malformedSignature = structuredClone(receipt!) as PortableReceipt;
    malformedSignature.signature = 'not-base64';
    expect(verifyReceipt(malformedSignature).valid).toBe(false);

    database.close();
    await rm(repositoryPath, { recursive: true, force: true });
  });
});
