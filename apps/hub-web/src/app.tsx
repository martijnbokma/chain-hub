import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { Shell } from './components/layout';
import { PageSkeleton } from './components/common/PageSkeleton';
import { EmptyState } from './components/common/EmptyState';

const SetupPage = lazy(() => import('./components/pages/SetupPage').then((module) => ({ default: module.SetupPage })));
const OverviewPage = lazy(() =>
  import('./components/pages/OverviewPage').then((module) => ({ default: module.OverviewPage }))
);
const LibraryPage = lazy(() =>
  import('./components/pages/LibraryPage').then((module) => ({ default: module.LibraryPage }))
);
const IntegrationsPage = lazy(() =>
  import('./components/pages/IntegrationsPage').then((module) => ({ default: module.IntegrationsPage }))
);
const LearningsPage = lazy(() =>
  import('./components/pages/LearningsPage').then((module) => ({ default: module.LearningsPage }))
);
const SettingsPage = lazy(() =>
  import('./components/pages/SettingsPage').then((module) => ({ default: module.SettingsPage }))
);

export function App() {
  return (
    <Shell>
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <Routes>
          <Route element={<OverviewPage />} path="/" />
          <Route element={<SetupPage />} path="/setup" />
          <Route element={<LibraryPage />} path="/library" />
          <Route element={<LearningsPage />} path="/learnings" />
          <Route element={<IntegrationsPage />} path="/integrations" />
          <Route element={<SettingsPage />} path="/settings" />
          <Route
            element={<EmptyState description="That page doesn't exist. Use the sidebar to navigate." title="Not found" />}
            path="*"
          />
        </Routes>
      </Suspense>
    </Shell>
  );
}
