import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { Bot, Boxes, CloudUpload, MonitorSmartphone, Package, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { errorMessage, healthApi, libraryApi, securityApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format-time';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { HealthStatus, HealthSubsystem, HealthSubsystemId } from '@/types';
import { SkillRelinkDialog } from './library/SkillRelinkDialog';
import { HubIssueList } from './overview/HubIssueList';

const SUBSYSTEM_META: Record<HealthSubsystemId, { icon: LucideIcon; linkTo: string; linkLabel: string }> = {
  structure: { icon: Boxes, linkTo: '/setup', linkLabel: 'Open setup' },
  skills: { icon: Package, linkTo: '/library', linkLabel: 'Open Library' },
  editors: { icon: MonitorSmartphone, linkTo: '/integrations', linkLabel: 'Open Integrations' },
  sync: { icon: CloudUpload, linkTo: '/integrations', linkLabel: 'Open backup settings' },
  security: { icon: ShieldCheck, linkTo: '/library', linkLabel: 'Open Library' },
  ai: { icon: Bot, linkTo: '/settings', linkLabel: 'Open Settings' }
};

const STATUS_BADGE: Record<HealthStatus, { variant: 'success' | 'warning' | 'destructive' | 'default'; label: string }> = {
  healthy: { variant: 'success', label: 'Healthy' },
  warning: { variant: 'warning', label: 'Warning' },
  error: { variant: 'destructive', label: 'Error' },
  inactive: { variant: 'default', label: 'Not set up' }
};

function SubsystemCard({ subsystem }: { subsystem: HealthSubsystem }) {
  const meta = SUBSYSTEM_META[subsystem.id];
  const status = STATUS_BADGE[subsystem.status];
  const Icon = meta.icon;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
            {subsystem.label}
          </h3>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{subsystem.summary}</p>
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5">
          {subsystem.metrics.map((metric) => (
            <div className="flex items-baseline gap-1.5" key={metric.label}>
              <dt className="text-2xs text-muted-foreground">{metric.label}</dt>
              <dd className="truncate text-xs font-medium tabular-nums text-foreground" title={metric.value}>
                {metric.value}
              </dd>
            </div>
          ))}
          {subsystem.lastActivityAt ? (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-2xs text-muted-foreground">Last activity</dt>
              <dd
                className="truncate text-xs font-medium tabular-nums text-foreground"
                title={new Date(subsystem.lastActivityAt).toLocaleString()}
              >
                {formatRelativeTime(subsystem.lastActivityAt)}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
      <Link
        className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }), 'shrink-0 self-center')}
        to={meta.linkTo}
      >
        {meta.linkLabel}
      </Link>
    </li>
  );
}

export function HealthPage() {
  const queryClient = useQueryClient();
  const [relinkTarget, setRelinkTarget] = useState<string | null>(null);
  const health = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get()
  });

  function invalidateHealthData() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.health });
    void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    void queryClient.invalidateQueries({ queryKey: queryKeys.issues });
    void queryClient.invalidateQueries({ queryKey: queryKeys.library });
    void queryClient.invalidateQueries({ queryKey: queryKeys.skillUpdates });
  }

  const importAgentsSkills = useMutation({
    mutationFn: async () => {
      return libraryApi.migrateAgentsSkills({});
    },
    onSuccess: (result) => {
      const migrated = result.results.filter((item) => item.status === 'migrated').length;
      const skipped = result.results.filter((item) => item.status === 'skipped').length;
      const failed = result.results.filter((item) => item.status === 'failed').length;
      invalidateHealthData();
      toast.success(`Imported from ~/.agents: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
    },
    onError: () => {
      toast.error('Unable to import from ~/.agents/.skill-lock.json');
    }
  });

  const retryCheck = useMutation({
    mutationFn: async (name: string) => libraryApi.checkSkillUpdates({ name, force: true }),
    onSuccess: (result, name) => {
      invalidateHealthData();
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
      invalidateHealthData();
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
      invalidateHealthData();
      toast.success(`${name} is now a local, editable skill`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to unlink skill'));
    }
  });

  const removeScan = useMutation({
    mutationFn: async ({ kind, name }: { kind: string; name: string }) => securityApi.removeScan(kind, name),
    onSuccess: (_result, { kind, name }) => {
      invalidateHealthData();
      toast.success(`Removed stale scan record for ${kind}/${name}`);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to remove scan record'));
    }
  });

  if (health.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (health.isError || !health.data) {
    return <EmptyState description="The health report is temporarily unavailable." title="Unable to load health" />;
  }

  const report = health.data;
  const overall = STATUS_BADGE[report.status];
  const withIssues = report.subsystems.filter((subsystem) => subsystem.issues.length > 0);

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-8">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Health</h2>
          <Badge variant={overall.variant}>{overall.label}</Badge>
          <Button
            aria-label="Re-check all subsystems"
            className="ml-auto"
            loading={health.isFetching}
            onClick={() => void health.refetch()}
            size="sm"
            type="button"
            variant="secondary"
          >
            Re-check
          </Button>
        </div>
        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
          Status of every hub subsystem, grouped per area. Spot problems early and jump straight to where they are
          fixed.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <ul className="divide-y divide-border">
          {report.subsystems.map((subsystem) => (
            <SubsystemCard key={subsystem.id} subsystem={subsystem} />
          ))}
        </ul>
      </div>

      {withIssues.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
          No open issues; every subsystem is in good shape.
        </p>
      ) : (
        withIssues.map((subsystem) => (
          <HubIssueList
            importAgentsSkills={importAgentsSkills}
            issues={subsystem.issues}
            key={subsystem.id}
            onRelink={setRelinkTarget}
            removeScan={removeScan}
            retryCheck={retryCheck}
            retryUpdate={retryUpdate}
            title={`Open issues: ${subsystem.label}`}
            unlinkSkill={unlinkSkill}
          />
        ))
      )}

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
