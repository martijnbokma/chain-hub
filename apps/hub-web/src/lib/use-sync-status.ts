import { useQuery } from '@tanstack/react-query';

import { syncApi } from './api';
import { queryKeys } from './query-keys';

/**
 * Shared cloud-backup status. Polls so pending changes, conflicts and sync
 * failures surface in the shell without visiting Integrations first.
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: queryKeys.syncStatus,
    queryFn: () => syncApi.status(),
    refetchInterval: 60_000
  });
}
