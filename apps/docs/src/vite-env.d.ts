declare const __CHAIN_HUB_VERSION__: string;

/** Raw .mdx sources keyed by filename, emitted by docsRawPlugin in vite.config.ts. */
declare module 'virtual:docs-raw' {
  const files: Record<string, string>;
  export default files;
}
