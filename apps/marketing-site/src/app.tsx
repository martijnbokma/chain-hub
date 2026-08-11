import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { DocsPage } from './pages/DocsPage';
import { LandingPage } from './pages/LandingPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/coming-soon" element={<ComingSoonPage />} />
      </Routes>
    </BrowserRouter>
  );
}
