import { redirect } from 'next/navigation';

export default function PublicLeaderboardRedirect() {
  redirect('/app/leaderboard');
}
