import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { Shell } from './components/layout';
import { 
  SetupPage, 
  OverviewPage, 
  LibraryPage, 
  MemoryPage, 
  IntegrationsPage, 
  LearningsPage 
} from './components/pages';

export function App() {
  return (
    <Shell>
      <Routes>
        <Route element={<SetupPage />} path="/setup" />
        <Route element={<OverviewPage />} path="/" />
        <Route element={<LibraryPage />} path="/library" />
        <Route element={<MemoryPage />} path="/memory" />
        <Route element={<LearningsPage />} path="/learnings" />
        <Route element={<IntegrationsPage />} path="/integrations" />
      </Routes>
    </Shell>
  );
}
