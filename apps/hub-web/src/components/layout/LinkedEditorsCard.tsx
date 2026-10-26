import type { useMutation } from '@tanstack/react-query';

import { cn } from '../../lib/utils';
import type { integrationsApi } from '../../lib/api';
import type { Integration } from '@/types';

type ConnectEditorsMutation = ReturnType<typeof useMutation<Awaited<ReturnType<typeof integrationsApi.setup>>, Error, void>>;

interface LinkedEditorsCardProps {
  installedEditors: Integration[];
  connectedCount: number;
  connectEditors: ConnectEditorsMutation;
}

/** Sidebar footer card listing installed editors and their link state. */
export function LinkedEditorsCard({ installedEditors, connectedCount, connectEditors }: LinkedEditorsCardProps) {
  return (
    <div className="grid gap-2.5 rounded-2xl border border-border px-3 py-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Linked editors</p>
        <span className="font-mono text-2xs tabular-nums text-muted-foreground">
          {connectedCount}/{installedEditors.length}
        </span>
      </div>
      <div className="grid gap-2">
        {installedEditors.map((integration) => (
          <div className="flex min-w-0 items-center gap-2.5" key={integration.id}>
            <span
              aria-hidden="true"
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                integration.connected ? 'bg-success' : 'bg-muted-foreground/30',
                !integration.connected && connectEditors.isPending && 'animate-pulse'
              )}
            />
            <span
              className={cn(
                'truncate text-xs leading-none',
                integration.connected ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {integration.label}
              <span className="sr-only">{integration.connected ? ' (connected)' : ' (not connected)'}</span>
            </span>
          </div>
        ))}
        {installedEditors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No supported editor found on this machine.</p>
        ) : null}
      </div>
    </div>
  );
}
