import { ChevronDown, FolderTree } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AssetPackageFilesStripProps {
  fileCount: number;
  onOpenFileManager?: () => void;
  onToggleFilesMenu: () => void;
}

/** Compact "package files" hint shown above the editor for multi-file skills. */
export function AssetPackageFilesStrip({
  fileCount,
  onOpenFileManager,
  onToggleFilesMenu
}: AssetPackageFilesStripProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <FolderTree className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">Package files</span>
        <Badge variant="default">{fileCount}</Badge>
        <span className="hidden sm:inline text-muted-foreground">· Available as tabs in editor</span>
      </div>
      <div className="flex items-center gap-1.5">
        {onOpenFileManager ? (
          <Button
            className="h-6 px-2 text-xs"
            onClick={onOpenFileManager}
            size="sm"
            type="button"
            variant="secondary"
          >
            <FolderTree className="mr-1 size-3" />
            Files in sidebar
          </Button>
        ) : null}
        <Button
          className="h-6 px-2 text-xs"
          onClick={onToggleFilesMenu}
          size="sm"
          type="button"
          variant="ghost"
        >
          Browse files <ChevronDown className="ml-1 size-3" />
        </Button>
      </div>
    </div>
  );
}
