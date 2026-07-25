'use client';

import type { Watchdog } from '@/lib/types';
import WatchdogEconomy from '@/components/arena/WatchdogEconomy';

export default function TwoAgentsClient({
  initialWatchdog,
}: {
  initialWatchdog: Watchdog | null;
}) {
  return (
    <WatchdogEconomy
      initialWatchdog={initialWatchdog}
      onResolved={() => { /* refresh happens inside via polling */ }}
    />
  );
}
