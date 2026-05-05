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

export async function fetchRemoteIndex(): Promise<RemoteIndex> {
  try {
    const res = await fetch(INDEX_URL)
    if (res.ok) {
      return { ...(parse(await res.text()) as RemoteIndex), source: "live" }
    }
    const offline = readBundledRegistryIndex()
    if (offline) {
      return { ...offline, source: "bundled" }
    }
    throw new Error(`Failed to fetch registry index: ${res.status} ${res.statusText}`)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Failed to fetch registry index:")) throw e
    const offline = readBundledRegistryIndex()
    if (offline) {
      return { ...offline, source: "bundled" }
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
