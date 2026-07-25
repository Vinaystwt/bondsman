import { Button } from 'bondsman-design-lab';

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 16 }}>
      <Button variant="primary">Fund bond</Button>
      <Button variant="secondary">View policy</Button>
      <Button variant="quiet">Dismiss</Button>
      <Button variant="destructive">Revoke access</Button>
    </div>
  );
}
