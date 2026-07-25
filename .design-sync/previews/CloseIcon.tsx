import { CloseIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <CloseIcon size={16} />
      <CloseIcon size={24} />
      <CloseIcon size={32} />
    </div>
  );
}
