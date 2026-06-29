export interface ParsedOdraEvent {
  type: string;
  fields: Record<string, string>;
}

export function parseOdraEvent(data: string): ParsedOdraEvent {
  const type = data.match(/^'([^']+)':/)?.[1];
  if (!type) throw new Error('event type is missing');
  const fields: Record<string, string> = {};
  for (const match of data.matchAll(/^\s+'([^']+)':\s*(.+)$/gm)) {
    const key = match[1];
    const value = match[2];
    if (key && value) fields[key] = value.trim();
  }
  return { type, fields };
}
