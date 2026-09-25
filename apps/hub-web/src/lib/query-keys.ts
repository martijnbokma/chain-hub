/**
 * TanStack Query keys shared across pages. Invalidating a prefix (e.g. `queryKeys.library`)
 * also refreshes every nested key under it.
 */
export const queryKeys = {
  overview: ['overview'] as const,
  setup: ['setup'] as const,
  integrations: ['integrations'] as const,
  aiSettings: ['settings', 'ai'] as const,
  learningsReflect: ['learnings-reflect'] as const,
  library: ['library'] as const,
  libraryDiscover: ['library', 'discover'] as const,
  libraryDetails: ['library', 'detail'] as const,
  libraryDetail: (kind: string | undefined, name: string | undefined) => ['library', 'detail', kind, name] as const,
  skillFiles: (name: string | undefined) => ['library', 'skill-files', name] as const,
  skillFile: (name: string, path: string) => ['library', 'skill-file', name, path] as const
};
