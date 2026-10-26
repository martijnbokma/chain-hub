import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type TocItem = { id: string; text: string };

/** "On this page" — h2 outline of the current article with a scrollspy. */
export function OnThisPage({ file }: { file?: string }) {
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
