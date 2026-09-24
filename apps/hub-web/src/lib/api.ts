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
  CheckSkillUpdatesResult,
  SkillCheckItemResult,
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
    // The hub answers errors as { error }; show that instead of a bare status code.
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Sends a JSON request and returns the parsed response. Failed requests throw an
 * Error carrying the hub's { error } message, so callers need no response checks.
 */
export async function sendJson<T>(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Asset names come from files on disk (imports keep spaces, `#`, …), so encode them. */
function assetUrl(kind: string, name: string): string {
  return `/api/library/${encodeURIComponent(kind)}/${encodeURIComponent(name)}`;
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
    getJson<AssetDetail>(assetUrl(kind, name)),
  create: (data: { kind: string; name: string; content: string }) => 
    sendJson<AssetDetail>('/api/library', 'POST', data),
  update: (kind: string, name: string, data: { content: string }) => 
    sendJson<AssetDetail>(assetUrl(kind, name), 'PUT', data),
  rename: (kind: string, name: string, data: { name: string }) =>
    sendJson<AssetDetail>(`${assetUrl(kind, name)}/rename`, 'POST', data),
  convert: (kind: string, name: string, data: { toKind: string; name?: string }) =>
    sendJson<AssetDetail>(`${assetUrl(kind, name)}/convert`, 'POST', data),
  delete: (kind: string, name: string) =>
    sendJson<{ ok: true }>(assetUrl(kind, name), 'DELETE'),
  discover: () => getJson<DiscoveredAsset[]>('/api/library/discover'),
  import: (data: ImportAssetInput) =>
    sendJson<AssetDetail>('/api/library/import', 'POST', data),
  installSkill: (data: InstallSkillInput) =>
    sendJson<InstallSkillResult>('/api/library/skills/install', 'POST', data),
  installSkillBundle: (data: InstallSkillBundleInput) =>
    sendJson<InstallSkillResult>('/api/library/skills/install-bundle', 'POST', data),
  updateSkills: (data: { name?: string; force?: boolean } = {}) =>
    sendJson<UpdateSkillsResult>('/api/library/skills/update', 'POST', data),
  checkSkillUpdates: (options: { force?: boolean } = {}) =>
    getJson<CheckSkillUpdatesResult>(`/api/library/skills/check-updates${options.force ? '?force=true' : ''}`),
  forkSkill: (data: { name: string; as?: string }) =>
    sendJson<AssetDetail>('/api/library/skills/fork', 'POST', data),
  getSkillFiles: (name: string) =>
    getJson<{ files: SkillFileEntry[] }>(`/api/library/skills/${encodeURIComponent(name)}/files`),
  getSkillFile: (name: string, path: string) =>
    getJson<SkillFileContent>(
      `/api/library/skills/${encodeURIComponent(name)}/files/${path.split('/').map(encodeURIComponent).join('/')}`
    ),
  migrateAgentsSkills: (data: { lockPath?: string; force?: boolean } = {}) =>
    sendJson<MigrateAgentsSkillsResult>('/api/library/skills/migrate-agents', 'POST', data)
};

export type { InstallSkillResult, UpdateSkillsResult, MigrateAgentsSkillsResult, CheckSkillUpdatesResult, SkillCheckItemResult };

// Integrations API
export const integrationsApi = {
  getAll: () => getJson<Integration[]>('/api/integrations'),
  setup: () => sendJson<Integration[]>('/api/integrations/setup', 'POST')
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
    sendJson<CaptureEvent>('/api/learnings/capture', 'POST', data)
};

export type { CaptureEvent };

// AI settings + prompt drafting
export const aiSettingsApi = {
  get: () => getJson<AiSettingsPublic>('/api/settings/ai'),
  update: (data: UpdateAiSettingsInput) =>
    sendJson<AiSettingsPublic>('/api/settings/ai', 'PUT', data),
  draftPrompt: (data: DraftAssetInput) =>
    sendJson<DraftAssetResult>('/api/ai/draft-prompt', 'POST', data),
  classifyAsset: (data: ClassifyAssetInput) =>
    sendJson<ClassifyAssetResult>('/api/ai/classify-asset', 'POST', data),
  auditAsset: (data: AuditAssetInput) =>
    sendJson<AuditAssetResult>('/api/ai/audit-asset', 'POST', data),
  improveAsset: (data: ImproveAssetInput) =>
    sendJson<ImproveAssetResult>('/api/ai/improve-asset', 'POST', data)
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
