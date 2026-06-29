import { describe, expect, it } from 'vitest';
import { parseDecision } from '../../src/agent/decision.js';

describe('parseDecision', () => {
  it('extracts strict JSON from a fenced response', () => {
    expect(
      parseDecision(
        '```json\n{"decision":"approve","reasoning":"Delivered","confidence":0.94}\n```',
      ),
    ).toEqual({
      decision: 'approve',
      reasoning: 'Delivered',
      confidence: 0.94,
    });
  });

  it('extracts JSON surrounded by prose', () => {
    expect(
      parseDecision(
        'Result follows: {"decision":"reject","reasoning":"No delivery proof","confidence":0.7} End.',
      ).decision,
    ).toBe('reject');
  });

  it('rejects unknown fields and out-of-range confidence', () => {
    expect(() =>
      parseDecision(
        '{"decision":"approve","reasoning":"ok","confidence":1.1}',
      ),
    ).toThrow();
    expect(() =>
      parseDecision(
        '{"decision":"approve","reasoning":"ok","confidence":0.8,"extra":true}',
      ),
    ).toThrow();
  });
});
