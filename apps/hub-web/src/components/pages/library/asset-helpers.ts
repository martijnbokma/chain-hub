import { Sparkles, Bot, Workflow, ScrollText, type LucideIcon } from 'lucide-react';

import type { AssetKind, InstallSkillBundleInput, SkillLockEntry } from '@/types';

export type BrowsedSkillFolder = {
  label: string;
  files: InstallSkillBundleInput['files'];
};

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function readBrowsedSkillFolder(fileList: FileList): Promise<BrowsedSkillFolder> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    throw new Error('No files selected');
  }

  const relativePaths = files.map((file) => file.webkitRelativePath || file.name);
  const rootName = relativePaths[0]?.split('/')[0] || 'skill';
  const payloadFiles: InstallSkillBundleInput['files'] = [];

  for (const file of files) {
    const relative = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const withoutRoot = relative.startsWith(`${rootName}/`) ? relative.slice(rootName.length + 1) : relative;
    if (!withoutRoot || withoutRoot.endsWith('/')) {
      continue;
    }
    payloadFiles.push({
      path: withoutRoot,
      contentBase64: await fileToBase64(file)
    });
  }

  if (!payloadFiles.some((file) => file.path === 'SKILL.md' || file.path.endsWith('/SKILL.md'))) {
    throw new Error('Selected folder must contain SKILL.md');
  }

  return { label: rootName, files: payloadFiles };
}

export const KIND_META: Record<AssetKind, { label: string; icon: LucideIcon }> = {
  skills: { label: 'Skill', icon: Sparkles },
  agents: { label: 'Agent', icon: Bot },
  workflows: { label: 'Workflow', icon: Workflow },
  rules: { label: 'Rule', icon: ScrollText }
};

export function resolveKindMeta(kind: string): { label: string; icon: LucideIcon } {
  if (kind === 'skills' || kind === 'agents' || kind === 'workflows' || kind === 'rules') {
    return KIND_META[kind];
  }
  return KIND_META.skills;
}

export function formatSkillSource(provenance: SkillLockEntry | null | undefined): string {
  if (!provenance) {
    return 'Local hub (no lock entry)';
  }

  if (provenance.source.startsWith('upload://')) {
    return 'Uploaded via dashboard';
  }

  if (provenance.sourceType === 'git') {
    return provenance.subdir ? `${provenance.source} · ${provenance.subdir}` : provenance.source;
  }

  return provenance.source;
}

export function formatSkillSourceType(provenance: SkillLockEntry | null | undefined): string {
  if (!provenance) {
    return 'local';
  }
  if (provenance.source.startsWith('upload://')) {
    return 'upload';
  }
  return provenance.sourceType;
}
