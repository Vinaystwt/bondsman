import { EvidenceLabel } from 'bondsman-design-lab';

export function Kinds() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, fontFamily: 'sans-serif' }}>
      <EvidenceLabel kind="historical" />
      <EvidenceLabel kind="blueprint" />
    </div>
  );
}
