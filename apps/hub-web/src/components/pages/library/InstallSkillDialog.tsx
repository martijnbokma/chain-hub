import type { RefObject } from 'react';
import { FolderOpen, Search, ShieldAlert } from 'lucide-react';

import type { SecurityScanFinding, SecurityScanReport, SecurityScanSeverity } from '@chain-hub/contracts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BrowsedSkillFolder } from './skill-folder-upload';
import { REPO_ROOT_DIR } from './use-library-install-flow';

/** Collapse repeated hits of the same rule into one row listing every file it touched, worst severity first. */
function groupScanFindings(findings: SecurityScanReport['findings']) {
  const rank: Record<SecurityScanSeverity, number> = { high: 0, medium: 1, low: 2 };
  const groups = new Map<
    string,
    { severity: SecurityScanSeverity; title: string; detail: string; files: string[] }
  >();
  for (const finding of findings) {
    const key = `${finding.severity}:${finding.ruleId}`;
    const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ''}` : null;
    const group = groups.get(key);
    if (group) {
      if (location && !group.files.includes(location)) {
        group.files.push(location);
      }
    } else {
      groups.set(key, {
        severity: finding.severity,
        title: finding.title,
        detail: finding.detail,
        files: location ? [location] : []
      });
    }
  }
  return [...groups.values()].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

interface InstallSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installMode: 'path' | 'repo';
  onInstallModeChange: (mode: 'path' | 'repo') => void;
  installPath: string;
  onInstallPathChange: (value: string) => void;
  installRepo: string;
  onInstallRepoChange: (value: string) => void;
  installSubdir: string;
  onInstallSubdirChange: (value: string) => void;
  installName: string;
  onInstallNameChange: (value: string) => void;
  installForce: boolean;
  onInstallForceChange: (value: boolean) => void;
  browsedFolder: BrowsedSkillFolder | null;
  folderInputRef: RefObject<HTMLInputElement | null>;
  onBrowseFiles: (fileList: FileList) => void;
  onSubmit: (allowUnsafe?: boolean) => void;
  isInstalling: boolean;
  submitDisabled: boolean;
  blockedScan: SecurityScanReport | null;
  /** Names of the skills the scan blocked (usually one, more in a multi-install batch). */
  blockedLabels: string[];
  onMigrate: () => void;
  isMigrating: boolean;
  /** Dirs found by Scan: `''` entries mean the repo root itself. */
  scanOptions: string[];
  repoPickerActive: boolean;
  selectedDirs: string[];
  onToggleDir: (dir: string) => void;
  onScanRepo: () => void;
  isScanning: boolean;
}

export function InstallSkillDialog({
  open,
  onOpenChange,
  installMode,
  onInstallModeChange,
  installPath,
  onInstallPathChange,
  installRepo,
  onInstallRepoChange,
  installSubdir,
  onInstallSubdirChange,
  installName,
  onInstallNameChange,
  installForce,
  onInstallForceChange,
  browsedFolder,
  folderInputRef,
  onBrowseFiles,
  onSubmit,
  isInstalling,
  submitDisabled,
  blockedScan,
  blockedLabels,
  onMigrate,
  isMigrating,
  scanOptions,
  repoPickerActive,
  selectedDirs,
  onToggleDir,
  onScanRepo,
  isScanning
}: InstallSkillDialogProps) {
  const installCount = repoPickerActive ? selectedDirs.length : 1;
  const singleDirScanned =
    installMode === 'repo' && scanOptions.length === 1 && scanOptions[0] !== REPO_ROOT_DIR;
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Install skill</DialogTitle>
          <DialogDescription>
            Install into the hub from a local folder or git repo, then project to Claude, Cursor, and other editors.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs
            onValueChange={(value) => onInstallModeChange(value as 'path' | 'repo')}
            value={installMode}
          >
            <TabsList>
              <TabsTrigger value="path">Local path</TabsTrigger>
              <TabsTrigger value="repo">Git repo</TabsTrigger>
            </TabsList>
          </Tabs>
          {installMode === 'path' ? (
            <div className="grid gap-2">
              <span className="text-sm text-muted-foreground">Skill directory</span>
              <div className="flex gap-2">
                <Input
                  onChange={(event) => onInstallPathChange(event.target.value)}
                  placeholder="/Users/you/www/skills/my-skill"
                  value={browsedFolder ? `${browsedFolder.label} (${browsedFolder.files.length} files)` : installPath}
                />
                <Button
                  className="shrink-0"
                  onClick={() => folderInputRef.current?.click()}
                  type="button"
                  variant="secondary"
                >
                  <FolderOpen className="size-4" />
                  Browse
                </Button>
                <input
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    const list = event.target.files;
                    if (!list || list.length === 0) {
                      return;
                    }
                    onBrowseFiles(list);
                  }}
                  ref={(element) => {
                    folderInputRef.current = element;
                    if (element) {
                      element.setAttribute('webkitdirectory', '');
                      element.setAttribute('directory', '');
                    }
                  }}
                  type="file"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Browse selects a folder and uploads it to the hub. You can still paste an absolute server path instead.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <span className="text-sm text-muted-foreground">Repository URL</span>
                <div className="flex gap-2">
                  <Input
                    onChange={(event) => onInstallRepoChange(event.target.value)}
                    placeholder="https://github.com/org/skills.git"
                    value={installRepo}
                  />
                  <Button
                    className="shrink-0"
                    disabled={installRepo.trim().length === 0}
                    loading={isScanning}
                    onClick={onScanRepo}
                    type="button"
                    variant="secondary"
                  >
                    <Search className="size-4" />
                    {isScanning ? 'Scanning…' : 'Scan'}
                  </Button>
                </div>
              </div>
              {repoPickerActive ? (
                <div className="grid gap-2">
                  <span className="text-sm text-muted-foreground">
                    {scanOptions.length} skills found — select which to install
                  </span>
                  <ul className="grid max-h-52 gap-0.5 overflow-y-auto rounded-md border border-border p-1">
                    {scanOptions.map((dir) => (
                      <li key={dir || '__root__'}>
                        <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted">
                          <Checkbox
                            checked={selectedDirs.includes(dir)}
                            onCheckedChange={() => onToggleDir(dir)}
                          />
                          <span className="font-mono text-xs">{dir || '(repo root)'}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    {selectedDirs.length} of {scanOptions.length} selected
                  </p>
                </div>
              ) : (
                <label className="grid gap-2">
                  <span className="text-sm text-muted-foreground">Subdir (optional)</span>
                  <Input
                    onChange={(event) => onInstallSubdirChange(event.target.value)}
                    placeholder="e.g. plugin/skills/my-skill"
                    value={installSubdir}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-detect SKILL.md in the repo root or subfolders — or use Scan to pick from a
                    list.
                  </p>
                </label>
              )}
              {singleDirScanned ? (
                <p className="text-xs text-muted-foreground">
                  Found one skill in the repo — filled it in as Subdir.
                </p>
              ) : null}
              {scanOptions.length === 1 && scanOptions[0] === REPO_ROOT_DIR ? (
                <p className="text-xs text-muted-foreground">Found SKILL.md at the repo root.</p>
              ) : null}
            </>
          )}
          {installCount === 1 ? (
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Name override (optional)</span>
              <Input onChange={(event) => onInstallNameChange(event.target.value)} value={installName} />
            </label>
          ) : null}
          <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <Checkbox
              checked={installForce}
              id="install-force"
              onCheckedChange={(checked) => onInstallForceChange(Boolean(checked))}
            />
            <span>Replace if the skill already exists in the hub</span>
          </label>
          {blockedScan ? (
            <div className="grid gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alert">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-destructive" aria-hidden />
                <span className="text-sm font-medium">
                  Security scan flagged {blockedLabels.length > 0 ? blockedLabels.join(', ') : 'this skill'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                An automated check found patterns that are also used by harmful skills. The same patterns show up in
                legitimate files, so treat this as a prompt to review rather than a verdict: check the flagged files
                in the repo and install only if you trust the source. The override is recorded on the scan record.
              </p>
              <ul className="grid gap-2">
                {groupScanFindings(blockedScan.findings).map((group) => (
                  <li className="flex items-start gap-2 text-xs" key={`${group.severity}-${group.title}`}>
                    <Badge variant={group.severity === 'high' ? 'destructive' : 'warning'}>{group.severity}</Badge>
                    <span className="min-w-0">
                      <span className="font-medium">{group.title}</span>
                      <span className="block text-muted-foreground">{group.detail}</span>
                      {group.files.length > 0 ? (
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {group.files.join(', ')}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button loading={isMigrating} onClick={onMigrate} variant="secondary">
            {isMigrating ? 'Migrating…' : 'Migrate from agents lock'}
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          {blockedScan ? (
            <Button loading={isInstalling} onClick={() => onSubmit(true)} variant="destructive">
              {isInstalling ? 'Installing…' : 'Install anyway'}
            </Button>
          ) : (
            <Button disabled={submitDisabled} loading={isInstalling} onClick={() => onSubmit()}>
              {isInstalling ? 'Installing…' : installCount > 1 ? `Install ${installCount} skills` : 'Install'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
