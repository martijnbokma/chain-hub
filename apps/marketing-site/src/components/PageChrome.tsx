import React from 'react';
import { Link } from 'react-router-dom';

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

export function SheetMarks() {
  return (
    <div className="bp-marks" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

type NavLink = { label: string; to: string };

const NAV_LINKS: NavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Docs', to: '/docs' },
];

export function TitleblockBar() {
  return (
    <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between pb-4">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm border border-primary flex items-center justify-center font-mono text-xs text-primary">
          CH
        </div>
        <span className="font-display font-semibold text-xl tracking-wide text-foreground uppercase">
          Chain Hub
        </span>
      </Link>
      <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="hover:text-foreground transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
