import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { parse } from "yaml"

export interface RemoteSkill {
  slug: string
  description: string
  version: string
  source: string
  githubOwner?: string
  credits?: string
  path: string
}

export interface RemoteIndex {
  schema_version: number
  skills: RemoteSkill[]
  /** Populated by fetchRemoteIndex: "live" when fetched from network, "bundled" when using the offline fallback. */
  source?: "live" | "bundled"
}

const INDEX_URL =
  "https://raw.githubusercontent.com/martijnbokma/chain-hub/HEAD/registry/index.yaml"

function readBundledRegistryIndex(): RemoteIndex | null {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [join(here, "registry-index.yaml"), join(here, "bundled-index.yaml")]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      return parse(readFileSync(p, "utf8")) as RemoteIndex
    } catch {
      continue
    }
  }
  return null
}

function populateOwners(index: RemoteIndex): RemoteIndex {
  return {
    ...index,
    skills: index.skills.map(s => {
      let githubOwner: string | undefined = undefined
      let credits = s.credits

      if (s.source && s.source.startsWith("github:")) {
        const parts = s.source.split("github:")[1]?.split("/")
        if (parts && parts[0]) {
          githubOwner = parts[0]
          if (!credits && parts[1]) {
            credits = `${parts[0]}/${parts[1]} — https://github.com/${parts[0]}/${parts[1]}`
          }
        }
      }

      // Special case for obra/superpowers
      if (s.slug.includes("superpowers") && (!githubOwner || githubOwner === "martijnbokma")) {
        githubOwner = "obra"
        credits = "obra/superpowers — https://github.com/obra/superpowers"
      }

      return { ...s, githubOwner, credits }
    })
  }
}

export async function fetchRemoteIndex(): Promise<RemoteIndex> {
  try {
    const res = await fetch(INDEX_URL)
    if (res.ok) {
      const index = parse(await res.text()) as RemoteIndex
      return { ...populateOwners(index), source: "live" }
    }
    const offline = readBundledRegistryIndex()
    if (offline) {
      return { ...populateOwners(offline), source: "bundled" }
    }
    throw new Error(`Failed to fetch registry index: ${res.status} ${res.statusText}`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Failed to fetch registry index:")) throw e
    const offline = readBundledRegistryIndex()
    if (offline) {
      return { ...populateOwners(offline), source: "bundled" }
    }
    throw e instanceof Error ? e : new Error(String(e))
  }
}

/** Higher scores sort first. Zero means no match (excluded from results). */
export function scoreRegistryMatch(skill: RemoteSkill, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 1

  const slug = skill.slug.toLowerCase()
  const desc = skill.description.toLowerCase()

  if (slug === q) return 1_000_000

  const slugSegments = slug.split("-")
  if (slugSegments.some((seg) => seg === q)) return 850_000

  if (slug.startsWith(q)) return 800_000
  if (slug.includes(q)) return 600_000
  if (desc.includes(q)) return 400_000

  const tokens = q.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) return 0

  const everyToken = tokens.every((t) => desc.includes(t) || slug.includes(t))
  if (everyToken) return 200_000 + tokens.length * 500

  const someToken = tokens.some((t) => desc.includes(t) || slug.includes(t))
  return someToken ? 50_000 : 0
}

export function filterAndRankRegistrySkills(skills: RemoteSkill[], query: string): RemoteSkill[] {
  return skills
    .map((s) => ({ skill: s, score: scoreRegistryMatch(s, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.slug.localeCompare(b.skill.slug))
    .map((x) => x.skill)
}

export async function searchRemote(query: string): Promise<RemoteSkill[]> {
  const index = await fetchRemoteIndex()
  return filterAndRankRegistrySkills(index.skills, query)
}
