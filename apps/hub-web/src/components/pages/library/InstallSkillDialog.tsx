import type { RefObject } from 'react';
import { FolderOpen } from 'lucide-react';

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
import type { BrowsedSkillFolder } from './asset-helpers';

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
  onSubmit: () => void;
  isInstalling: boolean;
  submitDisabled: boolean;
  onMigrate: () => void;
  isMigrating: boolean;
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
  onMigrate,
  isMigrating
}: InstallSkillDialogProps) {
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
              <label className="grid gap-2">
                <span className="text-sm text-muted-foreground">Repository URL</span>
                <Input
                  onChange={(event) => onInstallRepoChange(event.target.value)}
                  placeholder="https://github.com/org/skills.git"
                  value={installRepo}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-muted-foreground">Subdir (optional)</span>
                <Input
                  onChange={(event) => onInstallSubdirChange(event.target.value)}
                  placeholder="e.g. plugin/skills/my-skill"
                  value={installSubdir}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-detect SKILL.md in the repo root or subfolders.
                </p>
              </label>
            </>
          )}
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Name override (optional)</span>
            <Input onChange={(event) => onInstallNameChange(event.target.value)} value={installName} />
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <Checkbox
              checked={installForce}
              id="install-force"
              onCheckedChange={(checked) => onInstallForceChange(Boolean(checked))}
            />
            <span>Replace if the skill already exists in the hub</span>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button disabled={isMigrating} onClick={onMigrate} variant="secondary">
            {isMigrating ? 'Migrating…' : 'Migrate from agents lock'}
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isInstalling || submitDisabled} onClick={onSubmit}>
            {isInstalling ? 'Installing…' : 'Install'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
