import { useLocation } from 'react-router-dom';
import { docPages } from '../lib/nav';
import { DocsLink } from './DocsLink';

export function PageNav() {
  const location = useLocation();
  const index = docPages.findIndex((page) => page.path === location.pathname);
  if (index === -1) return null;

  const prev = docPages[index - 1];
  const next = docPages[index + 1];
  if (!prev && !next) return null;

  return (
    <nav className="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4 text-sm">
      {prev ? (
        <DocsLink href={prev.path} className="text-muted-foreground hover:text-foreground transition-colors">
          ← {prev.title}
        </DocsLink>
      ) : (
        <span />
      )}
      {next ? (
        <DocsLink href={next.path} className="text-muted-foreground hover:text-foreground transition-colors text-right">
          {next.title} →
        </DocsLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
