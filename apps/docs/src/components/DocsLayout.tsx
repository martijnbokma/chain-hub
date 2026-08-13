import React, { useState } from 'react';
import { MDXProvider } from '@mdx-js/react';
import { Menu, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { docPages, docSections } from '../lib/nav';
import { CodeBlock } from './CodeBlock';
import { DocsLink } from './DocsLink';

const mdxComponents = { a: DocsLink, pre: CodeBlock };

function PageNav() {
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

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-8">
      {docSections.map((group) => (
        <div key={group.section}>
          <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-3">
            {group.section}
          </h2>
          <ul className="space-y-1">
            {group.pages.map((page) => (
              <li key={page.path}>
                <NavLink
                  to={page.path}
                  end={page.path === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block text-sm py-1.5 px-3 rounded-sm transition-colors ${
                      isActive
                        ? 'text-primary font-medium bg-secondary/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  {page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DocsLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Chain Hub" className="w-8 h-8 rounded-sm" />
            <span className="font-display font-semibold text-xl tracking-wide text-foreground uppercase">
              Chain Hub Docs
            </span>
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="hidden sm:inline font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to site
            </a>
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              className="md:hidden p-2 -m-2 text-foreground"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[220px_1fr] gap-10">
        <aside
          className={`${mobileNavOpen ? 'block' : 'hidden'} md:block md:sticky md:top-10 md:self-start`}
        >
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </aside>

        <main className="docs-prose min-w-0">
          <MDXProvider components={mdxComponents}>
            <Outlet />
          </MDXProvider>
          <PageNav />
        </main>
      </div>
    </div>
  );
}
