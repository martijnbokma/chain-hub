import type { RefObject } from 'react';
import { FolderOpen, Search, ShieldAlert, ShieldCheck } from 'lucide-react';

import type { SecurityScanRecord, SecurityScanReport } from '@chain-hub/contracts';

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
import { ScanFindingsList } from './ScanFindings';
import type { BrowsedSkillFolder } from './skill-folder-upload';
import { REPO_ROOT_DIR } from './use-library-install-flow';

export interface PreviewScan {
  label: string;
  scan: SecurityScanRecord;
}

/** Note when the gate's AI layer was unreachable — the verdict shown came from static rules only. */
function AiReviewNote({ scans }: { scans: PreviewScan[] }) {
  const messages = [
    ...new Set(scans.map((entry) => entry.scan.aiError).filter((message): message is string => Boolean(message)))
  ];
  if (messages.length === 0) {
    return null;
  }
  return (
    <p className="text-xs text-muted-foreground">
      AI review did not run{messages.length === 1 ? `: ${messages[0]}` : ''}. The result comes from the local
      rules engine only.
    </p>
  );
}

/** Pre-install scan results, one report per scan target — lets the user review findings before installing. */
function PreviewScanSection({ scans }: { scans: PreviewScan[] }) {
  const failed = scans.filter((entry) => entry.scan.verdict === 'fail');
  const warned = scans.filter((entry) => entry.scan.verdict === 'warn');
  const flagged = scans.filter((entry) => entry.scan.verdict !== 'pass');

  if (failed.length === 0 && warned.length === 0) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 p-3" role="status">
          <ShieldCheck className="size-4 text-success-foreground" aria-hidden />
          <span className="text-sm">
            Security scan found no risky patterns
            {scans.length > 1 ? ` in ${scans.length} skills` : ''}
          </span>
        </div>
        <AiReviewNote scans={scans} />
      </div>
    );
  }

  const blocked = failed.length > 0;
  return (
    <div
      className={`grid gap-2 rounded-lg border p-3 ${
        blocked ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'
      }`}
      role={blocked ? 'alert' : 'status'}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert
          className={`size-4 ${blocked ? 'text-destructive' : 'text-warning-foreground'}`}
          aria-hidden
        />
        <span className="text-sm font-medium">
          {blocked
            ? `Security scan will block ${failed.map((entry) => entry.label).join(', ')}`
            : `Security scan flagged ${warned.map((entry) => entry.label).join(', ')}`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {blocked
          ? 'Installing is stopped unless you explicitly allow it. Check the flagged files and install only if you trust the source.'
          : 'Nothing is blocked. These patterns also appear in legitimate files, so check the flagged files in the source before installing.'}
      </p>
      {flagged.map(({ label, scan }) => (
        <div className="grid gap-2" key={label}>
          {flagged.length > 1 ? <span className="font-mono text-[11px] text-muted-foreground">{label}</span> : null}
          <ScanFindingsList findings={scan.findings} />
        </div>
      ))}
      <AiReviewNote scans={scans} />
    </div>
  );
}

/** Grouped findings list shown when the security gate blocked an install. */
function BlockedScanSection({ labels, scan }: { labels: string[]; scan: SecurityScanReport }) {
  return (
    <div className="grid gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3" role="alert">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-destructive" aria-hidden />
        <span className="text-sm font-medium">
          Security scan flagged {labels.length > 0 ? labels.join(', ') : 'this skill'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        An automated check found patterns that are also used by harmful skills. Check the flagged files and
        install only if you trust the source; the override is recorded.
      </p>
      <ScanFindingsList findings={scan.findings} />
    </div>
  );
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
  /** Pre-install security scan reports, one per resolved target (empty until Security scan runs). */
  previewScans: PreviewScan[];
  onSecurityScan: () => void;
  isSecurityScanning: boolean;
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
  isScanning,
  previewScans,
  onSecurityScan,
  isSecurityScanning
}: InstallSkillDialogProps) {
  const installCount = repoPickerActive ? selectedDirs.length : 1;
  const singleDirScanned =
    installMode === 'repo' && scanOptions.length === 1 && scanOptions[0] !== REPO_ROOT_DIR;
  const previewBlocked = previewScans.some((entry) => entry.scan.verdict === 'fail');
  const securityScanDisabled =
    installMode === 'path'
      ? !browsedFolder && installPath.trim().length === 0
      : installRepo.trim().length === 0 || (repoPickerActive && selectedDirs.length === 0);
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
                    {scanOptions.length} skills found. Select which to install
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
                    Leave empty to auto-detect SKILL.md in the repo root or subfolders, or use Scan to pick from a
                    list.
                  </p>
                </label>
              )}
              {singleDirScanned ? (
                <p className="text-xs text-muted-foreground">
                  Found one skill in the repo; filled it in as Subdir.
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
            <BlockedScanSection labels={blockedLabels} scan={blockedScan} />
          ) : previewScans.length > 0 ? (
            <PreviewScanSection scans={previewScans} />
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button loading={isMigrating} onClick={onMigrate} variant="secondary">
            {isMigrating ? 'Migrating…' : 'Migrate from agents lock'}
          </Button>
          <Button
            disabled={securityScanDisabled}
            loading={isSecurityScanning}
            onClick={onSecurityScan}
            variant="secondary"
          >
            <ShieldCheck className="size-4" />
            {isSecurityScanning ? 'Scanning…' : 'Security scan'}
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          {blockedScan || previewBlocked ? (
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
