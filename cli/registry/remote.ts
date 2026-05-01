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

export async function fetchRemoteIndex(): Promise<RemoteIndex> {
  const res = await fetch(INDEX_URL)
  if (!res.ok) throw new Error(`Failed to fetch registry index: ${res.status} ${res.statusText}`)
  const text = await res.text()
  return parse(text) as RemoteIndex
}

export async function searchRemote(query: string): Promise<RemoteSkill[]> {
  const index = await fetchRemoteIndex()
  const q = query.toLowerCase()
  return index.skills.filter(
    (s) => s.slug.includes(q) || s.description.toLowerCase().includes(q)
  )
}
