import type { SkillLockEntry } from '@/types';

/** Mirrors `@chain-hub/contracts` — keep in sync. */
export function isUpstreamOwnedSkill(entry: SkillLockEntry | null | undefined): boolean {
  if (!entry) {
    return false;
  }

  return !entry.source.startsWith('upload://');
}

/** Best-effort browse URL for contributing changes back to a git skill source. */
export function resolveSkillUpstreamBrowseUrl(entry: SkillLockEntry | null | undefined): string | null {
  if (!entry || entry.sourceType !== 'git') {
    return null;
  }

  const raw = entry.source.trim();
  const sshMatch = raw.match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
  if (sshMatch) {
    const host = sshMatch[1];
    const repoPath = sshMatch[2]?.replace(/\.git$/i, '');
    if (host && repoPath) {
      return `https://${host}/${repoPath}`;
    }
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    url.username = '';
    url.password = '';
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\.git$/i, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}
