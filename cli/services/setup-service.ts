import { allAdapters } from "../adapters"
import { forceRelink, removeRedundantGeminiSkillsSymlink } from "../utils/symlink"
import { ensureCoreAssets, ensureUserRegistry } from "../utils/core-assets"

export interface LinkSetupResult {
  description: string
  result: string
  error?: string
}

export interface SetupResult {
  adapterName: string
  links: LinkSetupResult[]
}

export interface MaintenanceResult {
  coreAssetsUpdated: boolean
  userRegistryEnsured: boolean
  redundantGeminiSymlinkRemoved: boolean
  /** Always "skipped" in the service layer; repo-hook installation is CLI-only. */
  repoHook: "skipped"
}

export interface SetupServiceResult {
  maintenance: MaintenanceResult
  results: SetupResult[]
}

export async function runSetupService(chainHome: string, opts: { ide?: string } = {}): Promise<SetupServiceResult> {
  ensureCoreAssets({ chainHome })
  ensureUserRegistry({ chainHome })

  const adapters = allAdapters.filter((a) => {
    if (opts.ide) return a.name.toLowerCase().includes(opts.ide.toLowerCase())
    return a.detect()
  })

  const results: SetupResult[] = []

  for (const adapter of adapters) {
    const links: LinkSetupResult[] = []

    for (const link of adapter.links(chainHome)) {
      try {
        const result = forceRelink(link.from, link.to)
        links.push({ description: link.description, result })
      } catch (err) {
        links.push({
          description: link.description,
          result: "failed",
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    results.push({ adapterName: adapter.name, links })
  }

  const redundantGeminiSymlinkRemoved = removeRedundantGeminiSkillsSymlink(chainHome)

  return {
    maintenance: {
      coreAssetsUpdated: true,
      userRegistryEnsured: true,
      redundantGeminiSymlinkRemoved,
      repoHook: "skipped",
    },
    results,
  }
}
