import { File, FileCode, FileText, Table } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SkillFileEntry } from '@/types';

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

export function FileRowButton({
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
