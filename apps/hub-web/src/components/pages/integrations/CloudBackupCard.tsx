import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Cloud, CloudOff } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage, syncApi } from '@/lib/api';
import { formatRelativeTime, formatSyncTime } from '@/lib/format-time';
import { queryKeys } from '@/lib/query-keys';
import { useSyncStatus } from '@/lib/use-sync-status';

import { ConflictResolver } from './ConflictResolver';
import { ConnectSyncDialog } from './ConnectSyncDialog';

export function CloudBackupCard() {
  const [connectOpen, setConnectOpen] = useState(false);
  const queryClient = useQueryClient();
  const status = useSyncStatus();

  const syncNow = useMutation({
    mutationFn: () => syncApi.now(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
      toast.success(
        result.conflicts.length > 0 ? 'Merge conflict — pick a version per file below' : 'Hub synced to GitHub'
      );
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
      toast.error(errorMessage(error, 'Sync failed'));
    }
  });

  const disconnect = useMutation({
    mutationFn: () => syncApi.disconnect(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
      toast.success('Disconnected — local files and history were kept');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to disconnect'));
    }
  });

  const data = status.data;
  const hasConflicts = (data?.conflicts.length ?? 0) > 0;

  return (
    <section className="grid gap-4" aria-labelledby="cloud-backup-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground" id="cloud-backup-heading">
          Cloud backup
        </h2>
        {data?.connected ? (
          <Badge className="gap-1" variant="success">
            <Check aria-hidden="true" className="size-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="default">Not connected</Badge>
        )}
      </div>
      <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
        Back up skills, agents, workflows, rules and prompts to a private GitHub repo, and restore
        them on another machine.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card">
        {status.isLoading ? null : !data?.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CloudOff aria-hidden="true" className="size-5 text-muted-foreground" />
              <p className="text-sm leading-5 text-muted-foreground">
                No backup configured. Connect GitHub to start syncing.
              </p>
            </div>
            <Button onClick={() => setConnectOpen(true)} size="sm">
              Connect GitHub
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <Cloud aria-hidden="true" className="size-4 text-muted-foreground" />
                  <code className="break-all font-mono text-sm text-foreground">{data.remote?.repo}</code>
                </div>
                <p
                  className="text-xs text-muted-foreground"
                  title={data.lastSyncAt ? formatSyncTime(data.lastSyncAt) : undefined}
                >
                  Last sync: {formatRelativeTime(data.lastSyncAt)}
                  {data.authMethod ? ` · via ${data.authMethod === 'gh' ? 'GitHub CLI' : 'token'}` : ''}
                  {data.autoSync ? ' · auto-sync on' : ' · auto-sync off'}
                </p>
                {data.lastSyncError ? (
                  <p className="text-xs text-destructive" role="alert">
                    {data.lastSyncError}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {data.uncommitted + data.ahead + data.behind > 0 ? (
                  <div className="flex items-center gap-1.5">
                    {data.uncommitted > 0 ? (
                      <Badge variant="warning">{data.uncommitted} unsynced</Badge>
                    ) : null}
                    {data.ahead > 0 ? <Badge variant="warning">↑ {data.ahead}</Badge> : null}
                    {data.behind > 0 ? <Badge variant="warning">↓ {data.behind}</Badge> : null}
                  </div>
                ) : null}
                <Button
                  loading={syncNow.isPending}
                  onClick={() => syncNow.mutate()}
                  size="sm"
                  variant={hasConflicts ? 'secondary' : 'default'}
                >
                  {syncNow.isPending ? 'Syncing…' : 'Sync now'}
                </Button>
                <Button
                  loading={disconnect.isPending}
                  onClick={() => disconnect.mutate()}
                  size="sm"
                  variant="ghost"
                >
                  Disconnect
                </Button>
              </div>
            </div>
            {hasConflicts ? <ConflictResolver status={data} /> : null}
          </div>
        )}
      </div>

      <ConnectSyncDialog onOpenChange={setConnectOpen} open={connectOpen} />
    </section>
  );
}
