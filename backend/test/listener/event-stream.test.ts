import { describe, expect, it, vi } from 'vitest';
import type { BondsmanConfig } from '../../src/config/env.js';
import { streamEventWakeups } from '../../src/listener/event-stream.js';

const config: BondsmanConfig = {
  chainName: 'casper-test',
  deployerSecretKeyPath: '/tmp/deployer.pem',
  nodeRpcUrl: 'https://node.testnet.cspr.cloud/rpc',
  nodeAddress: 'https://node.testnet.cspr.cloud',
  eventsUrl: 'https://node-sse.testnet.cspr.cloud/events/main',
  publicNodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  publicNodeAddress: 'https://node.testnet.casper.network',
  publicEventsUrl: 'https://node.testnet.casper.network/events',
  cloudApiKey: 'cloud-token',
  usingPublicRpc: false,
};

describe('streamEventWakeups', () => {
  it('authenticates CSPR.cloud and emits a wakeup for SSE data', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      const stream = new ReadableStream({
        start(streamController) {
          streamController.enqueue(
            new TextEncoder().encode(
              'event: TransactionProcessed\ndata: {"hash":"abc"}\n\n',
            ),
          );
          streamController.close();
        },
      });
      return new Response(stream, { status: 200 });
    });
    const wakeup = vi.fn(() => controller.abort());

    await streamEventWakeups(
      config,
      wakeup,
      controller.signal,
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      config.eventsUrl,
      expect.objectContaining({
        headers: { Authorization: 'cloud-token' },
      }),
    );
    expect(wakeup).toHaveBeenCalledTimes(1);
  });

  it('falls back to the public stream when cloud rejects', async () => {
    const controller = new AbortController();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockImplementationOnce(async () => {
        controller.abort();
        return new Response(null, { status: 200 });
      });

    await streamEventWakeups(
      config,
      () => undefined,
      controller.signal,
      fetcher,
    );

    expect(fetcher.mock.calls[1]?.[0]).toBe(config.publicEventsUrl);
    expect(fetcher.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ headers: {} }),
    );
  });
});
