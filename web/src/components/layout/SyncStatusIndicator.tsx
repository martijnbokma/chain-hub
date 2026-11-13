import { CloudCheck, CloudUpload, TriangleAlert } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useSyncStatus } from '@/lib/use-sync-status';
import { cn } from '@/lib/utils';

/**
 * Ambient cloud-backup state in the shell footer: quiet when synced, warning
 * while changes are pending, destructive for conflicts and failures. Always
 * leads to Integrations, where the fix lives. Hidden while disconnected —
 * backup is opt-in and should not nag.
 */
export function SyncStatusIndicator() {
  const { data, isLoading, isError } = useSyncStatus();

  if (isLoading || isError || !data?.connected) {
    return null;
  }

  const conflicts = data.conflicts.length;
  const pending = data.uncommitted + data.ahead + data.behind;
  const problem = conflicts > 0 || Boolean(data.lastSyncError);

  const label =
    conflicts > 0
      ? `Resolve ${conflicts} sync conflict${conflicts === 1 ? '' : 's'}`
      : data.lastSyncError
        ? 'Backup sync failed'
        : pending > 0
          ? `${pending} unsynced change${pending === 1 ? '' : 's'}`
          : 'Backed up';

  const Icon = problem ? TriangleAlert : pending > 0 ? CloudUpload : CloudCheck;

  return (
    <NavLink
      aria-label={`Cloud backup: ${label}`}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium outline-hidden transition-colors',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0',
        problem
          ? 'border-destructive/20 bg-destructive/10 text-destructive-foreground hover:bg-destructive/15'
          : pending > 0
            ? 'border-warning/20 bg-warning/10 text-warning-foreground hover:bg-warning/15'
            : 'border-border text-muted-foreground hover:bg-muted/50'
      )}
      title={label}
      to="/integrations"
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
    </NavLink>
  );
}
