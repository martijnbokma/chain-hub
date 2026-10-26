import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
import { queryKeys } from '@/lib/query-keys';
import type { SyncConnectInput } from '@/types';

export function ConnectSyncDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<'gh' | 'pat'>('gh');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [adoptPrompt, setAdoptPrompt] = useState<string | null>(null);

  const connect = useMutation({
    mutationFn: (input: SyncConnectInput) => syncApi.connect(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
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
