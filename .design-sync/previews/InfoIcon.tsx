import { InfoIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <InfoIcon size={16} />
      <InfoIcon size={24} />
      <InfoIcon size={32} />
    </div>
  );
}
