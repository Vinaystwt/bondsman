export interface BondsmanConfig {
  chainName: 'casper-test';
  deployerSecretKeyPath: string;
  nodeRpcUrl: string;
  nodeAddress: string;
  eventsUrl: string;
  publicNodeRpcUrl: string;
  publicNodeAddress: string;
  publicEventsUrl: string;
  cloudApiKey?: string;
  usingPublicRpc: boolean;
}

const PUBLIC_NODE_ADDRESS = 'https://node.testnet.casper.network';
const PUBLIC_RPC_URL = `${PUBLIC_NODE_ADDRESS}/rpc`;
const PUBLIC_EVENTS_URL = `${PUBLIC_NODE_ADDRESS}/events`;

function requireValue(
  env: Record<string, string | undefined>,
  name: string,
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function withoutRpcSuffix(url: string): string {
  return url.replace(/\/rpc\/?$/, '').replace(/\/$/, '');
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): BondsmanConfig {
  const chainName = requireValue(env, 'CHAIN_NAME');
  if (chainName !== 'casper-test') {
    throw new Error('CHAIN_NAME must be casper-test');
  }

  const deployerSecretKeyPath = requireValue(
    env,
    'DEPLOYER_SECRET_KEY_PATH',
  );
  const cloudApiKey = env.CSPR_CLOUD_API_KEY?.trim() || undefined;
  if (!cloudApiKey) {
    return {
      chainName,
      deployerSecretKeyPath,
      nodeRpcUrl: PUBLIC_RPC_URL,
      nodeAddress: PUBLIC_NODE_ADDRESS,
      eventsUrl: PUBLIC_EVENTS_URL,
      publicNodeRpcUrl: PUBLIC_RPC_URL,
      publicNodeAddress: PUBLIC_NODE_ADDRESS,
      publicEventsUrl: PUBLIC_EVENTS_URL,
      usingPublicRpc: true,
    };
  }

  const nodeAddress = withoutRpcSuffix(
    env.NODE_RPC_URL?.trim() || 'https://node.testnet.cspr.cloud',
  );
  return {
    chainName,
    deployerSecretKeyPath,
    nodeRpcUrl: `${nodeAddress}/rpc`,
    nodeAddress,
    eventsUrl:
      env.EVENTS_URL?.trim() ||
      'https://node-sse.testnet.cspr.cloud/events/main',
    publicNodeRpcUrl: PUBLIC_RPC_URL,
    publicNodeAddress: PUBLIC_NODE_ADDRESS,
    publicEventsUrl: PUBLIC_EVENTS_URL,
    cloudApiKey,
    usingPublicRpc: false,
  };
}

export function publicFallbackConfig(
  config: BondsmanConfig,
): BondsmanConfig {
  const { cloudApiKey: _cloudApiKey, ...withoutCloudKey } = config;
  return {
    ...withoutCloudKey,
    nodeRpcUrl: config.publicNodeRpcUrl,
    nodeAddress: config.publicNodeAddress,
    eventsUrl: config.publicEventsUrl,
    usingPublicRpc: true,
  };
}
