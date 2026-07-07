import {
  Args,
  CLValue,
  ContractHash,
  Deploy,
  DeployHeader,
  Duration,
  ExecutableDeployItem,
  PublicKey,
  StoredVersionedContractByHash,
} from 'casper-js-sdk';

const PAYMENT_MOTES = BigInt(50_000_000_000);
const TTL_MS = 30 * 60 * 1000;

export interface UnsignedDeploy {
  deployJson: Record<string, unknown>;
  deployHash: string;
}

export function buildChallengeDeploy(
  senderPublicKeyHex: string,
  packageHashHex: string,
  actionId: number,
): UnsignedDeploy {
  const pk = PublicKey.newPublicKey(senderPublicKeyHex);
  const cleanHash = packageHashHex.replace(/^hash-/, '');
  const contractHash = ContractHash.newContract(cleanHash);

  const args = Args.fromMap({
    action_id: CLValue.newCLUint64(BigInt(actionId)),
  });

  const session = new ExecutableDeployItem();
  session.storedVersionedContractByHash = new StoredVersionedContractByHash(
    contractHash,
    'challenge_action',
    args,
  );

  const payment = ExecutableDeployItem.standardPayment(PAYMENT_MOTES.toString());

  const header = DeployHeader.default();
  header.account = pk;
  header.chainName = 'casper-test';
  header.ttl = new Duration(TTL_MS);
  header.gasPrice = 1;

  const deploy = Deploy.makeDeploy(header, payment, session);
  const deployJson = Deploy.toJSON(deploy) as Record<string, unknown>;
  const deployHash = deploy.hash?.toHex() ?? '';

  return { deployJson, deployHash };
}

export function attachSignature(
  deployJson: Record<string, unknown>,
  signatureHex: string,
  signerPublicKeyHex: string,
): Record<string, unknown> {
  const signed = { ...deployJson };
  const approvals = Array.isArray(signed.approvals)
    ? [...signed.approvals]
    : [];
  approvals.push({
    signer: signerPublicKeyHex,
    signature: signatureHex,
  });
  signed.approvals = approvals;
  return signed;
}
