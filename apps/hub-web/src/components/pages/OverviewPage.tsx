import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { errorMessage, issuesApi, libraryApi, overviewApi } from '@/lib/api';
import { ASSET_KIND_LABELS, ASSET_KINDS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { HubIssue, HubIssueAction } from '@/types';
import { SkillRelinkDialog } from './library/SkillRelinkDialog';

export function OverviewPage() {
  const queryClient = useQueryClient();
  const [relinkTarget, setRelinkTarget] = useState<string | null>(null);
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: () => overviewApi.get()
  });

  const issues = useQuery({
    queryKey: ['issues'],
    queryFn: () => issuesApi.get()
  });

  function invalidateIssueData() {
    void queryClient.invalidateQueries({ queryKey: ['issues'] });
    void queryClient.invalidateQueries({ queryKey: ['overview'] });
    void queryClient.invalidateQueries({ queryKey: ['library'] });
    void queryClient.invalidateQueries({ queryKey: ['library', 'skill-updates'] });
  }

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
      void queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success(`Imported from ~/.agents: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
    },
    onError: () => {
      toast.error('Unable to import from ~/.agents/.skill-lock.json');
    }
  });

  const retryCheck = useMutation({
    mutationFn: async (name: string) => libraryApi.checkSkillUpdates({ name, force: true }),
    onSuccess: (result, name) => {
      invalidateIssueData();
      const item = result.results.find((entry) => entry.name === name);
      if (item?.status === 'failed') {
        toast.warning(`Check still failing for ${name}: ${item.error ?? 'unknown error'}`);
      } else {
        toast.success(
          item?.status === 'update_available' ? `Update available for ${name}` : `${name} is up to date`
        );
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to check skill'));
    }
  });

  const retryUpdate = useMutation({
    mutationFn: async (name: string) => libraryApi.updateSkills({ name }),
    onSuccess: (result, name) => {
      invalidateIssueData();
      const item = result.results.find((entry) => entry.name === name);
      if (item?.status === 'failed') {
        toast.warning(`Update still failing for ${name}: ${item.error ?? 'unknown error'}`);
      } else {
        toast.success(item?.status === 'updated' ? `Updated ${name}` : `${name} is up to date`);
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to update skill'));
    }
  });

  const unlinkSkill = useMutation({
    mutationFn: async (name: string) => libraryApi.unlinkSkill(name),
    onSuccess: (_result, name) => {
      invalidateIssueData();
      toast.success(`${name} is now a local, editable skill`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to unlink skill'));
    }
  });

  function renderIssueAction(issue: HubIssue, action: HubIssueAction) {
    const name = issue.assetName ?? '';
    switch (action) {
      case 'retry-check':
        return (
          <Button
            key={action}
            loading={retryCheck.isPending && retryCheck.variables === name}
            onClick={() => retryCheck.mutate(name)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Retry check
          </Button>
        );
      case 'retry-update':
        return (
          <Button
            key={action}
            loading={retryUpdate.isPending && retryUpdate.variables === name}
            onClick={() => retryUpdate.mutate(name)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Retry update
          </Button>
        );
      case 'relink':
        return (
          <Button
            key={action}
            onClick={() => setRelinkTarget(name)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Relink…
          </Button>
        );
      case 'unlink':
        return (
          <Button
            key={action}
            loading={unlinkSkill.isPending && unlinkSkill.variables === name}
            onClick={() => unlinkSkill.mutate(name)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Unlink
          </Button>
        );
      case 'open-asset':
        return (
          <Link
            className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }))}
            key={action}
            to={`/library?kind=${issue.assetKind}&asset=${encodeURIComponent(name)}`}
          >
            Open in Library
          </Link>
        );
      case 'import-agents':
        return (
          <Button
            key={action}
            loading={importAgentsSkills.isPending}
            onClick={() => importAgentsSkills.mutate()}
            size="sm"
            type="button"
            variant="secondary"
          >
            Import into Hub
          </Button>
        );
      case 'open-setup':
        return (
          <Link className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }))} key={action} to="/setup">
            Open setup
          </Link>
        );
      case 'open-integrations':
        return (
          <Link
            className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }))}
            key={action}
            to="/integrations"
          >
            Open backup settings
          </Link>
        );
      default:
        return null;
    }
  }

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

  const hubIssues = issues.data?.issues ?? [];
  const isHealthy = data.health.issues.length === 0 && hubIssues.length === 0;
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

      {hubIssues.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Issues</h3>
            <Badge variant="warning">{hubIssues.length}</Badge>
          </div>
          <ul className="grid items-start gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {hubIssues.map((issue) => (
              <li className="h-full rounded-xl border border-border bg-muted/40 px-3 py-3" key={issue.id}>
                <div className="flex min-w-0 items-start gap-3">
                  {issue.severity === 'error' ? (
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{issue.title}</p>
                    {issue.detail ? (
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{issue.detail}</p>
                    ) : null}
                    {issue.actions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issue.actions.map((action) => renderIssueAction(issue, action))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
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
            <p className="text-sm leading-5 text-muted-foreground">
              {issueCount > 0 ? (
                <>
                  <span className="font-medium tabular-nums text-foreground">{issueCount}</span>{' '}
                  structural issue{issueCount === 1 ? '' : 's'} — listed under Issues
                </>
              ) : (
                'No structural issues detected.'
              )}
            </p>
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

      <SkillRelinkDialog
        onOpenChange={(open) => {
          if (!open) {
            setRelinkTarget(null);
          }
        }}
        skillName={relinkTarget}
      />
    </section>
  );
}
