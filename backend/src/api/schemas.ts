import { z } from 'zod';

export const actionBodySchema = z
  .object({
    actionId: z.number().int().nonnegative(),
  })
  .strict();
