/** Marketing GitHub repo URL — keep aligned with `Footer.astro`. */
export const CHAIN_HUB_GITHUB_REPO_URL = 'https://github.com/martijnbokman/chain-hub' as const;

export function getEditorFeedbackDiscussionsUrl(): string {
  return `${CHAIN_HUB_GITHUB_REPO_URL}/discussions`;
}

/** Optional short form (e.g. Tally); set `PUBLIC_EDITOR_FEEDBACK_FORM_URL` in host env. */
export function getEditorFeedbackFormUrl(): string | undefined {
  const raw = import.meta.env.PUBLIC_EDITOR_FEEDBACK_FORM_URL;
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}
