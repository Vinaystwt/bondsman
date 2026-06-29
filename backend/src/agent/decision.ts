import { z } from 'zod';

const decisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reasoning: z.string().trim().min(1).max(2_000),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type AgentDecision = z.infer<typeof decisionSchema>;

function jsonObjects(source: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let start = -1;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        found.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return found;
}

export function parseDecision(source: string): AgentDecision {
  const candidates = jsonObjects(source);
  let lastError: unknown = new Error('response did not contain JSON');
  for (const candidate of candidates) {
    try {
      return decisionSchema.parse(JSON.parse(candidate));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
