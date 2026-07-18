import { z } from 'zod';

const hash = z.string().regex(/^hash-[0-9a-f]{64}$/);
const publicKey = z.string().regex(/^(01[0-9a-f]{64}|02[0-9a-f]{66})$/);
const accountHash = z.string().regex(/^[0-9a-f]{64}$/);

const contractSchema = z.object({
  packageHash: hash,
  contractHash: hash,
});

const optionalContractSchema = contractSchema.optional();

const accountSchema = z.object({
  publicKey,
  accountHash,
});

export const deploymentSchema = z.object({
  network: z.literal('casper-test'),
  chainName: z.literal('casper-test'),
  nodeRpcUrl: z.string().url(),
  contracts: z.object({
    mockCsprUsd: contractSchema,
    bondVault: contractSchema,
    controller: contractSchema,
    invoicePool: contractSchema,
    // The original suite remains the default until a later client migration.
    // Parallel suites are deliberately optional so existing deployments keep
    // parsing while the migration is being prepared.
    controllerV1: optionalContractSchema,
    controllerV2: optionalContractSchema,
    bondVaultV2: optionalContractSchema,
    invoicePoolV2: optionalContractSchema,
  }),
  accounts: z.object({
    deployer: accountSchema,
    agent: accountSchema,
    challenger: accountSchema,
    watchdog: accountSchema,
    integrator: accountSchema.optional(),
    receiptSigner: accountSchema.optional(),
  }),
});

export type Deployment = z.infer<typeof deploymentSchema>;
