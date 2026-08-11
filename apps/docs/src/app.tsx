import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DocsLayout } from './components/DocsLayout';
import { docPages } from './lib/nav';

export function App() {
  return (
    <BrowserRouter basename="/docs">
      <Routes>
        <Route element={<DocsLayout />}>
          {docPages.map((page) => {
            const Page = page.Component;
            return <Route key={page.path} path={page.path} element={<Page />} />;
          })}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
