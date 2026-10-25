import type {
  Overview,
  AnalysisReport,
  SaveAnalysisInput,
  UpdateAnalysisItemInput,
  AssetKind,
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
  HubIssuesResult,
  SkillCheckItemResult,
  SkillUpstreamDirsResult,
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
  ReflectionReport,
  ResolveLearningsInput,
  ResolveLearningsResult,
  ResolveConflictsInput,
  SyncConnectInput,
  SyncStatus,
  CatalogResult,
  InstallCatalogEntryInput,
  InstallCatalogEntryResult
} from '@/types';

/**
 * Generic function to fetch JSON data from an API endpoint
 */
export async function getJson<T>(url: string): Promise<T> {
  return parseJsonResponse<T>(await fetch(url));
}

/**
 * Sends a JSON request and returns the parsed response. Failed requests throw an
 * Error carrying the hub's { error } message, so callers need no response checks.
 */
export async function sendJson<T>(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  });

  return parseJsonResponse<T>(response);
}

/** Returns the JSON body, or throws with the hub's { error } message instead of a bare status code. */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** User-facing message for a failed request or mutation, with a fallback for non-Error values. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
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

// Issues API — every known hub problem, errors first
export const issuesApi = {
  get: () => getJson<HubIssuesResult>('/api/issues')
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
  checkSkillUpdates: (options: { name?: string; force?: boolean } = {}) =>
    sendJson<CheckSkillUpdatesResult>('/api/library/skills/check-updates', 'POST', options),
  getSkillUpstreamDirs: (name: string) =>
    getJson<SkillUpstreamDirsResult>(`/api/library/skills/${encodeURIComponent(name)}/upstream-dirs`),
  relinkSkill: (name: string, subdir: string) =>
    sendJson<InstallSkillResult>(`/api/library/skills/${encodeURIComponent(name)}/relink`, 'POST', { subdir }),
  unlinkSkill: (name: string) =>
    sendJson<{ ok: true }>(`/api/library/skills/${encodeURIComponent(name)}/unlink`, 'POST'),
  forkSkill: (data: { kind?: AssetKind; name: string; as?: string }) =>
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

// Catalog API: curated pointer index of community assets; install reuses the git install flow
export const catalogApi = {
  getAll: (options: { refresh?: boolean } = {}) =>
    getJson<CatalogResult>(`/api/catalog${options.refresh ? '?refresh=true' : ''}`),
  install: (data: InstallCatalogEntryInput) =>
    sendJson<InstallCatalogEntryResult>('/api/catalog/install', 'POST', data)
};

// Analysis API — persisted library analysis report + per-item status
export const analysisApi = {
  get: () => getJson<AnalysisReport | null>('/api/analysis'),
  save: (data: SaveAnalysisInput) => sendJson<AnalysisReport>('/api/analysis', 'PUT', data),
  setItemStatus: (data: UpdateAnalysisItemInput) =>
    sendJson<AnalysisReport>('/api/analysis/items', 'PATCH', data)
};

// Integrations API
export const integrationsApi = {
  getAll: () => getJson<Integration[]>('/api/integrations'),
  setup: () => sendJson<Integration[]>('/api/integrations/setup', 'POST')
};

// Sync API — GitHub-backed cloud backup of the hub folder
export const syncApi = {
  status: () => getJson<SyncStatus>('/api/sync/status'),
  connect: (data: SyncConnectInput) => sendJson<SyncStatus>('/api/sync/connect', 'POST', data),
  disconnect: () => sendJson<SyncStatus>('/api/sync/disconnect', 'POST'),
  now: () => sendJson<SyncStatus>('/api/sync/now', 'POST'),
  resolve: (data: ResolveConflictsInput) => sendJson<SyncStatus>('/api/sync/resolve', 'POST', data)
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
    sendJson<CaptureEvent>('/api/learnings/capture', 'POST', data),
  resolveSkill: (data: ResolveLearningsInput) =>
    sendJson<ResolveLearningsResult>('/api/learnings/resolve', 'POST', data)
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
