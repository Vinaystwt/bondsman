import type { BondsmanConfig } from '../config/env.js';

export interface TransactionFinality {
  hash: string;
  status: 'pending' | 'failed' | 'success';
  final: boolean;
  success: boolean;
  error: string | null;
}

export interface ChallengeIntent {
  hash: string;
  publicKey: string;
  actionId: number;
  target: string;
  entryPoint: 'challenge_action';
}

export interface ChallengeExpectation {
  hash: string;
  actionId: number;
  chainName: string;
  controllerPackageHash: string;
  controllerContractHash: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function rpcResult(raw: unknown): Record<string, unknown> | undefined {
  return record(record(raw)?.result);
}

function transactionV1(
  raw: unknown,
): Record<string, unknown> | undefined {
  const transaction = record(rpcResult(raw)?.transaction);
  return record(transaction?.Version1);
}

function executionError(raw: unknown): string | null | undefined {
  const info = record(rpcResult(raw)?.execution_info);
  if (!info) return undefined;
  const result = record(info.execution_result);
  if (record(result?.Success)) return null;
  const topLevelFailure = record(result?.Failure);
  if (topLevelFailure) {
    return String(
      topLevelFailure.error_message ??
        topLevelFailure.errorMessage ??
        'transaction execution failed',
    );
  }
  const version2 = record(result?.Version2);
  if (version2) {
    const message = version2.error_message;
    return message === null || message === undefined
      ? null
      : String(message);
  }
  const version1 = record(result?.Version1);
  if (record(version1?.Success)) return null;
  const failure = record(version1?.Failure);
  if (failure) {
    return String(
      failure.error_message ??
        failure.errorMessage ??
        'transaction execution failed',
    );
  }
  if (version1?.Success) return null;
  return undefined;
}

export function transactionFinality(
  raw: unknown,
  hash: string,
): TransactionFinality {
  const error = executionError(raw);
  if (error === undefined) {
    return {
      hash,
      status: 'pending',
      final: false,
      success: false,
      error: null,
    };
  }
  if (error !== null) {
    return {
      hash,
      status: 'failed',
      final: true,
      success: false,
      error,
    };
  }
  return {
    hash,
    status: 'success',
    final: true,
    success: true,
    error: null,
  };
}

function namedArgument(
  fields: Record<string, unknown>,
  name: string,
): Record<string, unknown> | undefined {
  const args = record(fields.args);
  const named = args?.Named;
  if (!Array.isArray(named)) return undefined;
  const pair = named.find(
    (candidate) =>
      Array.isArray(candidate) && candidate[0] === name,
  );
  return Array.isArray(pair) ? record(pair[1]) : undefined;
}

function targetHash(fields: Record<string, unknown>): string | undefined {
  const stored = record(record(fields.target)?.Stored);
  const id = record(stored?.id);
  for (const key of [
    'ByPackageHash',
    'ByEntityAddr',
    'ByContractHash',
  ]) {
    const target = record(id?.[key]);
    if (typeof target?.addr === 'string') {
      return `hash-${target.addr.replace(/^hash-/, '')}`;
    }
  }
  return undefined;
}

export function verifyChallengeIntent(
  raw: unknown,
  expected: ChallengeExpectation,
): ChallengeIntent {
  const finality = transactionFinality(raw, expected.hash);
  if (!finality.final) {
    throw new Error('challenge transaction is not final');
  }
  if (!finality.success) {
    throw new Error(
      `challenge transaction failed: ${finality.error}`,
    );
  }

  const transaction = transactionV1(raw);
  if (!transaction || transaction.hash !== expected.hash) {
    throw new Error('challenge transaction hash does not match');
  }
  const payload = record(transaction.payload);
  if (payload?.chain_name !== expected.chainName) {
    throw new Error('challenge transaction uses the wrong Casper chain');
  }
  const fields = record(payload?.fields);
  if (!fields) throw new Error('challenge transaction fields are missing');

  const entryPoint = record(fields.entry_point)?.Custom;
  if (entryPoint !== 'challenge_action') {
    throw new Error('challenge transaction uses the wrong controller entrypoint');
  }
  const actionArgument = namedArgument(fields, 'action_id');
  if (
    actionArgument?.cl_type !== 'U64' ||
    Number(actionArgument.parsed) !== expected.actionId
  ) {
    throw new Error('challenge transaction uses the wrong action_id');
  }
  const target = targetHash(fields);
  const validTargets = new Set([
    expected.controllerPackageHash,
    expected.controllerContractHash,
  ]);
  if (!target || !validTargets.has(target)) {
    throw new Error('challenge transaction uses the wrong controller target');
  }

  const publicKey = record(payload.initiator_addr)?.PublicKey;
  const approvals = transaction.approvals;
  if (
    typeof publicKey !== 'string' ||
    !Array.isArray(approvals) ||
    !approvals.some(
      (approval) => record(approval)?.signer === publicKey,
    )
  ) {
    throw new Error('challenge transaction signer is missing');
  }
  return {
    hash: expected.hash,
    publicKey,
    actionId: expected.actionId,
    target,
    entryPoint: 'challenge_action',
  };
}

async function rpcCall(
  url: string,
  authorization: string | undefined,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Casper RPC ${method} returned HTTP ${response.status}`,
    );
  }
  return response.json();
}

export async function getTransaction(
  config: BondsmanConfig,
  hash: string,
): Promise<unknown> {
  const request = (url: string, authorization?: string) =>
    rpcCall(url, authorization, 'info_get_transaction', {
      transaction_hash: { Version1: hash },
      finalized_approvals: true,
    });
  try {
    const raw = await request(config.nodeRpcUrl, config.cloudApiKey);
    if (rpcResult(raw)) return raw;
    if (!config.cloudApiKey) return raw;
  } catch (error) {
    if (!config.cloudApiKey) throw error;
  }
  return request(config.publicNodeRpcUrl);
}
