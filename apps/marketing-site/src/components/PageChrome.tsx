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
    <svg viewBox="0 0 259 64" role="img" aria-label="Chain Hub" className={className}>
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
      <path
        d="M91.37 46.42Q88.45 46.42 86.1 45.1Q83.74 43.79 82.39 41.5Q81.04 39.22 81.04 36.39Q81.04 33.52 82.39 31.25Q83.75 28.98 86.11 27.66Q88.47 26.34 91.4 26.34Q93.65 26.34 95.56 27.17Q97.48 27.99 98.89 29.55L95.51 32.96Q94.76 32.09 93.72 31.66Q92.68 31.22 91.4 31.22Q89.94 31.22 88.8 31.88Q87.67 32.54 87.02 33.68Q86.38 34.83 86.38 36.37Q86.38 37.88 87.02 39.05Q87.67 40.21 88.81 40.88Q89.95 41.54 91.4 41.54Q92.71 41.54 93.76 41.09Q94.81 40.63 95.56 39.75L98.94 43.15Q97.5 44.75 95.58 45.58Q93.66 46.42 91.37 46.42ZM114.43 46V34.98Q114.43 33.25 113.36 32.17Q112.28 31.09 110.61 31.09Q109.47 31.09 108.59 31.58Q107.71 32.07 107.22 32.95Q106.73 33.83 106.73 34.98L104.68 33.92Q104.68 31.68 105.65 29.98Q106.61 28.29 108.31 27.33Q110.01 26.36 112.18 26.36Q114.38 26.36 116.08 27.32Q117.77 28.27 118.72 29.94Q119.67 31.61 119.67 33.81V46ZM101.49 46V17.2H106.73V46ZM131.52 46.4Q128.89 46.4 126.79 45.08Q124.7 43.77 123.49 41.51Q122.28 39.25 122.28 36.41Q122.28 33.54 123.49 31.28Q124.7 29.01 126.79 27.69Q128.89 26.36 131.52 26.36Q133.59 26.36 135.22 27.21Q136.86 28.06 137.85 29.54Q138.84 31.02 138.91 32.92V39.85Q138.84 41.74 137.86 43.22Q136.89 44.71 135.24 45.55Q133.59 46.4 131.52 46.4ZM132.5 41.58Q134.69 41.58 136.03 40.12Q137.37 38.66 137.37 36.38Q137.37 34.85 136.77 33.68Q136.16 32.51 135.06 31.85Q133.97 31.18 132.5 31.18Q131.07 31.18 129.98 31.85Q128.88 32.51 128.25 33.68Q127.62 34.86 127.62 36.38Q127.62 37.9 128.24 39.08Q128.87 40.25 129.97 40.92Q131.07 41.58 132.5 41.58ZM137.11 46V40.83L137.94 36.14L137.11 31.49V26.76H142.29V46ZM146.51 46V26.76H151.75V46ZM149.13 23.68Q147.87 23.68 147.03 22.81Q146.2 21.95 146.2 20.69Q146.2 19.42 147.03 18.56Q147.87 17.7 149.13 17.7Q150.44 17.7 151.25 18.56Q152.07 19.42 152.07 20.69Q152.07 21.95 151.25 22.81Q150.44 23.68 149.13 23.68ZM168.92 46V34.98Q168.92 33.25 167.84 32.17Q166.77 31.09 165.09 31.09Q163.95 31.09 163.08 31.58Q162.2 32.07 161.7 32.95Q161.21 33.83 161.21 34.98L159.17 33.92Q159.17 31.68 160.15 29.98Q161.13 28.29 162.86 27.33Q164.59 26.36 166.78 26.36Q168.91 26.36 170.58 27.42Q172.24 28.48 173.2 30.18Q174.16 31.88 174.16 33.81V46ZM155.97 46V26.76H161.21V46ZM200.99 46V34.98Q200.99 33.25 199.92 32.17Q198.84 31.09 197.17 31.09Q196.03 31.09 195.15 31.58Q194.27 32.07 193.78 32.95Q193.28 33.83 193.28 34.98L191.24 33.92Q191.24 31.68 192.2 29.98Q193.17 28.29 194.86 27.33Q196.56 26.36 198.74 26.36Q200.94 26.36 202.63 27.32Q204.33 28.27 205.28 29.94Q206.23 31.61 206.23 33.81V46ZM188.05 46V17.2H193.28V46ZM218.25 46.42Q215.72 46.42 213.74 45.33Q211.77 44.25 210.66 42.34Q209.54 40.42 209.54 37.92V26.76H214.78V37.8Q214.78 38.99 215.19 39.84Q215.6 40.69 216.38 41.14Q217.17 41.6 218.26 41.6Q219.89 41.6 220.8 40.6Q221.7 39.61 221.7 37.8V26.76H226.94V37.92Q226.94 40.45 225.83 42.37Q224.73 44.28 222.77 45.35Q220.81 46.42 218.25 46.42ZM241.36 46.4Q239.28 46.4 237.6 45.53Q235.93 44.66 234.93 43.15Q233.93 41.64 233.85 39.75V32.92Q233.93 31.02 234.95 29.54Q235.96 28.06 237.63 27.21Q239.31 26.36 241.36 26.36Q244.03 26.36 246.14 27.69Q248.25 29.01 249.46 31.28Q250.68 33.54 250.68 36.41Q250.68 39.25 249.46 41.51Q248.25 43.77 246.14 45.08Q244.03 46.4 241.36 46.4ZM230.66 46V17.2H235.9V31.49L235.02 36.14L235.85 40.83V46ZM240.46 41.58Q241.9 41.58 242.99 40.92Q244.09 40.25 244.71 39.08Q245.34 37.9 245.34 36.38Q245.34 34.86 244.71 33.68Q244.09 32.51 242.99 31.85Q241.89 31.18 240.45 31.18Q239.02 31.18 237.91 31.85Q236.8 32.51 236.19 33.68Q235.58 34.85 235.58 36.38Q235.58 37.91 236.2 39.09Q236.81 40.26 237.92 40.92Q239.03 41.58 240.46 41.58Z"
        fill="currentColor"
      />
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
      className="p-2.5 -my-2.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function TitleblockBar() {
  return (
    <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
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
        <a
          href="https://github.com/martijnbokma/chain-hub"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub, opens in a new tab"
          className="hidden sm:inline-block -my-3 py-3 hover:text-foreground transition-colors"
        >
          GitHub ↗
        </a>
        <ThemeToggle />
      </nav>
      </div>
    </header>
  );
}
