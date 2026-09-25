import { lazy } from 'react';

/** Code-split CodeMirror editor; render inside <Suspense>. */
export const LazyMarkdownSourceEditor = lazy(async () => {
  const module = await import('./MarkdownSourceEditor');
  return { default: module.MarkdownSourceEditor };
});
