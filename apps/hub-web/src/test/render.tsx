import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import type { AssetDetail, Integration, Overview, SetupGuide } from '@/types';

/** Renders a page inside a fresh query client and a data router (pages may use useBlocker). */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [route] });

  return {
    queryClient,
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
  };
}

export function makeOverview(overrides: Partial<Overview> = {}): Overview {
  return {
    chainHome: '/home/test/.chain-hub',
    initializedAt: '2026-09-24T00:00:00.000Z',
    assetCounts: { skills: 2, agents: 0, workflows: 0, rules: 1, prompts: 0 },
    health: { initialized: true, issues: [] },
    storage: { indexedAssets: 3 },
    agentsSkillsDrift: { lockPath: null, missingNames: [], missingCount: 0 },
    ...overrides
  };
}

export function makeIntegration(overrides: Partial<Integration> & Pick<Integration, 'id' | 'label'>): Integration {
  return {
    targetPaths: [`/home/test/.${overrides.id}`],
    installed: true,
    connected: true,
    mode: 'managed',
    supportedKinds: ['skills', 'rules'],
    unsupportedKinds: ['agents', 'workflows', 'prompts'],
    ...overrides
  };
}

export function makeSetupGuide(overrides: Partial<SetupGuide> = {}): SetupGuide {
  return {
    chainHome: '/home/test/.chain-hub',
    nextAction: 'connect',
    steps: [
      { id: 'initialize', label: 'Initialize local hub', description: 'Create the hub.', complete: true, action: 'init', status: 'done' },
      { id: 'create-first-asset', label: 'Create first asset', description: 'Add one.', complete: true, action: 'create-asset', status: 'done' },
      { id: 'connect-editors', label: 'Connect editors', description: 'Sync editors.', complete: false, action: 'connect', status: 'current' },
      { id: 'validate', label: 'Validate structure', description: 'Validate.', complete: true, action: 'validate', status: 'done' }
    ],
    ...overrides
  };
}

export function makeAsset(overrides: Partial<AssetDetail> & Pick<AssetDetail, 'kind' | 'name'>): AssetDetail {
  return {
    id: `${overrides.kind}:${overrides.name}`,
    relativePath: overrides.kind === 'skills' ? `skills/${overrides.name}/SKILL.md` : `${overrides.kind}/${overrides.name}.md`,
    updatedAt: '2026-09-24T00:00:00.000Z',
    content: `# ${overrides.name}\n`,
    author: null,
    compatIssues: [],
    provenance: null,
    ...overrides
  };
}
