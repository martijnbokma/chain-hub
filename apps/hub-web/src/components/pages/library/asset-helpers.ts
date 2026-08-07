import { Sparkles, Bot, Workflow, ScrollText, NotebookText, type LucideIcon } from 'lucide-react';

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
  rules: { label: 'Rule', icon: ScrollText },
  prompts: { label: 'Prompt', icon: NotebookText }
};

export function resolveKindMeta(kind: string): { label: string; icon: LucideIcon } {
  if (kind === 'skills' || kind === 'agents' || kind === 'workflows' || kind === 'rules' || kind === 'prompts') {
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

const NAME_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'that',
  'this',
  'want',
  'please',
  'write',
  'create',
  'make',
  'help',
  'me',
  'my',
  'een',
  'de',
  'het',
  'van',
  'voor',
  'met',
  'ik',
  'wil',
  'een',
  'maak',
  'schrijf'
]);

/** Derive a hub asset slug from free-form intent / description text. */
export function suggestAssetNameFromText(input: string, maxLength = 48): string {
  const words = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .split(/[\s-]+/)
    .filter((word) => word.length > 0 && !NAME_STOP_WORDS.has(word));

  const slug = (words.length > 0 ? words : input.trim().toLowerCase().split(/\s+/))
    .slice(0, 6)
    .join('-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.slice(0, maxLength).replace(/-+$/g, '');
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

/** Strip leading YAML frontmatter so clipboard paste is usable prompt body. */
export function stripYamlFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    return content;
  }

  const fenceEnd = trimmed.indexOf('\n---', 3);
  if (fenceEnd === -1) {
    return content;
  }

  const afterFence = trimmed.slice(fenceEnd + 4);
  return afterFence.replace(/^\r?\n/, '');
}

/** Text ready to paste into a chat — prompts drop frontmatter; other kinds copy as-is. */
export function contentForClipboard(content: string, kind: AssetKind): string {
  if (kind === 'prompts') {
    return stripYamlFrontmatter(content);
  }
  return content;
}
