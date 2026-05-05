import { realpathSync } from "fs"
import { allAdapters } from "../adapters"
import { isSymlink } from "../utils/fs"
import { isHubInitialized } from "./skills-service"

export function classifyLink(description: string, linkPath: string, chainHome: string): LinkStatus {
  if (!isSymlink(linkPath)) {
    return { description, status: "missing" }
  }
  let resolved: string
  try {
    resolved = realpathSync(linkPath)
  } catch {
    return { description, status: "broken" }
  }
  // Canonicalize chainHome so that symlinked aliases (e.g. /var → /private/var on macOS)
  // resolve to the same base path as realpathSync(linkPath).
  let canonicalHome: string
  try {
    canonicalHome = realpathSync(chainHome)
  } catch {
    canonicalHome = chainHome
  }
  // Append "/" to avoid sibling-prefix false positives: /tmp/chain-hub-backup
  // must not be considered inside /tmp/chain-hub.
  const isInside = resolved === canonicalHome || resolved.startsWith(canonicalHome + "/")
  if (isInside) {
    return { description, status: "ok", resolvedPath: resolved }
  }
  return { description, status: "warning", resolvedPath: resolved }
}

export interface LinkStatus {
  description: string
  /** ok: symlink resolves inside chainHome. warning: symlink resolves outside chainHome. broken: dangling symlink. missing: not a symlink at all. */
  status: "ok" | "warning" | "broken" | "missing"
  resolvedPath?: string
}

export interface AdapterStatus {
  name: string
  infoUrl?: string
  detected: boolean
  links: LinkStatus[]
}

export interface StatusResult {
  chainHome: string
  source?: string
  initialized: boolean
  adapters: AdapterStatus[]
}

export function getStatus(chainHome: string, source?: string): StatusResult {
  const adapters: AdapterStatus[] = allAdapters.map((adapter) => {
    const detected = adapter.detect()
    if (!detected) {
      return {
        name: adapter.name,
        infoUrl: adapter.infoUrl,
        detected: false,
        links: [],
      }
    }

    const links: LinkStatus[] = adapter.links(chainHome).map((link) =>
      classifyLink(link.description, link.to, chainHome),
    )

    return { name: adapter.name, infoUrl: adapter.infoUrl, detected: true, links }
  })

  return { chainHome, source, initialized: isHubInitialized(chainHome), adapters }
}
