import React, { useCallback, useEffect, useState } from 'react';
import { MDXProvider } from '@mdx-js/react';
import { Menu, Moon, Pencil, Search, Sun, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { docPages, docSections } from '../lib/nav';
import { CodeBlock } from './CodeBlock';
import { DocsLink } from './DocsLink';
import { SearchDialog } from './SearchDialog';

const mdxComponents = { a: DocsLink, pre: CodeBlock };

/** Drawn brand lockup — same paths as the marketing site, inked with currentColor + --primary so it follows the theme. */
function LogoLockup({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 356 64" role="img" aria-label="Chain Hub" className={className}>
      <path
        d="M46.14 17.86A20 20 0 1 0 46.14 46.14"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line x1="32" y1="32" x2="51" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="7" fill="currentColor" />
      <circle cx="55" cy="32" r="5" fill="var(--primary)" />
      <g transform="translate(86 2)">
        <path
          d="M37.14 15.86A20 20 0 1 0 37.14 44.14M48 10V50M48 38A12 12 0 0 1 72 38V50M106 26V50M82 38A12 12 0 1 0 106 38A12 12 0 1 0 82 38M116 26V50M126 26V50M126 38A12 12 0 0 1 150 38V50M170 10V50M196 10V50M170 30H196M206 26V38A12 12 0 0 0 230 38M230 26V50M240 10V50M240 38A12 12 0 1 1 264 38A12 12 0 1 1 240 38"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="116" cy="14" r="4" fill="var(--primary)" />
      </g>
    </svg>
  );
}

const THEME_KEY = 'chain-hub-theme';

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#1C1D1F' : '#F2F0EB');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove('theme-switching')),
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // storage unavailable — theme still applies for this session
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="p-2.5 -my-2.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

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
                    `block text-sm py-1.5 px-3 rounded-lg transition-colors ${
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

type TocItem = { id: string; text: string };

/** "On this page" — h2 outline of the current article with a scrollspy. */
function OnThisPage({ file }: { file?: string }) {
  const location = useLocation();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>('.docs-prose h2[id]'),
    );
    setItems(headings.map((h) => ({ id: h.id, text: h.textContent?.replace(/#$/, '') ?? h.id })));
    setActiveId(null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId((entry.target as HTMLElement).id);
          }
        }
      },
      { rootMargin: '-72px 0px -70% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [location.pathname]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="space-y-3">
      <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
        On this page
      </h2>
      <ul className="space-y-1 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block -ml-px border-l-2 py-1 pl-3 text-sm transition-colors ${
                activeId === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
      {file && (
        <a
          href={`https://github.com/martijnbokma/chain-hub/edit/develop/apps/docs/src/content/${file}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil size={12} aria-hidden="true" />
          Edit this page
        </a>
      )}
    </nav>
  );
}

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
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-[220px_1fr] xl:grid-cols-[220px_minmax(0,1fr)_200px] gap-10">
        <aside className="hidden md:block md:sticky md:top-24 md:self-start">
          <Sidebar />
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
