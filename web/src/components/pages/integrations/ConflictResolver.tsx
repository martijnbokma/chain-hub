import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { errorMessage, syncApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { ResolveConflictsInput, SyncStatus } from '@/types';

type Choice = 'local' | 'remote' | 'manual';

export function ConflictResolver({ status }: { status: SyncStatus }) {
  const queryClient = useQueryClient();
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const resolve = useMutation({
    mutationFn: (input: ResolveConflictsInput) => syncApi.resolve(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus });
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
