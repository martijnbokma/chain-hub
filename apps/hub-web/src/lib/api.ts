import type { 
  Overview, 
  AssetRecord, 
  AssetDetail,
  Integration,
  SetupGuide,
  LearningsTimeline,
  ReflectionReport,
  MemoryNote,
  MemorySearchResult
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
    })
};

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
  captureEvent: (data: { type: string; skill: string; summary: string }) => 
    fetch('/api/learnings/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
};

// Memory API
export const memoryApi = {
  getNotes: () => getJson<MemoryNote[]>('/api/memory/notes'),
  searchNotes: (query: string) => 
    getJson<MemorySearchResult[]>(`/api/memory/search?q=${encodeURIComponent(query)}`),
  getNoteByPath: (path: string) => 
    getJson<MemoryNote>(`/api/memory/note?path=${encodeURIComponent(path)}`),
  createNote: (data: { name: string; subdirectory?: string; content: string }) => 
    fetch('/api/memory/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  updateNote: (path: string, data: { content: string }) => 
    fetch(`/api/memory/note?path=${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  deleteNote: (path: string) => 
    fetch(`/api/memory/note?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    })
};