import { Banner } from 'bondsman-design-lab';

export function Tones() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <Banner tone="info">Live backend health check pending.</Banner>
      <Banner tone="degraded">Live backend unavailable. You can still verify receipts and view historical proof.</Banner>
      <Banner tone="error">Submit failed. Retry, or check status.</Banner>
    </div>
  );
}
