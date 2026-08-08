import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { LandingPage } from './pages/LandingPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/coming-soon" element={<ComingSoonPage />} />
      </Routes>
    </BrowserRouter>
  );
}
