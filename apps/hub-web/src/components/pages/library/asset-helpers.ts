import { Sparkles, Bot, Workflow, ScrollText, NotebookText, type LucideIcon } from 'lucide-react';

import { isEditableHubAsset } from '@chain-hub/contracts';
import { ASSET_KINDS } from '@/lib/constants';
import type {
  AssetKind,
  AssetRecord,
  DiscoveredAsset,
  FilterKind,
  OwnershipFilter,
  SkillLockEntry
} from '@/types';

export function parseKindParam(value: string | null): FilterKind {
  if (value !== null && (ASSET_KINDS as readonly string[]).includes(value)) {
    return value as AssetKind;
  }
  return '__all__';
}

/** Deep link `?kind=<kind>&asset=<name>` opens that asset's detail panel. */
export function parseSelectedAssetParams(
  kind: string | null,
  asset: string | null
): { kind: AssetKind; name: string } | null {
  const parsedKind = parseKindParam(kind);
  const name = asset?.trim();
  if (parsedKind === '__all__' || !name) {
    return null;
  }
  return { kind: parsedKind, name };
}

export function parseOwnershipParam(value: string | null): OwnershipFilter {
  if (value === 'editable' || value === 'upstream') {
    return value;
  }
  return 'all';
}

export function filterLibraryAssets(
  assets: AssetRecord[],
  filterKind: FilterKind,
  searchQuery: string,
  ownership: OwnershipFilter = 'all'
): AssetRecord[] {
  const query = searchQuery.trim().toLowerCase();
  return assets.filter((asset) => {
    const matchesKind = filterKind === '__all__' || asset.kind === filterKind;
    const matchesQuery =
      query.length === 0 ||
      `${asset.name} ${asset.relativePath} ${asset.kind} ${asset.author ?? ''}`
        .toLowerCase()
        .includes(query);
    const editable = isEditableHubAsset(asset);
    const matchesOwnership =
      ownership === 'all' ||
      (ownership === 'editable' && editable) ||
      (ownership === 'upstream' && !editable);
    return matchesKind && matchesQuery && matchesOwnership;
  });
}

export function groupAssetsByKind(assets: AssetRecord[]): Record<string, AssetRecord[]> {
  return assets.reduce<Record<string, AssetRecord[]>>((accumulator, asset) => {
    accumulator[asset.kind] ??= [];
    accumulator[asset.kind].push(asset);
    return accumulator;
  }, {});
}

export function groupDiscoveredByEditor(candidates: DiscoveredAsset[]): Record<string, DiscoveredAsset[]> {
  return candidates.reduce<Record<string, DiscoveredAsset[]>>((accumulator, candidate) => {
    accumulator[candidate.editorLabel] ??= [];
    accumulator[candidate.editorLabel].push(candidate);
    return accumulator;
  }, {});
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
