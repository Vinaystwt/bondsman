import { CheckmarkIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <CheckmarkIcon size={16} />
      <CheckmarkIcon size={24} />
      <CheckmarkIcon size={32} />
    </div>
  );
}
