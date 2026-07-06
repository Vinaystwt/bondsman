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
