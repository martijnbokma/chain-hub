import type { ComponentType } from 'react';

type DocModule = {
  default: ComponentType;
  frontmatter: {
    title: string;
    section: string;
    order?: number;
    description?: string;
  };
};

const modules = import.meta.glob('../content/*.mdx', { eager: true }) as Record<string, DocModule>;

export type DocPage = {
  path: string;
  title: string;
  section: string;
  order: number;
  description?: string;
  /** Repo-relative content file name, e.g. "cli-reference.mdx" — powers "Edit on GitHub". */
  file: string;
  Component: ComponentType;
};

function pathFromFile(filePath: string): string {
  const name = filePath.split('/').pop()!.replace(/\.mdx$/, '');
  return name === 'index' ? '/' : `/${name}`;
}

export const docPages: DocPage[] = Object.entries(modules)
  .map(([filePath, mod]) => ({
    path: pathFromFile(filePath),
    title: mod.frontmatter.title,
    section: mod.frontmatter.section,
    order: mod.frontmatter.order ?? 0,
    description: mod.frontmatter.description,
    file: filePath.split('/').pop()!,
    Component: mod.default,
  }))
  .sort((a, b) => a.order - b.order);

const SECTION_ORDER = ['Overview', 'Guides', 'Reference'];

export const docSections = SECTION_ORDER.map((section) => ({
  section,
  pages: docPages.filter((page) => page.section === section),
})).filter((group) => group.pages.length > 0);
