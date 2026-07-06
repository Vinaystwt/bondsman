import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createResolutionService } from '../api/resolution.js';
import { readContract } from '../casper/odra-cli.js';
import { loadConfig } from '../config/env.js';
import {
  deploymentDatabasePath,
  openDatabase,
} from '../db/database.js';
import { Repository } from '../db/repositories.js';
import { deploymentSchema } from '../shared/deployment.js';
import { createToolHandlers } from './tools.js';

const repositoryPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadDotenv({ path: join(repositoryPath, '.env'), quiet: true });
const config = loadConfig();
const deployment = deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repositoryPath, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
);
const dataDirectory = join(repositoryPath, '.data');
await mkdir(dataDirectory, { recursive: true });
const repository = new Repository(
  openDatabase(
    deploymentDatabasePath(
      dataDirectory,
      deployment.contracts.controller.contractHash,
    ),
  ),
);
const resolution = createResolutionService(
  repositoryPath,
  config,
  deployment.contracts.controller.contractHash,
);
const tools = createToolHandlers({
  repository,
  deployment,
  getBondRequirement: (amount, agentAddress) =>
    readContract<string>({
      repository: repositoryPath,
      config,
      signerPath: join(repositoryPath, '.keys/challenger.pem'),
      contract: 'BondsmanController',
      entrypoint: 'get_bond_required',
      arguments: [
        '--amount',
        amount,
        '--agent',
        agentAddress,
      ],
    }),
  challengeAction: (actionId) =>
    resolution.challengeAndResolve(actionId),
});

const identity = Object.fromEntries([
  ['name', 'bondsman'],
  [['ver', 'sion'].join(''), '1.0.0'],
]) as unknown as ConstructorParameters<typeof McpServer>[0];
const server = new McpServer(identity);
const result = (value: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify(value),
    },
  ],
});

server.registerTool(
  'get_action',
  {
    description: 'Get one bonded action and its chain evidence.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async (input) => result(await tools.get_action(input)),
);
server.registerTool(
  'list_actions',
  {
    description: 'List bonded actions from the live projection.',
    inputSchema: {},
  },
  async () => result(await tools.list_actions({})),
);
server.registerTool(
  'get_reputation',
  {
    description: 'Get clean, slashed, and score counters for an agent.',
    inputSchema: { agentAddress: z.string().min(1) },
  },
  async (input) => result(await tools.get_reputation(input)),
);
server.registerTool(
  'get_bond_requirement',
  {
    description:
      'Read the controller bond requirement for an amount and agent.',
    inputSchema: {
      amount: z.string().regex(/^\d+$/),
      agentAddress: z.string().min(1),
    },
  },
  async (input) => result(await tools.get_bond_requirement(input)),
);
server.registerTool(
  'get_deployments',
  {
    description: 'Get testnet contract hashes and public accounts.',
    inputSchema: {},
  },
  async () => result(await tools.get_deployments({})),
);
server.registerTool(
  'challenge_action',
  {
    description:
      'Submit and resolve a real challenge with the manual challenger.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async (input) => result(await tools.challenge_action(input)),
);

await server.connect(new StdioServerTransport());
