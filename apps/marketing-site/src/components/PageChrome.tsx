import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

export function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.76 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a10.98 10.98 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** Drawn brand lockup — same paths as public/logo-lockup.svg, inked with currentColor + --primary so it follows the theme. */
export function LogoLockup({ className }: { className?: string }) {
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

/** Brand mark only — used as an ornament (CTA), themes like the lockup. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
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
      className="p-2 -my-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function TitleblockBar() {
  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center text-foreground" aria-label="Chain Hub, home">
        <LogoLockup className="h-6 w-auto" />
      </Link>
      <nav className="flex items-center gap-6 text-sm text-muted-foreground">
        <a href="#why" className="hidden sm:inline-block -my-3 py-3 hover:text-foreground transition-colors">
          Why
        </a>
        <a href="#what" className="hidden sm:inline-block -my-3 py-3 hover:text-foreground transition-colors">
          What
        </a>
        <a href="#how" className="hidden sm:inline-block -my-3 py-3 hover:text-foreground transition-colors">
          How
        </a>
        {/* Separate Vite app (apps/docs), reverse-proxied under /docs — plain link, not a router route here */}
        <a href="/docs/" className="inline-block -my-3 py-3 hover:text-foreground transition-colors">
          Docs
        </a>
        <ThemeToggle />
      </nav>
      </div>
    </header>
  );
}
