import { HamburgerIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <HamburgerIcon size={16} />
      <HamburgerIcon size={24} />
      <HamburgerIcon size={32} />
    </div>
  );
}
