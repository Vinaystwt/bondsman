import Anthropic from '@anthropic-ai/sdk';
import { parseDecision, type AgentDecision } from './decision.js';
import {
  decisionPrompt,
  type DecisionInvoice,
} from './prompt.js';

export async function requestDecision(
  invoice: DecisionInvoice,
  apiKey: string,
  model: string,
): Promise<AgentDecision> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model,
    max_tokens: 300,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: decisionPrompt(invoice),
      },
    ],
  });
  const text = response.content
    .filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    )
    .map((block) => block.text)
    .join('\n');
  return parseDecision(text);
}
