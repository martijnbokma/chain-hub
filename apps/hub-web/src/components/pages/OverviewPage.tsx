import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { libraryApi, overviewApi } from '@/lib/api';
import { ASSET_KIND_LABELS, ASSET_KINDS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function OverviewPage() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: () => overviewApi.get()
  });

  const importAgentsSkills = useMutation({
    mutationFn: async () => {
      return libraryApi.migrateAgentsSkills({});
    },
    onSuccess: (result) => {
      const migrated = result.results.filter((item) => item.status === 'migrated').length;
      const skipped = result.results.filter((item) => item.status === 'skipped').length;
      const failed = result.results.filter((item) => item.status === 'failed').length;
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Imported from ~/.agents: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
    },
    onError: () => {
      toast.error('Unable to import from ~/.agents/.skill-lock.json');
    }
  });

  if (overview.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (overview.isError) {
    return <EmptyState description="The overview is temporarily unavailable." title="Unable to load overview" />;
  }

  const data = overview.data;

  if (!data) {
    return <EmptyState description="The overview has no data yet." title="Overview unavailable" />;
  }

  const isHealthy = data.health.issues.length === 0;
  const agentsDrift = data.agentsSkillsDrift;
  const hasAgentsDrift = agentsDrift.missingCount > 0;
  const needsSetup = !data.health.initialized || data.storage.indexedAssets === 0;
  const issueCount = data.health.issues.length;

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Hub status</h2>
          <Badge variant={isHealthy ? 'success' : 'warning'}>
            {isHealthy ? 'Healthy' : 'Needs attention'}
          </Badge>
        </div>
        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
          Manage reusable guidance, validate structure, and connect editors from one place.
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Chain home</span>
          <code className="break-all font-mono text-xs text-muted-foreground">{data.chainHome}</code>
        </p>
      </header>

      {needsSetup ? (
        <Alert className="items-center" variant="default">
          <AlertIcon>
            <Sparkles />
          </AlertIcon>
          <AlertDescription>
            {data.health.initialized
              ? 'Your hub is initialized but has no indexed assets yet. Finish the guided checklist to add your first asset and connect editors.'
              : 'This hub is not fully set up yet. Open the guided checklist to initialize, add your first asset, and connect editors.'}
          </AlertDescription>
          <Link className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')} to="/setup">
            Open setup
          </Link>
        </Alert>
      ) : null}

      {hasAgentsDrift ? (
        <Alert className="items-center" variant="warning">
          <AlertIcon>
            <Download />
          </AlertIcon>
          <AlertDescription>
            {agentsDrift.missingCount} skill{agentsDrift.missingCount === 1 ? '' : 's'} in{' '}
            <code className="font-mono text-xs text-foreground">~/.agents</code>{' '}
            {agentsDrift.missingCount === 1 ? 'is' : 'are'} not in Hub yet
            {agentsDrift.missingNames.length > 0
              ? ` (${agentsDrift.missingNames.slice(0, 3).join(', ')}${
                  agentsDrift.missingNames.length > 3 ? ', …' : ''
                })`
              : ''}
            .
          </AlertDescription>
          <Button
            className="shrink-0"
            loading={importAgentsSkills.isPending}
            onClick={() => importAgentsSkills.mutate()}
            size="sm"
          >
            {importAgentsSkills.isPending ? 'Importing…' : 'Import into Hub'}
          </Button>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="-m-px grid grid-cols-2 sm:grid-cols-5">
          {ASSET_KINDS.map((kind) => {
            const count = data.assetCounts[kind] ?? 0;
            return (
              <Link
                className={cn(
                  'grid gap-1 border border-border bg-card p-4 transition-colors',
                  'hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset',
                  'max-sm:last:col-span-2'
                )}
                key={kind}
                to={`/library?kind=${kind}`}
              >
                <p className="text-xs font-medium text-muted-foreground">{ASSET_KIND_LABELS[kind]}</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{count}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="grid gap-3 border-b border-border p-4 sm:flex sm:gap-4">
          <h3 className="shrink-0 text-sm font-semibold tracking-tight text-foreground sm:w-28">Health</h3>
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="text-sm leading-5 text-muted-foreground">
              Initialized{' '}
              <span className="text-foreground">
                {data.initializedAt ? new Date(data.initializedAt).toLocaleString() : 'Not yet'}
              </span>
            </p>
            {issueCount > 0 ? (
              <ul className="grid list-inside list-disc gap-1 text-sm text-foreground">
                {data.health.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-5 text-muted-foreground">No structural issues detected.</p>
            )}
          </div>
        </div>
        <div className="grid gap-2 p-4 sm:flex sm:gap-4">
          <h3 className="shrink-0 text-sm font-semibold tracking-tight text-foreground sm:w-28">Storage</h3>
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="text-sm leading-5 text-muted-foreground">
              Assets{' '}
              <span className="font-medium tabular-nums text-foreground">{data.storage.indexedAssets}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
