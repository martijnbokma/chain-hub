import type {
  Overview,
  AssetRecord,
  AssetDetail,
  DiscoveredAsset,
  ImportAssetInput,
  InstallSkillInput,
  InstallSkillBundleInput,
  InstallSkillResult,
  Integration,
  MigrateAgentsSkillsResult,
  SetupGuide,
  UpdateSkillsResult,
  ValidationResult,
  AiSettingsPublic,
  UpdateAiSettingsInput,
  DraftAssetInput,
  DraftAssetResult,
  DraftPromptInput,
  DraftPromptResult,
  ClassifyAssetInput,
  ClassifyAssetResult,
  AuditAssetInput,
  AuditAssetResult,
  ImproveAssetInput,
  ImproveAssetResult,
  SkillFileEntry,
  SkillFileContent,
  CaptureInput,
  CaptureEvent,
  LearningsTimeline,
  ReflectionReport
} from '@/types';

/**
 * Generic function to fetch JSON data from an API endpoint
 */
export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Overview API
export const overviewApi = {
  get: () => getJson<Overview>('/api/overview')
};

// Validate API
export const validateApi = {
  run: () => getJson<ValidationResult>('/api/validate')
};

// Library API
export const libraryApi = {
  getAll: () => getJson<AssetRecord[]>('/api/library'),
  getByKindAndName: (kind: string, name: string) => 
    getJson<AssetDetail>(`/api/library/${kind}/${name}`),
  create: (data: { kind: string; name: string; content: string }) => 
    fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  update: (kind: string, name: string, data: { content: string }) => 
    fetch(`/api/library/${kind}/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  rename: (kind: string, name: string, data: { name: string }) =>
    fetch(`/api/library/${kind}/${name}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  convert: (kind: string, name: string, data: { toKind: string; name?: string }) =>
    fetch(`/api/library/${kind}/${name}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  delete: (kind: string, name: string) =>
    fetch(`/api/library/${kind}/${name}`, {
      method: 'DELETE'
    }),
  discover: () => getJson<DiscoveredAsset[]>('/api/library/discover'),
  import: (data: ImportAssetInput) =>
    fetch('/api/library/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  installSkill: (data: InstallSkillInput) =>
    fetch('/api/library/skills/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  installSkillBundle: (data: InstallSkillBundleInput) =>
    fetch('/api/library/skills/install-bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  updateSkills: (data: { name?: string; force?: boolean } = {}) =>
    fetch('/api/library/skills/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  forkSkill: (data: { name: string; as?: string }) =>
    fetch('/api/library/skills/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  getSkillFiles: (name: string) =>
    getJson<{ files: SkillFileEntry[] }>(`/api/library/skills/${encodeURIComponent(name)}/files`),
  getSkillFile: (name: string, path: string) =>
    getJson<SkillFileContent>(
      `/api/library/skills/${encodeURIComponent(name)}/files/${path.split('/').map(encodeURIComponent).join('/')}`
    ),
  migrateAgentsSkills: (data: { lockPath?: string; force?: boolean } = {}) =>
    fetch('/api/library/skills/migrate-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
};

export type { InstallSkillResult, UpdateSkillsResult, MigrateAgentsSkillsResult };

// Integrations API
export const integrationsApi = {
  getAll: () => getJson<Integration[]>('/api/integrations'),
  setup: () => fetch('/api/integrations/setup', { method: 'POST' })
};

// Setup API
export const setupApi = {
  getGuide: () => getJson<SetupGuide>('/api/setup')
};

// Learnings API
export const learningsApi = {
  getTimeline: () => getJson<LearningsTimeline>('/api/learnings'),
  getReflection: () => getJson<ReflectionReport>('/api/learnings/reflect'),
  capture: (data: CaptureInput) =>
    fetch('/api/learnings/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
};

export type { CaptureEvent };

// AI settings + prompt drafting
export const aiSettingsApi = {
  get: () => getJson<AiSettingsPublic>('/api/settings/ai'),
  update: (data: UpdateAiSettingsInput) =>
    fetch('/api/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  draftPrompt: (data: DraftAssetInput) =>
    fetch('/api/ai/draft-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  classifyAsset: (data: ClassifyAssetInput) =>
    fetch('/api/ai/classify-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  auditAsset: (data: AuditAssetInput) =>
    fetch('/api/ai/audit-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  improveAsset: (data: ImproveAssetInput) =>
    fetch('/api/ai/improve-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
};

export type {
  AiSettingsPublic,
  UpdateAiSettingsInput,
  DraftAssetInput,
  DraftAssetResult,
  DraftPromptInput,
  DraftPromptResult,
  ClassifyAssetInput,
  ClassifyAssetResult,
  AuditAssetInput,
  AuditAssetResult,
  ImproveAssetInput,
  ImproveAssetResult
};
