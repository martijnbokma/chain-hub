import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { libraryApi } from '@/lib/api';
import type { AssetKind, InstallSkillResult, MigrateAgentsSkillsResult } from '@/types';

import { type BrowsedSkillFolder, readBrowsedSkillFolder } from './asset-helpers';

type SelectedAsset = { kind: AssetKind; name: string };

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
  const [browsedFolder, setBrowsedFolder] = useState<BrowsedSkillFolder | null>(null);

  const resetInstallForm = () => {
    setInstallPath('');
    setInstallRepo('');
    setInstallSubdir('');
    setInstallName('');
    setInstallForce(false);
    setBrowsedFolder(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const installSkill = useMutation({
    mutationFn: async () => {
      const response =
        installMode === 'path' && browsedFolder
          ? await libraryApi.installSkillBundle({
              files: browsedFolder.files,
              name: installName.trim() || browsedFolder.label || undefined,
              force: installForce
            })
          : await libraryApi.installSkill({
              path: installMode === 'path' ? installPath.trim() || undefined : undefined,
              repo: installMode === 'repo' ? installRepo.trim() || undefined : undefined,
              subdir: installSubdir.trim() || undefined,
              name: installName.trim() || undefined,
              force: installForce
            });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Unable to install skill');
      }
      return response.json() as Promise<InstallSkillResult>;
    },
    onSuccess: (result) => {
      setInstallOpen(false);
      resetInstallForm();
      options.onInstalled({ kind: 'skills', name: result.asset.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Installed skills/${result.asset.name}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to install skill');
    }
  });

  const migrateAgentsSkills = useMutation({
    mutationFn: async () => {
      const response = await libraryApi.migrateAgentsSkills({});
      if (!response.ok) {
        throw new Error('Unable to migrate agents skills');
      }
      return response.json() as Promise<MigrateAgentsSkillsResult>;
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
    installMode === 'path' ? !browsedFolder && installPath.trim().length === 0 : installRepo.trim().length === 0;

  const handleBrowseFiles = (fileList: FileList): void => {
    void readBrowsedSkillFolder(fileList)
      .then((folder) => {
        setBrowsedFolder(folder);
        setInstallPath('');
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

  return {
    installOpen,
    setInstallOpen,
    installMode,
    setInstallMode,
    installPath,
    setInstallPath,
    installRepo,
    setInstallRepo,
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
    handleBrowseFiles
  };
}
