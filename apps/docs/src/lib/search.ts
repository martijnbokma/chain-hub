import GithubSlugger from 'github-slugger';
import { docPages } from './nav';

// Raw MDX text for the client-side index — the corpus is ~1k lines, so an
// eager in-memory index beats any server or dependency here.
const rawModules = import.meta.glob('../content/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

type Section = {
  path: string;
  pageTitle: string;
  /** h2 text, or null for the page's intro before the first heading. */
  heading: string | null;
  /** Slugged heading for the #anchor link — same algorithm as rehype-slug. */
  anchor: string | null;
  text: string;
};

export type SearchResult = Section & {
  score: number;
  snippet: string;
};

const pathFromFile = (filePath: string): string => {
  const name = filePath.split('/').pop()!.replace(/\.mdx$/, '');
  return name === 'index' ? '/' : `/${name}`;
};

/** Strip frontmatter and markdown syntax so snippets read as plain text. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?|```/g, ' '))
    .replace(/^---[\s\S]*?---/, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*`>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const index: Section[] = Object.entries(rawModules).flatMap(([filePath, raw]) => {
  const path = pathFromFile(filePath);
  const page = docPages.find((p) => p.path === path);
  const pageTitle = page?.title ?? path;
  const body = raw.replace(/^---[\s\S]*?---/, '');

  // Split into sections at h2 boundaries; the part before the first h2 is
  // the page intro.
  const parts = body.split(/^## /m);
  const slugger = new GithubSlugger();

  return parts
    .map((part, i) => {
      if (i === 0) {
        return { path, pageTitle, heading: null, anchor: null, text: toPlainText(part) };
      }
      const newline = part.indexOf('\n');
      const heading = part.slice(0, newline).trim();
      return {
        path,
        pageTitle,
        heading,
        anchor: slugger.slug(heading),
        text: toPlainText(part.slice(newline)),
      };
    })
    .filter((section) => section.text.length > 0 || section.heading);
});

export function searchDocs(query: string): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return index
    .map((section) => {
      const hayTitle = `${section.pageTitle} ${section.heading ?? ''}`.toLowerCase();
      const hayText = section.text.toLowerCase();

      let score = 0;
      let firstHit = -1;
      for (const term of terms) {
        const inTitle = hayTitle.includes(term);
        const inText = hayText.indexOf(term);
        if (!inTitle && inText === -1) return null;
        score += (inTitle ? 3 : 0) + (inText >= 0 ? 1 : 0);
        if (inText >= 0 && (firstHit === -1 || inText < firstHit)) firstHit = inText;
      }

      const start = Math.max(0, firstHit - 60);
      const snippet =
        firstHit === -1
          ? section.text.slice(0, 160)
          : `${start > 0 ? '…' : ''}${section.text.slice(start, start + 160)}${
              start + 160 < section.text.length ? '…' : ''
            }`;

      return { ...section, score, snippet };
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
