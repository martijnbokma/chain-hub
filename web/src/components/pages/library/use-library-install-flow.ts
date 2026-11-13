import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { libraryApi, SecurityBlockedError } from '@/lib/api';
import type {
  AssetKind,
  DiscoverSkillDirsResult,
  InstallSkillResult,
  ScanSkillSourceInput,
  ScanSkillSourceResult,
  SecurityScanRecord
} from '@/types';

import { type BrowsedSkillFolder, readBrowsedSkillFolder } from './skill-folder-upload';

type SelectedAsset = { kind: AssetKind; name: string };

/** Picker option for the repo root itself — a repo can hold both a root SKILL.md and nested skill dirs. */
export const REPO_ROOT_DIR = '';

export interface InstallFailure {
  subdir: string;
  error: Error;
}

/** Human-readable name for an install target: the subdir basename, or the repo root marker. */
function installTargetLabel(subdir: string): string {
  const base = subdir.split('/').filter(Boolean).pop();
  return base ?? 'repo root';
}

export function useLibraryInstallFlow(options: {
  onInstalled: (selected: SelectedAsset) => void;
}) {
  const queryClient = useQueryClient();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installMode, setInstallMode] = useState<'path' | 'repo'>('path');
  const [installPath, setInstallPath] = useState('');
  const [installRepo, setInstallRepo] = useState('');
  const [installSubdir, setInstallSubdir] = useState('');
  const [installName, setInstallName] = useState('');
  const [installForce, setInstallForce] = useState(false);
  const [blockedScan, setBlockedScan] = useState<SecurityBlockedError['scan'] | null>(null);
  const [blockedLabels, setBlockedLabels] = useState<string[]>([]);
  const [browsedFolder, setBrowsedFolder] = useState<BrowsedSkillFolder | null>(null);
  const [repoScan, setRepoScan] = useState<DiscoverSkillDirsResult | null>(null);
  const [selectedDirs, setSelectedDirs] = useState<string[]>([]);
  const [previewScans, setPreviewScans] = useState<Array<{ label: string; scan: SecurityScanRecord }>>([]);

  const scanOptions = repoScan
    ? [...(repoScan.hasRootSkill ? [REPO_ROOT_DIR] : []), ...repoScan.dirs]
    : [];
  const repoPickerActive = installMode === 'repo' && scanOptions.length > 1;

  const clearRepoScan = () => {
    setRepoScan(null);
    setSelectedDirs([]);
  };

  const clearPreviewScans = () => setPreviewScans([]);

  const resetInstallForm = () => {
    setInstallPath('');
    setInstallRepo('');
    setInstallSubdir('');
    setInstallName('');
    setInstallForce(false);
    setBrowsedFolder(null);
    clearRepoScan();
    clearPreviewScans();
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const scanSkillDirs = useMutation({
    mutationFn: (repo: string) => libraryApi.discoverSkillDirs({ repo }),
    onSuccess: (result) => {
      const found = [...(result.hasRootSkill ? [REPO_ROOT_DIR] : []), ...result.dirs];
      if (found.length === 0) {
        clearRepoScan();
        toast.error('No SKILL.md found in this repo');
        return;
      }
      setRepoScan(result);
      setSelectedDirs(found);
      // A single nested dir can go straight into the subdir field; no picker needed.
      if (!result.hasRootSkill && result.dirs.length === 1) {
        setInstallSubdir(result.dirs[0]);
      }
    },
    onError: (error: Error) => {
      clearRepoScan();
      toast.error(error.message || 'Unable to scan repo');
    }
  });

  const scanSkillSecurity = useMutation({
    mutationFn: async (): Promise<Array<{ label: string; scan: SecurityScanRecord; detectedSubdir?: string | null }>> => {
      const targets: Array<{ label: string; payload: ScanSkillSourceInput }> = [];
      if (installMode === 'path' && browsedFolder) {
        targets.push({ label: browsedFolder.label, payload: { files: browsedFolder.files } });
      } else if (installMode === 'path') {
        targets.push({ label: installPath.trim(), payload: { path: installPath.trim() } });
      } else {
        const dirs = repoPickerActive ? selectedDirs : [installSubdir.trim()];
        for (const dir of dirs) {
          targets.push({
            label: dir || installRepo.trim(),
            payload: {
              repo: installRepo.trim(),
              subdir: dir || undefined,
              name: dirs.length === 1 ? installName.trim() || undefined : undefined
            }
          });
        }
      }
      return Promise.all(
        targets.map(async ({ label, payload }) => {
          const result: ScanSkillSourceResult = await libraryApi.scanSkillSource(payload);
          return { label, scan: result.scan, detectedSubdir: result.detectedSubdir };
        })
      );
    },
    onSuccess: (results) => {
      setPreviewScans(results);
      // Auto-fill Subdir when the scan resolved one the user left empty.
      const detected = results.length === 1 ? results[0].detectedSubdir : undefined;
      if (installMode === 'repo' && detected && !installSubdir.trim()) {
        setInstallSubdir(detected);
      }
    },
    onError: (error: Error) => {
      setPreviewScans([]);
      // A failed request is not a scan verdict — say the scan could not run and offer retry.
      toast.error('Unable to run the security scan', {
        description: error.message || 'Check that the hub API is running.',
        action: { label: 'Retry scan', onClick: () => scanSkillSecurity.mutate() }
      });
    }
  });

  const installSkill = useMutation({
    mutationFn: async (allowUnsafe: boolean): Promise<{ installed: InstallSkillResult[]; failures: InstallFailure[] }> => {
      if (installMode === 'path' && browsedFolder) {
        try {
          const result = await libraryApi.installSkillBundle({
            files: browsedFolder.files,
            name: installName.trim() || browsedFolder.label || undefined,
            force: installForce,
            allowUnsafe
          });
          return { installed: [result], failures: [] };
        } catch (error) {
          // Route bundle blocks through the same failures path so the panel + label logic applies.
          return {
            installed: [],
            failures: [{ subdir: '', error: error instanceof Error ? error : new Error(String(error)) }]
          };
        }
      }
      // With the picker active each checked dir becomes its own install; REPO_ROOT_DIR maps to no subdir.
      const targets = repoPickerActive ? selectedDirs : [installSubdir.trim()];
      const installed: InstallSkillResult[] = [];
      const failures: InstallFailure[] = [];
      for (const subdir of targets) {
        try {
          installed.push(
            await libraryApi.installSkill({
              path: installMode === 'path' ? installPath.trim() || undefined : undefined,
              repo: installMode === 'repo' ? installRepo.trim() || undefined : undefined,
              subdir: installMode === 'repo' && subdir ? subdir : undefined,
              name: targets.length === 1 ? installName.trim() || undefined : undefined,
              force: installForce,
              allowUnsafe
            })
          );
        } catch (error) {
          failures.push({ subdir, error: error instanceof Error ? error : new Error(String(error)) });
        }
      }
      return { installed, failures };
    },
    onSuccess: ({ installed, failures }) => {
      if (installed.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ['library'] });
        void queryClient.invalidateQueries({ queryKey: ['setup'] });
        void queryClient.invalidateQueries({ queryKey: ['overview'] });
      }

      const blocked = failures.find((failure) => failure.error instanceof SecurityBlockedError);
      if (failures.length > 0) {
        // Keep only the failed dirs checked so a retry installs exactly what is missing.
        if (repoPickerActive) {
          setSelectedDirs(failures.map((failure) => failure.subdir));
        }
        if (blocked) {
          setBlockedScan((blocked.error as SecurityBlockedError).scan);
          const labels = failures
            .filter((failure) => failure.error instanceof SecurityBlockedError)
            .map((failure) =>
              installMode === 'repo'
                ? installTargetLabel(failure.subdir)
                : (browsedFolder?.label ??
                    installPath.trim().split('/').filter(Boolean).pop() ??
                    'this skill')
            );
          setBlockedLabels(labels);
          toast.error(`Security scan blocked ${labels[0]} — review the findings`);
        } else {
          setBlockedScan(null);
          setBlockedLabels([]);
          const [first] = failures;
          toast.error(
            failures.length === 1
              ? first.error.message || 'Unable to install skill'
              : `${first.error.message} — ${failures.length - 1} more failed`
          );
        }
        if (installed.length > 0) {
          toast.success(
            installed.length === 1
              ? `Installed skills/${installed[0].asset.name}`
              : `Installed ${installed.length} skills`
          );
        }
        return;
      }

      setInstallOpen(false);
      setBlockedScan(null);
      setBlockedLabels([]);
      resetInstallForm();
      const last = installed[installed.length - 1];
      options.onInstalled({ kind: 'skills', name: last.asset.name });
      toast.success(
        installed.length === 1 ? `Installed skills/${last.asset.name}` : `Installed ${installed.length} skills`
      );
    },
    onError: (error: Error) => {
      setBlockedScan(null);
      setBlockedLabels([]);
      toast.error(error.message || 'Unable to install skill');
    }
  });

  const migrateAgentsSkills = useMutation({
    mutationFn: async () => {
      return libraryApi.migrateAgentsSkills({});
    },
    onSuccess: (result) => {
      const migrated = result.results.filter((item) => item.status === 'migrated').length;
      const skipped = result.results.filter((item) => item.status === 'skipped').length;
      const failed = result.results.filter((item) => item.status === 'failed').length;
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Agents migrate: ${migrated} migrated, ${skipped} skipped, ${failed} failed`);
    },
    onError: () => {
      toast.error('Unable to migrate from ~/.agents/.skill-lock.json');
    }
  });

  const installSubmitDisabled =
    installMode === 'path'
      ? !browsedFolder && installPath.trim().length === 0
      : installRepo.trim().length === 0 || (repoPickerActive && selectedDirs.length === 0);

  const handleBrowseFiles = (fileList: FileList): void => {
    void readBrowsedSkillFolder(fileList)
      .then((folder) => {
        setBrowsedFolder(folder);
        setInstallPath('');
        clearPreviewScans();
        if (!installName.trim()) {
          setInstallName(folder.label);
        }
        toast.success(`Selected ${folder.label} (${folder.files.length} files)`);
      })
      .catch((error: Error) => {
        setBrowsedFolder(null);
        toast.error(error.message || 'Unable to read folder');
      });
  };

  const handleInstallRepoChange = (value: string) => {
    setInstallRepo(value);
    clearPreviewScans();
    // Scan results belong to the URL they were taken from; editing the URL drops them.
    if (repoScan) {
      clearRepoScan();
    }
  };

  const handleInstallSubdirChange = (value: string) => {
    setInstallSubdir(value);
    clearPreviewScans();
  };

  const handleInstallPathChange = (value: string) => {
    setBrowsedFolder(null);
    setInstallPath(value);
    clearPreviewScans();
  };

  const handleInstallModeChange = (mode: 'path' | 'repo') => {
    setInstallMode(mode);
    setBrowsedFolder(null);
    clearPreviewScans();
  };

  const toggleSelectedDir = (dir: string) => {
    clearPreviewScans();
    setSelectedDirs((current) =>
      current.includes(dir) ? current.filter((item) => item !== dir) : [...current, dir]
    );
  };

  return {
    installOpen,
    setInstallOpen,
    installMode,
    setInstallMode,
    installPath,
    setInstallPath,
    installRepo,
    setInstallRepo,
    handleInstallRepoChange,
    installSubdir,
    setInstallSubdir,
    installName,
    setInstallName,
    installForce,
    setInstallForce,
    browsedFolder,
    setBrowsedFolder,
    folderInputRef,
    installSkill,
    migrateAgentsSkills,
    installSubmitDisabled,
    handleBrowseFiles,
    blockedScan,
    blockedLabels,
    clearBlockedScan: () => setBlockedScan(null),
    previewScans,
    scanSkillSecurity,
    handleInstallSubdirChange,
    handleInstallPathChange,
    handleInstallModeChange,
    repoScan,
    scanOptions,
    repoPickerActive,
    selectedDirs,
    toggleSelectedDir,
    scanSkillDirs,
    clearRepoScan
  };
}
