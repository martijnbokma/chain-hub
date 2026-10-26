import { useEffect, useState } from 'react';
import { MDXProvider } from '@mdx-js/react';
import { Menu, Search, X } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { docPages } from '../lib/nav';
import { CodeBlock } from './CodeBlock';
import { DocsLink } from './DocsLink';
import { DocsSidebar } from './DocsSidebar';
import { LogoLockup } from './LogoLockup';
import { OnThisPage } from './OnThisPage';
import { PageNav } from './PageNav';
import { SearchDialog } from './SearchDialog';
import { ThemeToggle } from './ThemeToggle';

const mdxComponents = { a: DocsLink, pre: CodeBlock };

export function DocsLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const page = docPages.find((p) => p.path === location.pathname);

  // React Router doesn't scroll to hash fragments — do it ourselves, after
  // the MDX page has rendered.
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      return;
    }
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.pathname, location.hash]);

  // Close the mobile nav on Escape and on navigation.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  // ⌘K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-card focus:border focus:border-border focus:text-foreground focus:text-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-foreground" aria-label="Chain Hub — home">
            <LogoLockup className="h-6 w-auto" />
            <span className="hidden sm:inline font-mono text-xs uppercase tracking-widest text-muted-foreground mt-0.5">
              Docs
            </span>
          </a>
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="/"
              className="hidden sm:inline font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to site
            </a>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
              aria-label="Search documentation (⌘K)"
            >
              <Search size={14} aria-hidden="true" />
              <span className="hidden sm:inline text-xs">Search</span>
              <kbd className="hidden sm:inline font-mono text-[10px] text-muted-foreground border border-border rounded px-1">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
              aria-controls="docs-sidebar"
              className="md:hidden p-2 -m-2 text-foreground"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer — overlays the page instead of pushing content down */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 md:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            id="docs-sidebar"
            aria-label="Documentation navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-background border-r border-border px-6 pb-6 pt-24"
          >
            <DocsSidebar onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[220px_1fr] xl:grid-cols-[220px_minmax(0,1fr)_200px] gap-10">
        <aside className="hidden md:block md:sticky md:top-24 md:self-start">
          <DocsSidebar />
        </aside>

        <main id="main-content" className="docs-prose min-w-0">
          {page && (
            <>
              <h1>{page.title}</h1>
              {page.description && (
                <p className="text-lg text-muted-foreground -mt-3 mb-8 text-pretty">
                  {page.description}
                </p>
              )}
            </>
          )}
          <MDXProvider components={mdxComponents}>
            <Outlet />
          </MDXProvider>
          <PageNav />
        </main>

        <aside className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
          <OnThisPage file={page?.file} />
        </aside>
      </div>

      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-border">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Docs for chain-hub v{__CHAIN_HUB_VERSION__}
        </p>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
