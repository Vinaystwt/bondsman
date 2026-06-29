import { createRequire } from 'node:module';
import type * as CasperSdkTypes from 'casper-js-sdk';

const require = createRequire(import.meta.url);
const sdk = require('casper-js-sdk') as typeof CasperSdkTypes;

export const {
  Args,
  CLValue,
  Deploy,
  HttpHandler,
  KeyAlgorithm,
  makeCsprTransferDeploy,
  PurseIdentifier,
  PrivateKey,
  PublicKey,
  RpcClient,
} = sdk;

export type PrivateKeyInstance = InstanceType<typeof PrivateKey>;
export type PublicKeyInstance = InstanceType<typeof PublicKey>;
