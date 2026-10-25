import { ChevronDown, FileCode, FileText, Search, X } from 'lucide-react';
import type { RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SkillFileEntry } from '@/types';

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

interface AssetFileTabsProps {
  openTabs: string[];
  activeTab: string;
  onSelectTab: (filePath: string) => void;
  onCloseTab: (filePath: string, event: React.MouseEvent) => void;
  nonDirectoryFiles: SkillFileEntry[];
  filteredFiles: SkillFileEntry[];
  isFilesMenuOpen: boolean;
  onToggleFilesMenu: () => void;
  filesMenuRef: RefObject<HTMLDivElement | null>;
  fileSearch: string;
  onFileSearchChange: (value: string) => void;
  onOpenFile: (filePath: string) => void;
}

export function AssetFileTabs({
  openTabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  nonDirectoryFiles,
  filteredFiles,
  isFilesMenuOpen,
  onToggleFilesMenu,
  filesMenuRef,
  fileSearch,
  onFileSearchChange,
  onOpenFile
}: AssetFileTabsProps) {
  return (
    <div className="relative mb-2 flex items-center justify-between border-b border-border pb-1">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
        <button
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors',
            activeTab === 'SKILL.md'
              ? 'bg-muted font-medium text-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
          onClick={() => onSelectTab('SKILL.md')}
          type="button"
        >
          <FileText className="size-3.5" />
          <span>SKILL.md</span>
          <span className="rounded bg-background/80 px-1 py-0.2 text-[10px] text-muted-foreground uppercase">
            Main
          </span>
        </button>

        {openTabs.map((filePath) => {
          const fileName = filePath.split('/').pop() ?? filePath;
          const isActive = activeTab === filePath;
          return (
            <div
              key={filePath}
              className={cn(
                'group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors',
                isActive
                  ? 'bg-muted font-medium text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <button
                className="flex max-w-44 items-center gap-1.5 truncate text-left"
                onClick={() => onSelectTab(filePath)}
                title={filePath}
                type="button"
              >
                <FileCode className="size-3.5 shrink-0" />
                <span className="truncate">{fileName}</span>
              </button>
              <button
                aria-label={`Close ${fileName}`}
                className="rounded p-0.5 text-muted-foreground opacity-70 hover:bg-background/80 hover:text-foreground hover:opacity-100"
                onClick={(e) => onCloseTab(filePath, e)}
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative shrink-0 pl-2" ref={filesMenuRef}>
        <Button
          className="h-7 gap-1 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
          onClick={onToggleFilesMenu}
          size="sm"
          type="button"
          variant="ghost"
        >
          <span>+ Files</span>
          <span className="text-[10px] text-muted-foreground">({nonDirectoryFiles.length})</span>
          <ChevronDown className="size-3" />
        </Button>

        {isFilesMenuOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-card p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                autoFocus
                className="h-8 pl-8 pr-2 text-xs font-mono"
                onChange={(e) => onFileSearchChange(e.target.value)}
                placeholder={`Search ${nonDirectoryFiles.length} files...`}
                value={fileSearch}
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredFiles.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No matching files</p>
              ) : (
                <ul className="grid gap-0.5">
                  {filteredFiles.map((file) => {
                    const isTabOpen = openTabs.includes(file.path);
                    const isCurrent = activeTab === file.path;
                    return (
                      <li key={file.path}>
                        <button
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs transition-colors',
                            isCurrent
                              ? 'bg-muted font-medium text-foreground'
                              : 'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                          )}
                          onClick={() => onOpenFile(file.path)}
                          type="button"
                        >
                          <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate" title={file.path}>
                            {file.path}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                          {isTabOpen ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary" title="Open in tab" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
