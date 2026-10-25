import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { searchDocs } from '../lib/search';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = searchDocs(query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (index: number) => {
    const result = results[index];
    if (!result) return;
    navigate(result.anchor ? `${result.path}#${result.anchor}` : result.path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        className="mx-auto max-w-xl border border-border rounded-xl bg-card shadow-lg overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (event.key === 'Enter') go(active);
            }}
            placeholder="Search docs…"
            aria-label="Search documentation"
            className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        {query.trim() !== '' && (
          <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
            {results.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground text-center">
                Nothing found — try a different term.
              </li>
            )}
            {results.map((result, i) => (
              <li key={`${result.path}#${result.anchor ?? ''}`}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    i === active ? 'bg-secondary/60' : ''
                  }`}
                >
                  <span className="block text-sm text-foreground">
                    {result.pageTitle}
                    {result.heading && (
                      <span className="text-muted-foreground"> — {result.heading}</span>
                    )}
                  </span>
                  {result.snippet && (
                    <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                      {result.snippet}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
