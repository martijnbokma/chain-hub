/**
 * Open skills directory search (skills.sh), same API as `npx skills find`.
 * @see https://github.com/vercel-labs/skills/blob/main/src/find.ts
 */

export interface SkillsDirectoryHit {
  id: string
  skillId: string
  name: string
  source: string
  installs: number
}

interface SearchApiResponse {
  skills?: Array<{
    id: string
    skillId: string
    name: string
    installs: number
    source: string
  }>
}

function skillsApiBase(): string {
  const raw = process.env.SKILLS_API_URL?.trim() || "https://skills.sh"
  return raw.replace(/\/$/, "")
}

export async function searchSkillsDirectory(query: string, limit = 12): Promise<SkillsDirectoryHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const url = `${skillsApiBase()}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) return []
    const data = (await res.json()) as SearchApiResponse
    if (!Array.isArray(data.skills)) return []
    return data.skills.map((s) => ({
      id: String(s.id),
      skillId: String(s.skillId),
      name: String(s.name),
      source: String(s.source),
      installs: typeof s.installs === "number" ? s.installs : 0,
    }))
  } catch {
    return []
  }
}

export function skillsShPageUrl(hit: SkillsDirectoryHit): string {
  return `${skillsApiBase()}/${hit.id}`
}

/** `chain add` hint for a directory hit (GitHub-sourced skill). */
export function chainAddDirectoryHint(hit: SkillsDirectoryHit): string {
  return `chain add github:${hit.source} --skill ${hit.skillId}`
}
