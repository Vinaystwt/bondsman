import { ClockIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <ClockIcon size={16} />
      <ClockIcon size={24} />
      <ClockIcon size={32} />
    </div>
  );
}
