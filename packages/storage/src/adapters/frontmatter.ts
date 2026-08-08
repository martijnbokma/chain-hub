/** Re-export shared frontmatter helpers from contracts (single source of truth). */
export {
  assertWritableAssetContent,
  deriveDescription,
  ensureExplicitDescription,
  extractAssetAuthor,
  getExplicitDescription,
  listAssetCompatIssues,
  parseFrontmatter,
  stringifyFrontmatter,
  type FrontmatterData,
  type FrontmatterValue
} from "@chain-hub/contracts";
