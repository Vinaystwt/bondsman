import { ChevronIcon } from 'bondsman-design-lab';

export function Directions() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <ChevronIcon size={24} direction="down" />
      <ChevronIcon size={24} direction="up" />
    </div>
  );
}
