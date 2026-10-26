import type { useMutation } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import type { libraryApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { HubIssue, HubIssueAction } from '@/types';

type NameMutation = ReturnType<typeof useMutation<Awaited<ReturnType<typeof libraryApi.checkSkillUpdates>>, Error, string>>;
type UpdateMutation = ReturnType<typeof useMutation<Awaited<ReturnType<typeof libraryApi.updateSkills>>, Error, string>>;
type UnlinkMutation = ReturnType<typeof useMutation<Awaited<ReturnType<typeof libraryApi.unlinkSkill>>, Error, string>>;
type ImportMutation = ReturnType<typeof useMutation<Awaited<ReturnType<typeof libraryApi.migrateAgentsSkills>>, Error, void>>;

interface IssueActionsProps {
  issue: HubIssue;
  retryCheck: NameMutation;
  retryUpdate: UpdateMutation;
  unlinkSkill: UnlinkMutation;
  importAgentsSkills: ImportMutation;
  onRelink: (name: string) => void;
}

function IssueAction({
  issue,
  action,
  retryCheck,
  retryUpdate,
  unlinkSkill,
  importAgentsSkills,
  onRelink
}: IssueActionsProps & { action: HubIssueAction }) {
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
          onClick={() => onRelink(name)}
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

export function HubIssueList({
  issues,
  ...actions
}: IssueActionsProps extends never ? never : Omit<IssueActionsProps, 'issue'> & { issues: HubIssue[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Issues</h3>
        <Badge variant="warning">{issues.length}</Badge>
      </div>
      <ul className="grid items-start gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {issues.map((issue) => (
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
                    {issue.actions.map((action) => (
                      <IssueAction action={action} issue={issue} key={action} {...actions} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
