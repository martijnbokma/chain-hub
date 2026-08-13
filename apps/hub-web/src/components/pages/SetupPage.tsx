import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { setupApi, integrationsApi, validateApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Integration, SetupGuide } from '@/types';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guide = useQuery({
    queryKey: ['setup'],
    queryFn: () => setupApi.getGuide()
  });

  const runValidate = useMutation({
    mutationFn: () => validateApi.run(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      if (result.ok) {
        toast.success('Structure is valid — no issues found');
      } else {
        toast.error(`${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}: ${result.issues.slice(0, 2).join('; ')}${result.issues.length > 2 ? '…' : ''}`);
      }
    },
    onError: () => {
      toast.error('Unable to run validation');
    }
  });

  const setupEditors = useMutation({
    mutationFn: async () => {
      const response = await integrationsApi.setup();
      if (!response.ok) {
        throw new Error('Unable to connect editors');
      }
      return (await response.json()) as Integration[];
    },
    onSuccess: (integrations) => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });

      const failed = integrations.filter((integration) => !integration.connected);
      if (failed.length > 0) {
        toast.warning(
          `Connected ${integrations.length - failed.length}/${integrations.length} editors — ${failed
            .map((integration) => integration.label)
            .join(', ')} failed`
        );
        return;
      }
      toast.success(`Connected ${integrations.length} editor${integrations.length === 1 ? '' : 's'}`);
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
            Four steps to get every editor reading from one source of truth — so a skill or rule you
            write once shows up everywhere, not just where you wrote it.
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
          const showConnect = step.action === 'connect';
          const showCreateAsset = step.action === 'create-asset' && !step.complete;
          const showValidate = step.action === 'validate';

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
                  <div className="grid gap-3">
                    <Button
                      className="w-fit"
                      disabled={setupEditors.isPending}
                      onClick={() => setupEditors.mutate()}
                      size="sm"
                    >
                      {setupEditors.isPending ? 'Connecting…' : 'Connect editors'}
                    </Button>
                    {setupEditors.data ? (
                      <ul className="grid gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
                        {setupEditors.data.map((integration) => (
                          <li
                            className="flex items-center gap-2 text-xs text-foreground"
                            key={integration.id}
                          >
                            {integration.connected ? (
                              <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                            ) : (
                              <XCircle className="size-3.5 shrink-0 text-warning" />
                            )}
                            <span className="font-medium">{integration.label}</span>
                            <span className="text-muted-foreground">
                              {integration.connected ? `connected (${integration.mode})` : 'not connected'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                {showCreateAsset ? (
                  <Button className="w-fit" onClick={() => navigate('/library?create=1')} size="sm">
                    Create asset
                  </Button>
                ) : null}

                {showValidate ? (
                  <div className="grid gap-3">
                    <Button
                      className="w-fit"
                      disabled={runValidate.isPending}
                      onClick={() => runValidate.mutate()}
                      size="sm"
                    >
                      {runValidate.isPending ? 'Validating…' : 'Run validation'}
                    </Button>
                    {runValidate.data ? (
                      <ul className="grid gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
                        {runValidate.data.checks.map((check) => (
                          <li className="flex items-start gap-2 text-xs text-foreground" key={check.id}>
                            {check.status === 'pass' ? (
                              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                            ) : (
                              <XCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                            )}
                            <span className="grid gap-0.5">
                              <span className="font-medium">{check.label}</span>
                              {check.detail ? (
                                <span className="break-all font-mono text-[11px] text-muted-foreground">
                                  {check.detail}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
