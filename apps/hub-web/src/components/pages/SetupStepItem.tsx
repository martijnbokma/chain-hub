import type { useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { integrationsApi, validateApi } from '@/lib/api';
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

export function SetupStepItem({
  step,
  index,
  setupEditors,
  runValidate,
  onCreateAsset
}: {
  step: SetupGuide['steps'][number];
  index: number;
  setupEditors: ReturnType<typeof useMutation<Awaited<ReturnType<typeof integrationsApi.setup>>>>;
  runValidate: ReturnType<typeof useMutation<Awaited<ReturnType<typeof validateApi.run>>>>;
  onCreateAsset: () => void;
}) {
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
            <Badge
              className={cn(
                step.status === 'done' &&
                  (setupEditors.isSuccess || runValidate.isSuccess) &&
                  'animate-[icon-in_200ms_ease-out]'
              )}
              variant={statusVariant(step.status)}
            >
              {statusLabel(step.status)}
            </Badge>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">{step.description}</p>
        </div>

        {showConnect ? (
          <div className="grid gap-3">
            <Button
              className="w-fit"
              loading={setupEditors.isPending}
              onClick={() => setupEditors.mutate()}
              size="sm"
              variant={isCurrent ? 'default' : 'secondary'}
            >
              {setupEditors.isPending ? 'Connecting…' : 'Connect editors'}
            </Button>
            {setupEditors.data ? (
              <ul className="grid gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
                {setupEditors.data.filter((integration) => integration.installed).map((integration, index) => (
                  <li
                    className="flex animate-[fade-up_200ms_ease-out_both] items-center gap-2 text-xs text-foreground"
                    key={integration.id}
                    style={{ animationDelay: `${index * 60}ms` }}
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
          <Button
            className="w-fit"
            onClick={onCreateAsset}
            size="sm"
            variant={isCurrent ? 'default' : 'secondary'}
          >
            Create asset
          </Button>
        ) : null}

        {showValidate ? (
          <div className="grid gap-3">
            <Button
              className="w-fit"
              loading={runValidate.isPending}
              onClick={() => runValidate.mutate()}
              size="sm"
              variant={isCurrent ? 'default' : 'secondary'}
            >
              {runValidate.isPending ? 'Validating…' : 'Run validation'}
            </Button>
            {runValidate.data ? (
              <ul className="grid gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
                {runValidate.data.checks.map((check, index) => (
                  <li
                    className="flex animate-[fade-up_200ms_ease-out_both] items-start gap-2 text-xs text-foreground"
                    key={check.id}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
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
}
