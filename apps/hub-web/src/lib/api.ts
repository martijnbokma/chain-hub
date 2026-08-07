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
  DraftPromptResult
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
    })
};

export type { AiSettingsPublic, UpdateAiSettingsInput, DraftAssetInput, DraftAssetResult, DraftPromptInput, DraftPromptResult };
