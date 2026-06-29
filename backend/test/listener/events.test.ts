import { describe, expect, it } from 'vitest';
import { parseOdraEvent } from '../../src/listener/events.js';

describe('parseOdraEvent', () => {
  it('parses an action event and numeric fields', () => {
    expect(
      parseOdraEvent(
        "'ActionExecuted':\n  'action_id': 7\n  'window_end': 1782728973974\n",
      ),
    ).toEqual({
      type: 'ActionExecuted',
      fields: {
        action_id: '7',
        window_end: '1782728973974',
      },
    });
  });
});
