import type { BondsmanConfig } from '../config/env.js';

type Fetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

async function consumeEvents(
  response: Response,
  onEvent: () => void,
  signal: AbortSignal,
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) return;
    buffered += decoder.decode(value, { stream: true });
    const frames = buffered.split(/\r?\n\r?\n/);
    buffered = frames.pop() ?? '';
    for (const frame of frames) {
      if (frame.split(/\r?\n/).some((line) => line.startsWith('data:'))) {
        onEvent();
      }
    }
  }
}

function aborted(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted ||
    (error instanceof Error && error.name === 'AbortError');
}

export async function streamEventWakeups(
  config: BondsmanConfig,
  onEvent: () => void,
  signal: AbortSignal,
  fetcher: Fetcher = fetch,
): Promise<void> {
  const endpoints = config.cloudApiKey
    ? [
        {
          url: config.eventsUrl,
          headers: { Authorization: config.cloudApiKey },
        },
        { url: config.publicEventsUrl, headers: {} },
      ]
    : [{ url: config.publicEventsUrl, headers: {} }];

  while (!signal.aborted) {
    for (const endpoint of endpoints) {
      if (signal.aborted) return;
      try {
        const response = await fetcher(endpoint.url, {
          headers: endpoint.headers,
          signal,
        });
        if (!response.ok) {
          throw new Error(
            `event stream returned HTTP ${response.status}`,
          );
        }
        await consumeEvents(response, onEvent, signal);
        if (signal.aborted) return;
      } catch (error) {
        if (aborted(error, signal)) return;
      }
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1_000);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
