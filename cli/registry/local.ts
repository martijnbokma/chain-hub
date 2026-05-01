import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import { parse, stringify } from "yaml"
import { getChainHome } from "../utils/chain-home"
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

export function addSkill(opts: {
  slug: string
  source?: string
  version?: string
  credits?: string
  bucket?: "chain_hub" | "personal"
}): void {
  const reg = readRegistry()

  if (collectRegistrySlugs(reg).includes(opts.slug)) return

  const bucket = opts.bucket ?? "personal"
  if (bucket === "chain_hub") {
    if (!reg.chain_hub) reg.chain_hub = []
    reg.chain_hub.push(opts.slug)
    reg.chain_hub.sort()
  } else {
    if (!reg.personal) reg.personal = []
    reg.personal.push(opts.slug)
    reg.personal.sort()
  }

  if (opts.source?.startsWith("github:")) {
    upsertGithubBundle(reg, opts.source, opts.slug, opts.credits)
  }

  writeRegistry(reg)
}

export function removeSkill(slug: string): void {
  const reg = readRegistry()
  if (reg.chain_hub) reg.chain_hub = reg.chain_hub.filter((s) => s !== slug)
  if (reg.personal) reg.personal = reg.personal.filter((s) => s !== slug)
  if (reg.packs) reg.packs = reg.packs.filter((s) => s !== slug)
  if (reg.community) reg.community = reg.community.filter((s) => s !== slug)
  if (reg.cli_packages) reg.cli_packages = reg.cli_packages.filter((s) => s !== slug)
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
