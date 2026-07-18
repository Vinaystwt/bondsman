import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import { actionDetail } from '../api/action-detail.js';
import { proofFor } from '../proofs/service.js';

function output(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

function remoteServer(repository: Repository, deployment: Deployment): McpServer {
  const server = new McpServer({ name: 'bondsman', version: '1.0.0' });
  const controller = deployment.contracts.controller.contractHash;
  server.registerTool('get_action', {
    description: 'Get one bonded action and its chain evidence.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  }, async ({ actionId }) => output(actionDetail(repository, actionId) ?? { error: 'action not found' }));
  server.registerTool('list_actions', {
    description: 'List bonded actions from the live projection.', inputSchema: {},
  }, async () => output(repository.listActions().filter((action) => action.controllerHash === controller)));
  server.registerTool('get_proof', {
    description: 'Get a completed cached proof object.', inputSchema: { actionId: z.number().int().nonnegative() },
  }, async ({ actionId }) => output(proofFor(repository, actionId, controller) ?? { error: 'completed proof not found' }));
  server.registerTool('get_deployments', {
    description: 'Get testnet contract hashes and public accounts.', inputSchema: {},
  }, async () => output(deployment));
  return server;
}

export function registerRemoteMcp(
  app: FastifyInstance,
  repository: Repository,
  deployment: Deployment,
): void {
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  app.all('/mcp', async (request, reply) => {
    const sessionId = request.headers['mcp-session-id'];
    let transport = typeof sessionId === 'string' ? sessions.get(sessionId) : undefined;
    if (!transport && request.method === 'POST' && isInitializeRequest(request.body)) {
      let created: StreamableHTTPServerTransport;
      created = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => { sessions.set(id, created); },
      });
      created.onclose = () => {
        if (created.sessionId) sessions.delete(created.sessionId);
      };
      transport = created;
      // SDK 1.29's transport declaration is not exact-optional compatible with
      // its own Transport interface, although its runtime object implements it.
      await remoteServer(repository, deployment).connect(transport as never);
    }
    if (!transport) {
      return reply.code(400).send({
        jsonrpc: '2.0', id: null,
        error: { code: -32000, message: 'MCP session is not initialized' },
      });
    }
    await transport.handleRequest(request.raw, reply.raw, request.body);
    return reply;
  });
}
