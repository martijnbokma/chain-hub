declare module '*.mdx' {
  import type { ComponentType } from 'react';

  export const frontmatter: {
    title: string;
    section: string;
    order?: number;
    description?: string;
  };

  const MDXComponent: ComponentType;
  export default MDXComponent;
}
