import kleur from "kleur"
import { existsSync } from "fs"
import { isAbsolute, join, normalize, resolve, sep } from "path"
import { fileURLToPath } from "url"
import { getChainHomeResolution } from "../utils/chain-home"
import { UserError } from "../utils/errors"
import {
  createSkill,
  listSkillsPayload,
  readSkill,
  removeSkill,
  writeSkill,
} from "../services/skills-service"
import { getStatus } from "../services/status-service"
import { fetchRegistry, installSkill } from "../services/registry-service"
import { runSetupService } from "../services/setup-service"
import { validateSkill } from "../services/validation-service"
import { assertValidSkillSlug } from "../utils/skill-slug"

interface HubOptions {
  port?: number | string
}

interface ApiErrorShape {
  error: string
  code: string
}

interface SkillsListApiResponse {
  skills: ReturnType<typeof listSkillsPayload>["skills"]
  initialized: boolean
  chainHome: string
  source: string
}

const DEFAULT_PORT = 2342

export function buildSkillsListResponse(chainHome: string, source: string): SkillsListApiResponse {
  const payload = listSkillsPayload(chainHome)
  return {
    skills: payload.skills,
    initialized: payload.initialized,
    chainHome,
    source,
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

function jsonError(status: number, error: string, code: string): Response {
  const payload: ApiErrorShape = { error, code }
  return json(payload, status)
}

function mapError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof UserError) {
    const message = error.message
    if (message.toLowerCase().includes("not found")) {
      return { status: 404, code: "not_found", message }
    }
    return { status: 400, code: "bad_request", message }
  }

  if (error instanceof SyntaxError) {
    return { status: 400, code: "invalid_json", message: "Request body must be valid JSON." }
  }

  if (error instanceof Error) {
    return { status: 500, code: "internal_error", message: error.message }
  }

  return { status: 500, code: "internal_error", message: String(error) }
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new UserError("Expected Content-Type: application/json.")
  }
  const data = await request.json()
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new UserError("JSON request body must be an object.")
  }
  return data as Record<string, unknown>
}

export function resolveStaticRoot(
  currentDir: string,
  pathExists: (path: string) => boolean = existsSync,
): string {
  const sourceHub = join(currentDir, "..", "..", "apps", "hub")
  const sourceCheckout = pathExists(sourceHub)

  const packagedDistHub = join(currentDir, "..", "hub")
  const localDistHub = join(currentDir, "dist", "hub")
  const localHub = join(currentDir, "hub")

  const candidates = sourceCheckout
    ? [sourceHub, packagedDistHub, localDistHub, localHub]
    : [packagedDistHub, localDistHub, localHub, sourceHub]

  return candidates.find((path) => pathExists(path)) ?? candidates[0]!
}

function getStaticRoot(): string {
  const currentDir = resolve(fileURLToPath(new URL(".", import.meta.url)))
  return resolveStaticRoot(currentDir)
}

function openBrowser(url: string): void {
  const platform = process.platform
  const command =
    platform === "darwin"
      ? ["open", url]
      : platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url]

  Bun.spawn(command, {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  })
}

async function serveStatic(pathname: string, staticRoot: string): Promise<Response> {
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

function parsePort(portArg?: number | string): number {
  if (typeof portArg === "undefined") return DEFAULT_PORT

  let parsedPort: number
  if (typeof portArg === "number") {
    parsedPort = portArg
  } else {
    const trimmedPort = portArg.trim()
    if (!/^\d+$/.test(trimmedPort)) {
      throw new UserError("Port must be an integer between 0 and 65535.")
    }
    parsedPort = Number.parseInt(trimmedPort, 10)
  }

  if (!Number.isInteger(parsedPort) || Number.isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new UserError("Port must be an integer between 0 and 65535.")
  }
  return parsedPort
}

export async function runHub(opts: HubOptions = {}): Promise<void> {
  const port = parsePort(opts.port)
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path
  const staticRoot = getStaticRoot()

  try {
    const server = Bun.serve({
      port,
      fetch: async (request) => {
        const url = new URL(request.url)
        const pathname = url.pathname

        try {
          if (pathname === "/api/skills" && request.method === "GET") {
            return json(buildSkillsListResponse(chainHome, resolution.source))
          }

          const skillMatch = pathname.match(/^\/api\/skills\/([^/]+)$/)
          if (skillMatch && request.method === "GET") {
            const slug = decodeURIComponent(skillMatch[1]!)
            const skill = readSkill(chainHome, slug)
            return json({ slug, ...skill })
          }

          if (skillMatch && request.method === "PUT") {
            const slug = decodeURIComponent(skillMatch[1]!)
            const body = await readJsonBody(request)
            const content = body.content
            if (typeof content !== "string") {
              throw new UserError("Field 'content' is required and must be a string.")
            }
            writeSkill(chainHome, slug, content)
            return json({ ok: true })
          }

          if (pathname === "/api/skills" && request.method === "POST") {
            const body = await readJsonBody(request)
            const slug = body.slug
            if (typeof slug !== "string" || slug.trim().length === 0) {
              throw new UserError("Field 'slug' is required and must be a non-empty string.")
            }
            createSkill(chainHome, assertValidSkillSlug(slug))
            return json({ ok: true }, 201)
          }

          if (skillMatch && request.method === "DELETE") {
            const slug = decodeURIComponent(skillMatch[1]!)
            removeSkill(chainHome, slug)
            return json({ ok: true })
          }

          const validateMatch = pathname.match(/^\/api\/skills\/([^/]+)\/validate$/)
          if (validateMatch && request.method === "POST") {
            const slug = decodeURIComponent(validateMatch[1]!)
            return json(validateSkill(chainHome, slug))
          }

          if (pathname === "/api/status" && request.method === "GET") {
            return json(getStatus(chainHome, resolution.source))
          }

          if (pathname === "/api/setup" && request.method === "POST") {
            const body =
              request.headers.get("content-length") === "0" ? {} : await readJsonBody(request)
            const ide = typeof body.ide === "string" ? body.ide : undefined
            const result = await runSetupService(chainHome, { ide })
            return json(result)
          }

          if (pathname === "/api/registry" && request.method === "GET") {
            return json(await fetchRegistry())
          }

          if (pathname === "/api/registry/install" && request.method === "POST") {
            const body = await readJsonBody(request)
            const slug = body.slug
            if (typeof slug !== "string" || slug.trim().length === 0) {
              throw new UserError("Field 'slug' is required and must be a non-empty string.")
            }

            const skill = typeof body.skill === "string" ? body.skill : undefined
            const pack = Boolean(body.pack)
            const result = await installSkill(chainHome, slug.trim(), { skill, pack })
            return json(result, 201)
          }

          if (pathname.startsWith("/api/")) {
            return jsonError(404, "API route not found.", "not_found")
          }

          return await serveStatic(pathname, staticRoot)
        } catch (error) {
          const mapped = mapError(error)
          return jsonError(mapped.status, mapped.message, mapped.code)
        }
      },
      error(error) {
        const mapped = mapError(error)
        return jsonError(mapped.status, mapped.message, mapped.code)
      },
    })

    const actualPort = server.port
    const url = `http://localhost:${actualPort}`
    console.log(kleur.bold("\n🌐 chain hub"))
    console.log(kleur.dim(`   CHAIN_HOME: ${chainHome} (${resolution.source})`))
    console.log(kleur.green(`   Running at ${url}\n`))

    try {
      openBrowser(url)
    } catch {
      // Browser-open is best-effort; server remains running.
    }

    await new Promise(() => {})
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const addrInUse =
      message.includes("EADDRINUSE") || message.toLowerCase().includes("address already in use")

    if (addrInUse && port !== 0) {
      throw new UserError(
        `Port ${port} is already in use. Use --port <n> to pick another port or --port 0 for an available port.`,
      )
    }

    throw error
  }
}
