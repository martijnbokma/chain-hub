import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { setupApi, integrationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SetupGuide } from '@/types';

function statusLabel(status: SetupGuide['steps'][number]['status']): string {
  switch (status) {
    case 'done':
      return 'Done';
    case 'current':
      return 'Up next';
    case 'pending':
      return 'Not started';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusVariant(
  status: SetupGuide['steps'][number]['status']
): 'success' | 'warning' | 'default' {
  switch (status) {
    case 'done':
      return 'success';
    case 'current':
      return 'warning';
    case 'pending':
      return 'default';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function SetupPage() {
  const queryClient = useQueryClient();
  const guide = useQuery({
    queryKey: ['setup'],
    queryFn: () => setupApi.getGuide()
  });

  const setupEditors = useMutation({
    mutationFn: async () => {
      const response = await integrationsApi.setup();
      if (!response.ok) {
        throw new Error('Unable to connect editors');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success('Editors connected');
    },
    onError: () => {
      toast.error('Unable to connect editors');
    }
  });

  if (guide.isLoading) {
    return <PageSkeleton variant="checklist" />;
  }

  if (guide.isError || !guide.data) {
    return <EmptyState description="The setup guide is temporarily unavailable." title="Unable to load setup guide" />;
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <header className="grid gap-3">
        <Eyebrow>Setup</Eyebrow>
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Get your hub ready
          </h2>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Initialize the local hub, create a reusable asset, connect editors, then validate the
            structure.
          </p>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Chain home</span>
          <code className="break-all font-mono text-xs text-foreground">
            {guide.data.chainHome}
          </code>
        </p>
      </header>

      <ol className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {guide.data.steps.map((step, index) => {
          const isCurrent = step.status === 'current';
          const showConnect = step.action === 'connect' && !step.complete;

          return (
            <li
              className={cn(
                'grid gap-3 border-b border-border p-4 last:border-b-0',
                'sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:items-start',
                isCurrent && 'bg-muted/40'
              )}
              key={step.id}
            >
              <span
                className={cn(
                  'pt-0.5 font-mono text-xs tabular-nums',
                  isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="grid min-w-0 gap-3">
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{step.label}</h3>
                    <Badge variant={statusVariant(step.status)}>{statusLabel(step.status)}</Badge>
                  </div>
                  <p className="text-sm leading-5 text-muted-foreground">{step.description}</p>
                </div>

                {showConnect ? (
                  <Button
                    className="w-fit"
                    disabled={setupEditors.isPending}
                    onClick={() => setupEditors.mutate()}
                    size="sm"
                  >
                    {setupEditors.isPending ? 'Connecting…' : 'Connect editors'}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
