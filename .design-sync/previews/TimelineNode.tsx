import { TimelineNode } from 'bondsman-design-lab';

export function States() {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, listStyle: 'none', margin: 0 }}>
      <TimelineNode label="Bonded" status="complete" hash="0x7f3a91b2c8d4e15f...c92e" />
      <TimelineNode label="Executed" status="current" />
      <TimelineNode label="Evidence window" status="upcoming" />
    </ul>
  );
}
