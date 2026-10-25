import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Cloud, CloudOff, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { errorMessage, syncApi } from '@/lib/api';
import type { ResolveConflictsInput, SyncConnectInput, SyncStatus } from '@/types';

function formatSyncTime(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
}

type Choice = 'local' | 'remote' | 'manual';

function ConflictResolver({ status }: { status: SyncStatus }) {
  const queryClient = useQueryClient();
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const resolve = useMutation({
    mutationFn: (input: ResolveConflictsInput) => syncApi.resolve(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      toast.success('Merge finished and pushed');
      if (result.conflicts.length > 0) {
        toast.info(`${result.conflicts.length} conflict(s) left`);
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to resolve conflicts'));
    }
  });

  const unresolved = status.conflicts.filter((conflict) => !choices[conflict.path]);

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <TriangleAlert aria-hidden="true" className="size-4 text-muted-foreground" />
        <p className="text-xs leading-5 text-pretty text-muted-foreground">
          The same files changed on two machines. Pick a version per file, or edit the files
          yourself and choose “I edited it”.
        </p>
      </div>
      <ul className="grid gap-2">
        {status.conflicts.map((conflict) => {
          const choice = choices[conflict.path];
          return (
            <li className="flex flex-wrap items-center justify-between gap-2" key={conflict.path}>
              <code className="break-all font-mono text-xs text-foreground">{conflict.path}</code>
              <div className="flex items-center gap-1.5">
                {(['local', 'remote', 'manual'] as const).map((option) => (
                  <Button
                    key={option}
                    onClick={() => setChoices((current) => ({ ...current, [conflict.path]: option }))}
                    size="sm"
                    type="button"
                    variant={choice === option ? 'secondary' : 'ghost'}
                  >
                    {option === 'local' ? 'Keep local' : option === 'remote' ? 'Keep remote' : 'I edited it'}
                  </Button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" role="status">
          {unresolved.length > 0 ? `${unresolved.length} file(s) still need a choice` : 'Ready to finish the merge'}
        </p>
        <Button
          loading={resolve.isPending}
          onClick={() =>
            resolve.mutate({
              resolutions: status.conflicts.map((conflict) => ({
                path: conflict.path,
                strategy: choices[conflict.path] ?? 'local'
              }))
            })
          }
          disabled={unresolved.length > 0}
          size="sm"
        >
          {resolve.isPending ? 'Finishing…' : 'Finish merge'}
        </Button>
      </div>
    </div>
  );
}

function ConnectSyncDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<'gh' | 'pat'>('gh');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [adoptPrompt, setAdoptPrompt] = useState<string | null>(null);

  const connect = useMutation({
    mutationFn: (input: SyncConnectInput) => syncApi.connect(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      toast.success(
        result.conflicts.length > 0
          ? 'Connected — resolve the listed conflicts to finish'
          : `Connected to ${result.remote?.repo ?? 'GitHub'}`
      );
      onOpenChange(false);
    },
    onError: (error) => {
      const message = errorMessage(error, 'Unable to connect');
      // The API asks for explicit confirmation to take over an unknown repo.
      if (/adopt/i.test(message)) {
        setAdoptPrompt(message);
        return;
      }
      toast.error(message);
    }
  });

  const submit = (adopt = false) => {
    connect.mutate({
      method,
      repo: repo.trim() || undefined,
      token: method === 'pat' ? token.trim() : undefined,
      adopt: adopt || undefined
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect GitHub backup</DialogTitle>
          <DialogDescription>
            Your hub syncs to a private GitHub repo — secrets and logs never leave this machine.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sync-method">
              Sign in with
            </label>
            <Select
              id="sync-method"
              onChange={(event) => setMethod(event.target.value as 'gh' | 'pat')}
              value={method}
            >
              <option value="gh">GitHub CLI (gh) — recommended</option>
              <option value="pat">Personal access token</option>
            </Select>
          </div>
          {method === 'pat' ? (
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="sync-token">
                Fine-grained access token
              </label>
              <Input
                autoComplete="off"
                id="sync-token"
                onChange={(event) => setToken(event.target.value)}
                placeholder="github_pat_…"
                type="password"
                value={token}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Needs Contents: read/write on the sync repo, plus Administration: write so Chain
                Hub can create it.
              </p>
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              Uses the token `gh` already stores on this machine. Run `gh auth login` first if it
              isn’t signed in.
            </p>
          )}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="sync-repo">
              Repo name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="sync-repo"
              onChange={(event) => setRepo(event.target.value)}
              placeholder="chain-hub-sync"
              value={repo}
            />
          </div>
          {adoptPrompt ? (
            <div className="grid gap-2 rounded-lg border border-border bg-background p-3" role="alert">
              <p className="text-xs leading-5 text-pretty text-muted-foreground">{adoptPrompt}</p>
              <Button
                loading={connect.isPending}
                onClick={() => submit(true)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Take over this repo
              </Button>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={method === 'pat' && !token.trim()}
            loading={connect.isPending}
            onClick={() => submit()}
            type="button"
          >
            {connect.isPending ? 'Connecting…' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CloudBackupCard() {
  const [connectOpen, setConnectOpen] = useState(false);
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['sync-status'], queryFn: () => syncApi.status() });

  const syncNow = useMutation({
    mutationFn: () => syncApi.now(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      toast.success(
        result.conflicts.length > 0 ? 'Merge conflict — pick a version per file below' : 'Hub synced to GitHub'
      );
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      toast.error(errorMessage(error, 'Sync failed'));
    }
  });

  const disconnect = useMutation({
    mutationFn: () => syncApi.disconnect(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sync-status'] });
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
                <p className="text-xs text-muted-foreground">
                  Last sync: {formatSyncTime(data.lastSyncAt)}
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
                    {data.uncommitted > 0 ? <Badge variant="default">{data.uncommitted} unsaved</Badge> : null}
                    {data.ahead > 0 ? <Badge variant="default">↑ {data.ahead}</Badge> : null}
                    {data.behind > 0 ? <Badge variant="default">↓ {data.behind}</Badge> : null}
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
