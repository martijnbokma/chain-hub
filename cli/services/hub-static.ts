import { existsSync } from "fs"
import { isAbsolute, join, normalize, resolve, sep } from "path"
import { fileURLToPath } from "url"
import { jsonError } from "./hub-http-utils"

export function resolveStaticRoot(
  currentDir: string,
  pathExists: (path: string) => boolean = existsSync,
): string {
  const sourceHub = join(currentDir, "..", "..", "apps", "hub")
  const sourceHubDist = join(sourceHub, "dist")
  const sourceCheckout = pathExists(sourceHub)

  const packagedDistHub = join(currentDir, "..", "hub")
  const localDistHub = join(currentDir, "dist", "hub")
  const localHub = join(currentDir, "hub")

  const candidates = sourceCheckout
    ? [sourceHubDist, packagedDistHub, localDistHub, localHub]
    : [packagedDistHub, localDistHub, localHub, sourceHubDist]

  return candidates.find((path) => pathExists(path)) ?? candidates[0]!
}

export function getStaticRoot(): string {
  const currentDir = resolve(fileURLToPath(new URL(".", import.meta.url)))
  return resolveStaticRoot(currentDir)
}

export async function serveStatic(pathname: string, staticRoot: string): Promise<Response> {
  const requestedPath =
    pathname === "/" || pathname === "" ? "index.html" : pathname.replace(/^\/+/, "")
  const normalizedRelativePath = normalize(requestedPath)
  const resolvedStaticRoot = resolve(staticRoot)
  const resolvedFilePath = resolve(resolvedStaticRoot, normalizedRelativePath)
  const pathEscapesStaticRoot =
    normalizedRelativePath.startsWith("..") ||
    isAbsolute(normalizedRelativePath) ||
    (resolvedFilePath !== resolvedStaticRoot &&
      !resolvedFilePath.startsWith(`${resolvedStaticRoot}${sep}`))

  if (pathEscapesStaticRoot) {
    return jsonError(404, "Static file not found.", "not_found")
  }

  const filePath = join(resolvedStaticRoot, normalizedRelativePath)
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    return jsonError(404, "Static file not found.", "not_found")
  }
  return new Response(file)
}
