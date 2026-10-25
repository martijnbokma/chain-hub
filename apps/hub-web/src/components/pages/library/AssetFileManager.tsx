import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileText,
  Folder,
  FolderTree,
  Search,
  Table,
  X
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AssetKind, SkillFileEntry } from '@/types';

interface AssetFileManagerProps {
  assetName: string;
  assetKind: AssetKind;
  files: SkillFileEntry[];
  activeFile: string;
  onSelectFile: (filePath: string) => void;
  onBackToAssets: () => void;
  provenanceSource?: string | null;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt')) {
    return FileText;
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    return Table;
  }
  if (
    lower.endsWith('.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.toml') ||
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.sh')
  ) {
    return FileCode;
  }
  return File;
}

interface FileTreeGroup {
  folder: string;
  files: SkillFileEntry[];
}

function FileRowButton({
  file,
  label,
  isCurrent,
  onSelectFile,
  className
}: {
  file: SkillFileEntry;
  label: string;
  isCurrent: boolean;
  onSelectFile: (filePath: string) => void;
  className?: string;
}) {
  const Icon = getFileIcon(file.path);
  return (
    <button
      aria-selected={isCurrent}
      className={cn(
        'group flex w-full items-center justify-between gap-2 rounded-lg py-1.5 text-left text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isCurrent
          ? 'border border-border/70 bg-muted font-medium text-foreground shadow-xs'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        className
      )}
      onClick={() => onSelectFile(file.path)}
      title={file.path}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn('size-3.5 shrink-0', isCurrent ? 'text-primary' : 'text-muted-foreground')} />
        <span className="truncate font-mono">{label}</span>
      </div>
      <span className="font-mono text-3xs text-muted-foreground shrink-0">
        {formatFileSize(file.size)}
      </span>
    </button>
  );
}

export function AssetFileManager({
  assetName,
  assetKind,
  files,
  activeFile,
  onSelectFile,
  onBackToAssets
}: AssetFileManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const nonDirectoryFiles = useMemo(
    () => files.filter((f) => !f.isDirectory),
    [files]
  );

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return nonDirectoryFiles;
    return nonDirectoryFiles.filter((f) => f.path.toLowerCase().includes(q));
  }, [nonDirectoryFiles, searchQuery]);

  // Group filtered files into root and folder groups
  const { rootFiles, folderGroups } = useMemo(() => {
    const root: SkillFileEntry[] = [];
    const groupsMap = new Map<string, SkillFileEntry[]>();

    for (const file of filteredFiles) {
      const parts = file.path.split('/');
      if (parts.length === 1) {
        root.push(file);
      } else {
        const folder = parts.slice(0, -1).join('/');
        const existing = groupsMap.get(folder);
        if (existing) {
          existing.push(file);
        } else {
          groupsMap.set(folder, [file]);
        }
      }
    }

    const groups: FileTreeGroup[] = Array.from(groupsMap.entries())
      .map(([folder, groupFiles]) => ({ folder, files: groupFiles }))
      .sort((a, b) => a.folder.localeCompare(b.folder));

    return { rootFiles: root, folderGroups: groups };
  }, [filteredFiles]);

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  const isSkill = assetKind === 'skills';
  const mainFileName = isSkill ? 'SKILL.md' : `${assetName}.md`;
  const isMainActive = activeFile === 'SKILL.md' || activeFile === mainFileName;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      {/* Top navigation row */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
        <Button
          aria-label="Back to assets"
          className="-ml-2 h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={onBackToAssets}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="size-3.5" />
          <span>Assets</span>
          <kbd className="ml-1 hidden rounded border border-border/80 bg-muted px-1 py-0.2 font-mono text-3xs text-muted-foreground sm:inline-block">
            Esc
          </kbd>
        </Button>

        <div className="flex items-center gap-1.5">
          <Badge className="text-2xs" variant="accent">
            {assetKind}
          </Badge>
          <Badge className="text-2xs" variant="default">
            {nonDirectoryFiles.length + 1} files
          </Badge>
        </div>
      </div>

      {/* Asset title and file manager search */}
      <div className="shrink-0 space-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-sm font-semibold tracking-tight text-foreground" title={assetName}>
            {assetName}
          </h2>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter files"
            className="h-8 rounded-lg pl-8 pr-7 text-xs"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files…"
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Scrollable file list */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto space-y-3 pr-1">
        {/* Main entrypoint file (SKILL.md) */}
        <div className="space-y-1">
          <p className="px-2 text-3xs font-medium uppercase tracking-wider text-muted-foreground">
            Main file
          </p>
          <button
            aria-selected={isMainActive}
            className={cn(
              'group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isMainActive
                ? 'border border-border/70 bg-muted font-medium text-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
            onClick={() => onSelectFile('SKILL.md')}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-2">
              <FileText className={cn('size-4 shrink-0', isMainActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="truncate font-mono font-medium">{mainFileName}</span>
            </div>
            <span className="rounded bg-background/80 px-1.5 py-0.5 text-3xs font-medium text-muted-foreground uppercase">
              Entry
            </span>
          </button>
        </div>

        {/* Package files / sidecars */}
        {nonDirectoryFiles.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-3xs font-medium uppercase tracking-wider text-muted-foreground">
                Package files ({filteredFiles.length})
              </p>
            </div>

            {filteredFiles.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No files match “{searchQuery}”
              </p>
            ) : null}

            {/* Root files */}
            {rootFiles.length > 0 ? (
              <div className="space-y-0.5">
                {rootFiles.map((file) => (
                  <FileRowButton
                    className="px-2.5"
                    file={file}
                    isCurrent={activeFile === file.path}
                    key={file.path}
                    label={file.path}
                    onSelectFile={onSelectFile}
                  />
                ))}
              </div>
            ) : null}

            {/* Folder groups */}
            {folderGroups.map(({ folder, files: groupFiles }) => {
              const isCollapsed = Boolean(collapsedFolders[folder]);
              const hasActiveFile = groupFiles.some((f) => f.path === activeFile);

              return (
                <div className="space-y-0.5" key={folder}>
                  <button
                    className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => toggleFolder(folder)}
                    type="button"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="size-3.5 shrink-0" />
                    )}
                    <Folder className={cn('size-3.5 shrink-0', hasActiveFile ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="truncate font-mono text-xs font-medium">{folder}/</span>
                    <span className="text-3xs text-muted-foreground">({groupFiles.length})</span>
                  </button>

                  {!isCollapsed ? (
                    <div className="ml-3 border-l border-border/70 pl-2 space-y-0.5">
                      {groupFiles.map((file) => (
                        <FileRowButton
                          className="px-2"
                          file={file}
                          isCurrent={activeFile === file.path}
                          key={file.path}
                          label={file.path.split('/').pop() ?? file.path}
                          onSelectFile={onSelectFile}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
