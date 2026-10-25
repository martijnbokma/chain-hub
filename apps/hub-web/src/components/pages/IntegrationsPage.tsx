import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { CloudBackupCard } from '@/components/pages/integrations/CloudBackupCard';
import { integrationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll()
  });

  const setup = useMutation({
    mutationFn: async () => {
      return integrationsApi.setup();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      toast.success('Editors connected');
    },
    onError: () => {
      toast.error('Unable to setup integrations');
    }
  });

  if (integrations.isLoading) {
    return <PageSkeleton variant="checklist" />;
  }

  if (integrations.isError) {
    return (
      <EmptyState description="Integration status is temporarily unavailable." title="Unable to load integrations" />
    );
  }

  if (!integrations.data) {
    return <EmptyState description="There is no integration data to show yet." title="Integrations unavailable" />;
  }

  const installed = integrations.data.filter((integration) => integration.installed);
  const connectedCount = installed.filter((integration) => integration.connected).length;

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Linked editors</h2>
            <Badge variant="default">
              {connectedCount}/{installed.length}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Link each supported editor on this machine to the hub so they all stay in sync.
          </p>
        </div>
        <Button className="w-fit shrink-0" loading={setup.isPending} onClick={() => setup.mutate()}>
          {setup.isPending ? 'Connecting…' : 'Connect editors'}
        </Button>
      </header>

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {integrations.data.map((integration) => (
          <li
            className={cn(
              'grid gap-3 border-b border-border p-4 last:border-b-0',
              'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'
            )}
            key={integration.id}
          >
            <div className="grid min-w-0 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">{integration.label}</h3>
                {integration.installed ? (
                  integration.connected ? (
                    <Badge
                      className={cn('gap-1', setup.isSuccess && 'animate-[icon-in_200ms_ease-out]')}
                      variant="success"
                    >
                      <Check aria-hidden="true" className="size-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className={cn(setup.isPending && 'animate-pulse')} variant="warning">
                      Not connected
                    </Badge>
                  )
                ) : (
                  <Badge variant="default">Not installed</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Mode: {integration.mode}</p>
              <div className="grid gap-1">
                {integration.targetPaths.map((targetPath) => (
                  <code className="break-all font-mono text-xs text-muted-foreground" key={targetPath}>
                    {targetPath}
                  </code>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {integration.supportedKinds.map((kind) => (
                  <Badge key={kind} variant="accent">
                    {kind}
                  </Badge>
                ))}
                {integration.unsupportedKinds.map((kind) => (
                  <Badge className="opacity-60 line-through" key={kind} variant="default">
                    {kind}
                    <span className="sr-only"> (not supported by this editor)</span>
                  </Badge>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <CloudBackupCard />
    </section>
  );
}
