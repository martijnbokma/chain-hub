import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { libraryApi } from '@/lib/api';

interface SkillFilePreviewDialogProps {
  skillName: string | null;
  path: string | null;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SkillFilePreviewDialog({ skillName, path, onOpenChange }: SkillFilePreviewDialogProps) {
  const open = skillName !== null && path !== null;

  const fileQuery = useQuery({
    queryKey: ['library', 'skill-file', skillName, path],
    queryFn: () => libraryApi.getSkillFile(skillName as string, path as string),
    enabled: open
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{path}</DialogTitle>
          <DialogDescription>
            Read-only preview — this file isn't editable from Chain Hub yet.
            {fileQuery.data ? ` ${formatBytes(fileQuery.data.size)}` : null}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {fileQuery.isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : null}
          {fileQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load this file.</p>
          ) : null}
          {fileQuery.data ? (
            <>
              {fileQuery.data.truncated ? (
                <p className="mb-2 text-xs text-warning-foreground">
                  File is larger than 1 MB — showing the first part only.
                </p>
              ) : null}
              <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-5 whitespace-pre-wrap">
                {fileQuery.data.content}
              </pre>
            </>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
