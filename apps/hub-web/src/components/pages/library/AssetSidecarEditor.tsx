import React, { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownSourceEditor } from '@/components/common/MarkdownSourceEditor';

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

interface AssetSidecarEditorProps {
  activeTab: string;
  data: { content: string; size: number; truncated?: boolean } | undefined;
  isLoading: boolean;
  isError: boolean;
  onBack: () => void;
}

/** Read-only sidecar file viewer (files other than SKILL.md). */
export function AssetSidecarEditor({ activeTab, data, isLoading, isError, onBack }: AssetSidecarEditorProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 truncate">
          <Badge className="text-[10px] uppercase tracking-wider" variant="default">
            Read-only
          </Badge>
          <span className="truncate font-mono font-medium text-foreground">{activeTab}</span>
          {data ? <span>({formatFileSize(data.size)})</span> : null}
          {data?.truncated ? (
            <span className="font-medium text-warning-foreground">· Truncated (&gt;1 MB)</span>
          ) : null}
        </div>
        <Button className="h-6 px-2 text-xs" onClick={onBack} size="sm" type="button" variant="ghost">
          <ArrowLeft className="mr-1 size-3" /> Back to SKILL.md
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {isLoading ? (
          <Skeleton className="h-full min-h-50 w-full" />
        ) : isError ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
            Unable to load file content.
          </div>
        ) : (
          <Suspense fallback={<Skeleton className="h-full min-h-50 w-full" />}>
            <MarkdownSourceEditor
              aria-label={`View sidecar ${activeTab}`}
              onChange={() => {}}
              readOnly={true}
              value={data?.content ?? ''}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
