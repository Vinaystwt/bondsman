import { ExternalLinkIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <ExternalLinkIcon size={16} />
      <ExternalLinkIcon size={24} />
      <ExternalLinkIcon size={32} />
    </div>
  );
}
