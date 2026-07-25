import { CopyIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <CopyIcon size={16} />
      <CopyIcon size={24} />
      <CopyIcon size={32} />
    </div>
  );
}
