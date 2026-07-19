import { z } from 'zod';

export const actionBodySchema = z
  .object({
    actionId: z.number().int().nonnegative(),
  })
  .strict();

export const transactionHashSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/);

export const walletChallengeBodySchema = z
  .object({
    actionId: z.number().int().nonnegative(),
    challengeDeployHash: transactionHashSchema,
  })
  .strict();

export const verifyBodySchema = z.union([
  z.object({ claimHash: z.string().min(1) }).strict(),
  z.object({ actionId: z.number().int().nonnegative() }).strict(),
]);

export const paidActionSubmitSchema = z.object({
  quoteHash: z.string().regex(/^0x[0-9a-f]{64}$/i),
  faultClass: z.enum(['duplicate_claim', 'delivery_contradiction'])
    .default('delivery_contradiction'),
  buyerPublicKey: z.string().min(16).optional(),
  eventType: z.enum(['delivery_rejected', 'goods_not_received'])
    .default('goods_not_received'),
  submitAuthorization: z.object({
    publicKey: z.string().regex(/^(01|02|03)[0-9a-f]+$/i),
    signature: z.string().min(16),
    timestamp: z.number().int().positive(),
    nonce: z.string().min(16).max(256),
  }).strict(),
}).strict();
