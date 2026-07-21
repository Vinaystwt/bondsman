import type { CanonicalProof, CanonicalReplay, ReceiptVerification } from './types';

const CONTROLLER =
  'hash-859c4d7c4ca016fa02ffd0f45c2ddc30705225de173369bbab25e5b21167ce16';
const APPROVER =
  'account-hash-ea2a1d98965a16b0e1234a3c3d251732cfb831bcf21ee060ecbae471bdf42fdf';
const CHALLENGER =
  'account-hash-80b98aa54801f01eb434094bc8d6401b4c9ecab2396810d2ae250ef276608428';
const EVIDENCE_ROOT =
  '0xdcc37a3235f6b449e648a643c976a3dd05667b9e6439aa2047b1938933bdd3a6';
const RESOLVE_TX =
  '7692d1954d6130149308161bb78b379dc58896f079dde2afc685d86fb94be16e';

export const CANONICAL_ACTION_27_REPLAY = {
  schemaId: 'bondsman.canonical-replay.v1',
  mode: 'canonical_replay',
  actionId: 27,
  source: 'committed_bundle',
  liveProjectionAvailable: false,
  generatedAt: '2026-07-21T09:09:57.560Z',
  evidenceLabels: {
    quoteProbe: 'LIVE_REQUEST',
    payment: 'REAL_HISTORICAL_TRANSACTION',
    quote: 'REAL_HISTORICAL_TRANSACTION',
    action: 'CANONICAL_REPLAY',
    deliveryInput: 'CONTROLLED_TESTNET_FIXTURE',
    challenge: 'REAL_HISTORICAL_TRANSACTION',
    receipt: 'SIGNED_PORTABLE_EVIDENCE',
  },
  proof: {
    proofSchemaVersion: 1,
    actionId: '27',
    controller: CONTROLLER,
    outcome: 'SLASHED',
    faultClass: 'delivery_contradiction',
    oneLine:
      'Approver bond was slashed after delivery_contradiction verification.',
    timeline: [
      {
        stage: 'initiate',
        at: null,
        actor: 'approver',
        txHash:
          '5d6ac66e676d08b4229595ee5ada058a421a1f2f91214e63ce0db1d64b5237d0',
        explorerUrl:
          'https://testnet.cspr.live/transaction/5d6ac66e676d08b4229595ee5ada058a421a1f2f91214e63ce0db1d64b5237d0',
      },
      {
        stage: 'bond_posted',
        at: null,
        actor: 'approver',
        txHash:
          'ef6eb3441002f0be22415b40d6deb2b78a19f2af78771637b2585d5dccc7d21d',
        explorerUrl:
          'https://testnet.cspr.live/transaction/ef6eb3441002f0be22415b40d6deb2b78a19f2af78771637b2585d5dccc7d21d',
      },
      {
        stage: 'execute',
        at: null,
        actor: 'approver',
        txHash:
          '7f45b8071c876c1b08146cd91081f6589e244a612ef0787bd93c27367480cdaf',
        explorerUrl:
          'https://testnet.cspr.live/transaction/7f45b8071c876c1b08146cd91081f6589e244a612ef0787bd93c27367480cdaf',
      },
      {
        stage: 'evidence_arrived',
        at: '2026-07-19T10:41:26.996Z',
        actor: 'buyer_signer',
        signature:
          'BjJiyqn6lW7Gh7GIn9oW1Z2pg6cmubP+gJ68ASJg5H7IKILg2OSRNmJXpRqOe1HYFjlqHtFPWulMEO7SCS8/BQ==',
        payload: {
          actionId: 27,
          eventType: 'goods_not_received',
          invoiceId: 1784457630418,
          nonce:
            'bb5098459cbf1e67c4fd19724a66a756fda5e177e412d63c63a86ba68786f370',
          occurredAt: 1784457681904,
          buyerPublicKeyRawHex:
            'cb9e730755d345981f66c5d317780f4192b9e7685cc2c1fe4d3aa17c4130752d',
          evidenceHex:
            '1b00000000000000d292f6799f010000f05bf7799f010000bb5098459cbf1e67c4fd19724a66a756fda5e177e412d63c63a86ba68786f370063262caa9fa956ec687b1889fda16d59da983a726b9b3fe809ebc012260e47ec82882e0d8e491366257a51a8e7b51d816396a1ed14f5ae94c10eed2092f3f05',
        },
      },
      {
        stage: 'challenge',
        at: null,
        actor: 'watchdog',
        txHash:
          '10c53143b07a7f9c8cd8ad6b6638d3454083a788ec3b739ad28af20b8abc4889',
        explorerUrl:
          'https://testnet.cspr.live/transaction/10c53143b07a7f9c8cd8ad6b6638d3454083a788ec3b739ad28af20b8abc4889',
      },
      {
        stage: 'resolve',
        at: null,
        actor: 'watchdog',
        txHash: RESOLVE_TX,
        explorerUrl: `https://testnet.cspr.live/transaction/${RESOLVE_TX}`,
        outcome: 'SLASHED',
      },
    ],
    participants: {
      approver: { account: APPROVER, role: 'model-driven' },
      challenger: { account: CHALLENGER, role: 'deterministic' },
    },
    valueAtRisk: '50000000000000',
    bond: '2800000000000',
    faultCondition: {
      class: 'delivery_contradiction',
      verifierModule: 'delivery-contradiction',
      evidenceRoot: EVIDENCE_ROOT,
      verificationDetails:
        'Signed delivery contradiction evidence was verified on chain.',
    },
    payment: {
      protocol: 'x402',
      scheme: 'exact',
      network: 'casper:casper-test',
      asset: 'WCSPR',
      assetPackage:
        '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
      paymentAmount: '100000000',
      payer:
        '003b3362ea7af5776a37530df663afa7bc7c673ebcdd167f8934e2ac68d7eb9c77',
      payTo:
        '002cfb8f00d21230301310fc0d7633350ad7326d80b7f61561f77529dff71e918f',
      facilitator: 'x402-facilitator.cspr.cloud',
      settlementTransaction:
        '19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56',
      settlementExplorerUrl:
        'https://testnet.cspr.live/transaction/19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56',
      settled: true,
    },
    paidQuote: {
      quoteHash:
        '0x8c3401bd019bfca6ff9e9ce0497ddf495bb19719e27d935c7a724bb4d5deca5f',
      actionType: 'invoice_payout',
      faultClass: 'delivery_contradiction',
      verifier: 'delivery-contradiction-v2',
      principalAmount: '50000000000000',
      requiredBond: '2600000000000',
      quotedMinimumBond: '2600000000000',
      bondSemantics: 'minimum_required_bond',
      challengeWindow: 1800,
      policySnapshot: null,
      issuedAt: '2026-07-19T10:40:30.398Z',
      expiresAt: '2026-07-19T10:55:30.397Z',
      consumedAt: '2026-07-19T10:41:26.904Z',
      consumedActionId: 27,
      status: 'consumed',
      actualPostedBond: '2800000000000',
      bondRelation: 'overcollateralized',
      bondDifference: '200000000000',
      minimumSatisfied: true,
      exactMatch: false,
    },
    deliveryAttestation: {
      eventType: 'goods_not_received',
      occurredAt: '2026-07-19T10:41:21.904Z',
      receivedAt: '2026-07-19T10:41:26.996Z',
      buyerPublicKey: 'y55zB1XTRZgfZsXTF3gPQZK552hcwsH+TTqhfEEwdS0=',
      evidenceRoot: EVIDENCE_ROOT,
      signatureVerified: true,
      usedActionId: 27,
    },
    modelReasoning: {
      text: 'Delivery attested by the agent; buyer delivery evidence remains challengeable during the watchdog window.',
      commitHash:
        '7f0a59bcbc1bf507b84f25a9c0386c1bb196c13b524aa43b3b06d10023cc542c',
      recomputedHash:
        '7f0a59bcbc1bf507b84f25a9c0386c1bb196c13b524aa43b3b06d10023cc542c',
      verifiedMatches: true,
    },
    economicImpact: {
      challengerReward: '1400000000000',
      challengerRewardSource: 'chain_event',
      reserveCredit: '1400000000000',
      reserveCreditSource: 'chain_event',
      currentReserveSnapshot: '14125000000000',
      reputationBefore: null,
      reputationDelta: -50,
      reputationDeltaSource: 'protocol_rule',
      reputationAfter: null,
      resolutionEventTransaction: RESOLVE_TX,
      resolutionEventExplorerUrl: `https://testnet.cspr.live/transaction/${RESOLVE_TX}`,
    },
    bondEconomics: {
      quotedMinimumBond: '2600000000000',
      actualPostedBond: '2800000000000',
      bondRelation: 'overcollateralized',
      bondDifference: '200000000000',
      minimumSatisfied: true,
      exactMatch: false,
    },
    receiptUrl: '/api/receipt/27',
    cachedAt: '2026-07-19T21:34:39.919Z',
  },
  receipt: {
    protocol: 'bondsman',
    version: '3',
    schemaId: 'bondsman.portable-receipt.golden-path.v3',
    network: 'casper-test',
    actionId: '27',
    controller: CONTROLLER,
    actor: APPROVER,
    actorRole: 'approver',
    actionType: 'invoice_payout',
    verifier: 'delivery-contradiction-v2',
    faultClass: 'delivery_contradiction',
    principal: '50000000000000',
    bond: '2800000000000',
    outcome: 'SLASHED',
    faultCode: 'DELIVERY_CONTRADICTION_VERIFIED',
    challenger: CHALLENGER,
    challengerType: 'watchdog',
    challengeSigning: 'watchdog-key',
    watchdogChallengeTransaction:
      '10c53143b07a7f9c8cd8ad6b6638d3454083a788ec3b739ad28af20b8abc4889',
    resolveTransaction: RESOLVE_TX,
    economics: {
      challengerReward: '1400000000000',
      challengerRewardSource: 'chain_event',
      reserveCredit: '1400000000000',
      reserveCreditSource: 'chain_event',
      currentReserveSnapshot: '14125000000000',
      reputationBefore: null,
      reputationDelta: -50,
      reputationDeltaSource: 'protocol_rule',
      reputationAfter: null,
      resolutionEventTransaction: RESOLVE_TX,
      resolutionEventExplorerUrl: `https://testnet.cspr.live/transaction/${RESOLVE_TX}`,
    },
    deployHashes: {
      initiate:
        '5d6ac66e676d08b4229595ee5ada058a421a1f2f91214e63ce0db1d64b5237d0',
      approve:
        'a960893e1523a8d2499220d125ca8642a91f4bc534df3884bb4792e560c6d971',
      postBond:
        'ef6eb3441002f0be22415b40d6deb2b78a19f2af78771637b2585d5dccc7d21d',
      execute:
        '7f45b8071c876c1b08146cd91081f6589e244a612ef0787bd93c27367480cdaf',
      challenge:
        '10c53143b07a7f9c8cd8ad6b6638d3454083a788ec3b739ad28af20b8abc4889',
      resolve: RESOLVE_TX,
    },
    reasoningCommitment: {
      text: 'Delivery attested by the agent; buyer delivery evidence remains challengeable during the watchdog window.',
      commitHash:
        '7f0a59bcbc1bf507b84f25a9c0386c1bb196c13b524aa43b3b06d10023cc542c',
      recomputedHash:
        '7f0a59bcbc1bf507b84f25a9c0386c1bb196c13b524aa43b3b06d10023cc542c',
      verifiedMatches: true,
    },
    deliveryEvidence: {
      eventType: 'goods_not_received',
      occurredAt: '2026-07-19T10:41:21.904Z',
      receivedAt: '2026-07-19T10:41:26.996Z',
      buyerPublicKey: 'y55zB1XTRZgfZsXTF3gPQZK552hcwsH+TTqhfEEwdS0=',
      evidenceRoot: EVIDENCE_ROOT,
      signatureVerified: true,
      usedActionId: 27,
    },
    payment: {
      protocol: 'x402',
      scheme: 'exact',
      network: 'casper:casper-test',
      asset: 'WCSPR',
      assetPackage:
        '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
      paymentAmount: '100000000',
      payer:
        '003b3362ea7af5776a37530df663afa7bc7c673ebcdd167f8934e2ac68d7eb9c77',
      payTo:
        '002cfb8f00d21230301310fc0d7633350ad7326d80b7f61561f77529dff71e918f',
      facilitator: 'x402-facilitator.cspr.cloud',
      settlementTransaction:
        '19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56',
      settlementExplorerUrl:
        'https://testnet.cspr.live/transaction/19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56',
      settled: true,
    },
    paidQuote: {
      quoteHash:
        '0x8c3401bd019bfca6ff9e9ce0497ddf495bb19719e27d935c7a724bb4d5deca5f',
      actionType: 'invoice_payout',
      faultClass: 'delivery_contradiction',
      verifier: 'delivery-contradiction-v2',
      principalAmount: '50000000000000',
      requiredBond: '2600000000000',
      challengeWindow: 1800,
      issuedAt: '2026-07-19T10:40:30.398Z',
      expiresAt: '2026-07-19T10:55:30.397Z',
      consumedAt: '2026-07-19T10:41:26.904Z',
      consumedActionId: 27,
      status: 'consumed',
    },
    issuedAt: '2026-07-19T21:34:38.573Z',
    signerPublicKey:
      'MCowBQYDK2VwAyEAfsRmaqS4Kww8E7iBMqoPV5/7OSqEVai5DcxiCIbliPg=',
    signature:
      'pymO0d4MyBU7BEz60ZliCeotJQinngqKxcrGs/Th3QtlpWnMkBLzRvt/P4CkOuFDouFkARKPgTzcajQJT/FnBg==',
  },
} satisfies CanonicalReplay;

export const CANONICAL_ACTION_27_PROOF: CanonicalProof =
  CANONICAL_ACTION_27_REPLAY.proof;

export const CANONICAL_ACTION_27_RECEIPT_VERIFICATION: ReceiptVerification = {
  valid: true,
};
