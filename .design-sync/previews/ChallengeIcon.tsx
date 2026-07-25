import { ChallengeIcon } from 'bondsman-design-lab';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, color: '#15181c' }}>
      <ChallengeIcon size={16} />
      <ChallengeIcon size={24} />
      <ChallengeIcon size={32} />
    </div>
  );
}
