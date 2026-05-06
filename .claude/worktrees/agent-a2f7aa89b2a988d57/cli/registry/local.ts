import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { parse, stringify } from "yaml"
import { getChainHome } from "../utils/chain-home"
import { isProtectedCoreSkill } from "./core"
export { isProtectedCoreSkill } from "./core"

/** Slugs you treat as your own work (editable; orthogonal to meta/pack/community buckets). */
export interface SkillsAuthorship {
  self: string[]
}

/** Skills installed from the same GitHub repo (grouped for attribution). */
export interface GithubSourceBundle {
  /** Normalized ref, e.g. github:owner/repo */
  github: string
  /** Human-readable credits (edit freely). */
  credits: string
  skills: string[]
}

export interface SkillsRegistry {
  schema_version: number
  chain_hub: string[]
  personal: string[]
  packs?: string[]
  community?: string[]
  cli_packages: string[]
  /** Optional: which registered skills you authored or maintain as yours vs upstream/vendor. */
  authorship?: SkillsAuthorship
  /** Optional: group skills by GitHub install source + credits. */
  github_sources?: GithubSourceBundle[]
  vendor_submodules?: Array<{ path: string }>
}

export function collectRegistrySlugs(reg: SkillsRegistry): string[] {
  return [
    ...(reg.chain_hub || []),
    ...(reg.personal || []),
    ...(reg.packs || []),
    ...(reg.community || []),
    ...(reg.cli_packages || []),
  ].map((s) => String(s))
}

function registryPath(): string {
  return join(getChainHome(), "skills-registry.yaml")
}

export function defaultGithubCredits(githubRef: string): string {
  const m = githubRef.match(/^github:([^/]+)\/(.+)$/)
  if (!m) return githubRef
  const [, owner, repo] = m
  return `${owner}/${repo} — https://github.com/${owner}/${repo}`
}

function upsertGithubBundle(reg: SkillsRegistry, githubRef: string, slug: string, credits?: string): void {
  if (!githubRef.startsWith("github:")) return
  if (!reg.github_sources) reg.github_sources = []
  let bundle = reg.github_sources.find((b) => b.github === githubRef)
  if (!bundle) {
    bundle = {
      github: githubRef,
      credits: credits ?? defaultGithubCredits(githubRef),
      skills: [],
    }
    reg.github_sources.push(bundle)
  } else if (credits && credits.trim().length > 0) {
    bundle.credits = credits
  }
  if (!bundle.skills.includes(slug)) {
    bundle.skills.push(slug)
    bundle.skills.sort()
  }
  reg.github_sources.sort((a, b) => a.github.localeCompare(b.github))
}

export function readRegistry(): SkillsRegistry {
  const path = registryPath()
  if (!existsSync(path)) {
    return { schema_version: 1, chain_hub: [], personal: [], cli_packages: [] }
  }
  const content = readFileSync(path, "utf8")
  return (parse(content) as SkillsRegistry) ?? { schema_version: 1, chain_hub: [], personal: [], cli_packages: [] }
}

export function writeRegistry(registry: SkillsRegistry): void {
  // Maintain comments if possible? Yaml-lib doesn't do this easily.
  // For now, simple write.
  writeFileSync(registryPath(), stringify(registry), "utf8")
}

export type InstallBucket = "chain_hub" | "personal" | "packs" | "community" | "cli_packages"

export const ALL_BUCKETS = ["chain_hub", "personal", "packs", "community", "cli_packages"] as const satisfies readonly InstallBucket[]

const BUCKET_KEY_MAP: Record<InstallBucket, InstallBucket> = {
  chain_hub: "chain_hub",
  personal: "personal",
  packs: "packs",
  community: "community",
  cli_packages: "cli_packages",
}

function resolveInstallBucket(
  bucket: InstallBucket | undefined,
): keyof Pick<SkillsRegistry, "chain_hub" | "personal" | "packs" | "community" | "cli_packages"> {
  return BUCKET_KEY_MAP[bucket ?? "personal"]
}

export function addSkill(opts: {
  slug: string
  source?: string
  version?: string
  credits?: string
  bucket?: InstallBucket
}): void {
  if (isProtectedCoreSkill(opts.slug)) return

  const reg = readRegistry()

  if (collectRegistrySlugs(reg).includes(opts.slug)) return

  const bucketKey = resolveInstallBucket(opts.bucket)
  if (!reg[bucketKey]) reg[bucketKey] = []
  ;(reg[bucketKey] as string[]).push(opts.slug)
  ;(reg[bucketKey] as string[]).sort()

  if (opts.source?.startsWith("github:")) {
    upsertGithubBundle(reg, opts.source, opts.slug, opts.credits)
  }

  writeRegistry(reg)
}

function filterSlugFromBucket(
  reg: SkillsRegistry,
  key: keyof Pick<SkillsRegistry, "chain_hub" | "personal" | "packs" | "community" | "cli_packages">,
  slug: string,
): void {
  if (reg[key]) reg[key] = (reg[key] as string[]).filter((s) => s !== slug)
}

export function removeSkill(slug: string): void {
  const reg = readRegistry()
  for (const key of ALL_BUCKETS) {
    filterSlugFromBucket(reg, key, slug)
  }
  if (reg.authorship?.self) {
    reg.authorship.self = reg.authorship.self.filter((s) => s !== slug)
  }
  if (reg.github_sources?.length) {
    reg.github_sources = reg.github_sources
      .map((b) => ({
        ...b,
        skills: b.skills.filter((s) => s !== slug),
      }))
      .filter((b) => b.skills.length > 0)
    if (reg.github_sources.length === 0) delete reg.github_sources
  }
  writeRegistry(reg)
}
