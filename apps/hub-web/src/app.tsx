import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Shell } from './components/layout';
import { PageSkeleton } from './components/common/PageSkeleton';
import { EmptyState } from './components/common/EmptyState';
import { overviewApi } from './lib/api';

const SetupPage = lazy(() => import('./components/pages/SetupPage').then((module) => ({ default: module.SetupPage })));
const OverviewPage = lazy(() =>
  import('./components/pages/OverviewPage').then((module) => ({ default: module.OverviewPage }))
);
const LibraryPage = lazy(() =>
  import('./components/pages/LibraryPage').then((module) => ({ default: module.LibraryPage }))
);
const MemoryPage = lazy(() => import('./components/pages/MemoryPage').then((module) => ({ default: module.MemoryPage })));
const IntegrationsPage = lazy(() =>
  import('./components/pages/IntegrationsPage').then((module) => ({ default: module.IntegrationsPage }))
);
const LearningsPage = lazy(() =>
  import('./components/pages/LearningsPage').then((module) => ({ default: module.LearningsPage }))
);

function RootRoute() {
  const overview = useQuery({
    queryKey: ['overview'],
    queryFn: () => overviewApi.get()
  });

  if (overview.isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (overview.data && (!overview.data.health.initialized || overview.data.storage.indexedAssets === 0)) {
    return <Navigate replace to="/setup" />;
  }

  return <OverviewPage />;
}

export function App() {
  return (
    <Shell>
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <Routes>
          <Route element={<SetupPage />} path="/setup" />
          <Route element={<RootRoute />} path="/" />
          <Route element={<LibraryPage />} path="/library" />
          <Route element={<MemoryPage />} path="/memory" />
          <Route element={<LearningsPage />} path="/learnings" />
          <Route element={<IntegrationsPage />} path="/integrations" />
          <Route
            element={<EmptyState description="That page doesn't exist. Use the sidebar to navigate." title="Not found" />}
            path="*"
          />
        </Routes>
      </Suspense>
    </Shell>
  );
}
