import { spawn } from 'node:child_process';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../backend/src/config/env.js';
import { createRpcClient, parseOdraContracts, resolveContractHash } from '../backend/src/casper/rpc.js';
import { deploymentSchema, type Deployment } from '../backend/src/shared/deployment.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(root, 'contracts/resources/casper-test-contracts.toml');
const deploymentPath = join(root, 'deployments/testnet.json');

function deploy(env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('cargo', ['run', '-p', 'bondsman_cli', '--bin', 'bondsman_cli_v2', '--', 'deploy', '--deploy-mode', 'default'], { cwd: join(root, 'contracts'), env, stdio: 'inherit' });
    child.once('error', reject); child.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`V2 deploy exited with ${code}`)));
  });
}

async function main() {
  loadDotenv({ path: join(root, '.env'), quiet: true }); const config = loadConfig();
  const prior = deploymentSchema.parse(JSON.parse(await readFile(deploymentPath, 'utf8')));
  await deploy({ ...process.env, ODRA_CASPER_LIVENET_SECRET_KEY_PATH: resolve(config.deployerSecretKeyPath), ODRA_CASPER_LIVENET_NODE_ADDRESS: config.nodeAddress, ODRA_CASPER_LIVENET_EVENTS_URL: config.eventsUrl, ODRA_CASPER_LIVENET_CHAIN_NAME: config.chainName, ODRA_CASPER_LIVENET_KEY_1: join(root, '.keys/agent.pem'), ...(config.cloudApiKey ? { ODRA_CASPER_LIVENET_CSPR_CLOUD_AUTH_TOKEN: config.cloudApiKey } : {}) });
  const installed = parseOdraContracts(await readFile(registryPath, 'utf8')); const rpc = createRpcClient(config);
  const contract = async (name: string) => { const packageHash = installed[name]; if (!packageHash) throw new Error(`missing deployed ${name}`); return { packageHash, contractHash: await resolveContractHash(rpc, packageHash) }; };
  const v2 = { mockCsprUsd: prior.contracts.mockCsprUsd, bondVault: await contract('BondVaultV2'), controller: await contract('BondsmanControllerV2'), invoicePool: await contract('InvoicePoolV2'), verifiers: { duplicateClaim: await contract('DuplicateClaimVerifierV2'), deliveryContradiction: await contract('DeliveryContradictionVerifierV2') } };
  const v1 = prior.versions?.v1 ?? { mockCsprUsd: prior.contracts.mockCsprUsd, bondVault: prior.contracts.bondVault, controller: prior.contracts.controller, invoicePool: prior.contracts.invoicePool };
  const next: Deployment = deploymentSchema.parse({ ...prior, current: 'v2', contracts: { ...prior.contracts, bondVault: v2.bondVault, controller: v2.controller, invoicePool: v2.invoicePool, controllerV1: v1.controller, controllerV2: v2.controller, bondVaultV2: v2.bondVault, invoicePoolV2: v2.invoicePool }, versions: { v1, v2 } });
  const temporary = `${deploymentPath}.${process.pid}.tmp`; await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`); await rename(temporary, deploymentPath); console.log(JSON.stringify(next.versions?.v2, null, 2));
}
await main();
