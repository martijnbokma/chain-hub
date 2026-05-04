import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { parse } from "yaml"

export interface RemoteSkill {
  slug: string
  description: string
  version: string
  source: string
  path: string
}

export interface RemoteIndex {
  schema_version: number
  skills: RemoteSkill[]
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

export async function fetchRemoteIndex(): Promise<RemoteIndex> {
  try {
    const res = await fetch(INDEX_URL)
    if (res.ok) {
      return parse(await res.text()) as RemoteIndex
    }
    const offline = readBundledRegistryIndex()
    if (offline) {
      console.warn(
        `[chain] Registry index unavailable (${res.status} ${res.statusText}); using bundled catalog. Publish registry/index.yaml on main for live updates.`,
      )
      return offline
    }
    throw new Error(`Failed to fetch registry index: ${res.status} ${res.statusText}`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Failed to fetch registry index:")) throw e
    const offline = readBundledRegistryIndex()
    if (offline) {
      console.warn("[chain] Registry index fetch failed; using bundled catalog.")
      return offline
    }
    throw e instanceof Error ? e : new Error(String(e))
  }
}

export async function searchRemote(query: string): Promise<RemoteSkill[]> {
  const index = await fetchRemoteIndex()
  const q = query.toLowerCase()
  return index.skills.filter(
    (s) => s.slug.includes(q) || s.description.toLowerCase().includes(q)
  )
}
