import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, FolderGit2, Link2, Unlink } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage, libraryApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SkillRelinkDialogProps {
  /** Skill to relink; `null` closes the dialog. */
  skillName: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Repair flow for git-locked skills whose recorded subdir no longer contains a
 * SKILL.md: scans the source repo for skill folders and lets the user repoint,
 * or keep the hub copy by unlinking it from upstream.
 */
export function SkillRelinkDialog({ skillName, onOpenChange }: SkillRelinkDialogProps) {
  const queryClient = useQueryClient();
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  const upstreamDirs = useQuery({
    queryKey: ['library', 'skill-upstream-dirs', skillName],
    queryFn: () => libraryApi.getSkillUpstreamDirs(skillName ?? ''),
    enabled: skillName !== null
  });

  useEffect(() => {
    setSelectedDir(null);
  }, [skillName]);

  function invalidateAfterChange() {
    void queryClient.invalidateQueries({ queryKey: ['library'] });
    void queryClient.invalidateQueries({ queryKey: ['library', 'skill-updates'] });
    void queryClient.invalidateQueries({ queryKey: ['issues'] });
    void queryClient.invalidateQueries({ queryKey: ['overview'] });
  }

  const relink = useMutation({
    mutationFn: async (subdir: string) => libraryApi.relinkSkill(skillName ?? '', subdir),
    onSuccess: (result) => {
      invalidateAfterChange();
      toast.success(`Relinked ${result.asset.name} to ${result.lockEntry.subdir ?? 'repo root'}`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to relink skill'));
    }
  });

  const unlink = useMutation({
    mutationFn: async () => libraryApi.unlinkSkill(skillName ?? ''),
    onSuccess: () => {
      invalidateAfterChange();
      toast.success(`${skillName} is now a local, editable skill`);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to unlink skill'));
    }
  });

  const dirs = upstreamDirs.data?.dirs ?? [];
  const currentSubdir = upstreamDirs.data?.currentSubdir;

  return (
    <Dialog onOpenChange={onOpenChange} open={skillName !== null}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Relink {skillName}</DialogTitle>
          <DialogDescription>
            The recorded skill folder no longer exists upstream. Pick the folder that contains its
            SKILL.md now, or keep the current hub copy.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {upstreamDirs.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ) : upstreamDirs.isError ? (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-destructive">
              {errorMessage(upstreamDirs.error, 'Could not scan the source repository')}
            </p>
          ) : dirs.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              <p className="text-foreground">No SKILL.md found in {upstreamDirs.data?.repo}.</p>
              <p className="mt-1">
                The skill was removed upstream. Keep the current hub copy as a local skill, or remove
                it from the Library.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">
                Skill folders in <span className="break-all font-mono">{upstreamDirs.data?.repo}</span>
              </p>
              <ul className="grid max-h-64 gap-2 overflow-y-auto">
                {dirs.map((dir) => {
                  const isCurrent = dir === currentSubdir;
                  const isSelected = dir === selectedDir;
                  return (
                    <li key={dir}>
                      <button
                        className={cn(
                          'flex w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left text-sm transition-colors',
                          'hover:border-primary/25 hover:bg-muted/60',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected && 'border-primary/40 bg-primary/5 ring-1 ring-primary/15'
                        )}
                        onClick={() => setSelectedDir(dir)}
                        type="button"
                      >
                        <FolderGit2 className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                          {dir}
                        </span>
                        {isCurrent ? (
                          <span className="shrink-0 text-2xs text-muted-foreground">current</span>
                        ) : null}
                        {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          <Button
            loading={unlink.isPending}
            onClick={() => unlink.mutate()}
            type="button"
            variant="ghost"
          >
            <Unlink className="size-4" />
            Keep local copy
          </Button>
          <Button
            disabled={!selectedDir || selectedDir === currentSubdir}
            loading={relink.isPending}
            onClick={() => selectedDir && relink.mutate(selectedDir)}
            type="button"
          >
            <Link2 className="size-4" />
            {relink.isPending ? 'Relinking…' : 'Relink to folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
