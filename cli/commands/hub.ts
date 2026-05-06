import kleur from "kleur"
import { existsSync, mkdirSync, statSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"
import { getChainHomeResolution } from "../utils/chain-home"
import { getChainConfigPath, readChainConfig, writeChainConfig } from "../utils/chain-config"
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
import { json, jsonError, mapError, readJsonBody } from "../services/hub-http-utils"
import { getStaticRoot, serveStatic } from "../services/hub-static"
export { resolveStaticRoot } from "../services/hub-static"

interface HubOptions {
  port?: number | string
}

interface SkillsListApiResponse {
  skills: ReturnType<typeof listSkillsPayload>["skills"]
  initialized: boolean
  chainHome: string
  source: string
}

const DEFAULT_PORT = 2342

function normalizeChainHomePath(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith("~/")) {
    return resolve(join(homedir(), trimmed.slice(2)))
  }
  return resolve(trimmed)
}

function validateChainHomeTarget(path: string): void {
  try {
    const stats = statSync(path)
    if (!stats.isDirectory()) {
      throw new UserError(`CHAIN_HOME must be a directory path, but "${path}" is not a directory.`)
    }
    return
  } catch (error) {
    if (error instanceof UserError) throw error
    // Path does not exist yet; ensure parent is creatable.
    const parent = resolve(path, "..")
    if (!existsSync(parent)) {
      throw new UserError(`Parent directory does not exist: ${parent}`)
    }
  }
}

export function buildSkillsListResponse(chainHome: string, source: string): SkillsListApiResponse {
  const payload = listSkillsPayload(chainHome)
  return {
    skills: payload.skills,
    initialized: payload.initialized,
    chainHome,
    source,
  }
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

function isPortInUseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const normalizedMessage = message.toLowerCase()
  return (
    message.includes("EADDRINUSE") ||
    normalizedMessage.includes("address already in use") ||
    normalizedMessage.includes("failed to start server. is port") ||
    (normalizedMessage.includes("port") && normalizedMessage.includes("in use"))
  )
}

export async function handleRequest(
  request: Request,
): Promise<Response> {
  const staticRoot = getStaticRoot()
  const url = new URL(request.url)
  const pathname = url.pathname
  const activeResolution = getChainHomeResolution()
  const chainHome = activeResolution.path

  try {
    if (pathname === "/api/skills" && request.method === "GET") {
      return json(buildSkillsListResponse(chainHome, activeResolution.source))
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
      return json(getStatus(chainHome, activeResolution.source))
    }

    if (pathname === "/api/setup" && request.method === "POST") {
      const body =
        request.headers.get("content-length") === "0" ? {} : await readJsonBody(request)
      const ide = typeof body.ide === "string" ? body.ide : undefined
      const result = await runSetupService(chainHome, { ide })
      return json(result)
    }

    if (pathname === "/api/config" && request.method === "GET") {
      const config = readChainConfig()
      return json({
        chainHome,
        source: activeResolution.source,
        configPath: getChainConfigPath(),
        configuredChainHome: config.chain_home ?? null,
        envOverrideActive: activeResolution.source === "env",
        status: getStatus(chainHome, activeResolution.source),
      })
    }

    if (pathname === "/api/config/chain-home" && request.method === "POST") {
      const body = await readJsonBody(request)
      const rawChainHome = body.chainHome
      if (typeof rawChainHome !== "string" || rawChainHome.trim().length === 0) {
        throw new UserError("Field 'chainHome' is required and must be a non-empty string.")
      }

      const nextChainHome = normalizeChainHomePath(rawChainHome)
      validateChainHomeTarget(nextChainHome)
      mkdirSync(nextChainHome, { recursive: true })

      const config = readChainConfig()
      config.chain_home = nextChainHome
      writeChainConfig(config)

      const refreshedResolution = getChainHomeResolution()
      return json({
        ok: true,
        chainHome: refreshedResolution.path,
        source: refreshedResolution.source,
        requestedChainHome: nextChainHome,
        envOverrideActive: refreshedResolution.source === "env",
        status: getStatus(refreshedResolution.path, refreshedResolution.source),
      })
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
}

export async function runHub(opts: HubOptions = {}): Promise<void> {
  const requestedPort = parsePort(opts.port)
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path
  const shouldAutoFallbackToAvailablePort = typeof opts.port === "undefined"

  const startServer = (port: number): Server =>
    Bun.serve({
      port,
      fetch: (request) => handleRequest(request),
      error(error) {
        const mapped = mapError(error)
        return jsonError(mapped.status, mapped.message, mapped.code)
      },
    })

  try {
    let server: Server
    let usedFallbackPort = false

    try {
      server = startServer(requestedPort)
    } catch (error) {
      const addrInUse = isPortInUseError(error)

      if (addrInUse && shouldAutoFallbackToAvailablePort && requestedPort !== 0) {
        usedFallbackPort = true
        server = startServer(0)
      } else {
        throw error
      }
    }

    const actualPort = server.port
    const url = `http://localhost:${actualPort}`
    console.log(kleur.bold("\n🌐 chain hub"))
    console.log(kleur.dim(`   CHAIN_HOME: ${chainHome} (${resolution.source})`))
    if (usedFallbackPort) {
      console.log(kleur.yellow(`   Port ${requestedPort} was in use, selected available port ${actualPort}.`))
    }
    console.log(kleur.green(`   Running at ${url}\n`))

    try {
      openBrowser(url)
    } catch {
      // Browser-open is best-effort; server remains running.
    }

    await new Promise(() => {})
  } catch (error) {
    const addrInUse = isPortInUseError(error)

    if (addrInUse && requestedPort !== 0) {
      throw new UserError(
        `Port ${requestedPort} is already in use. Use --port <n> to pick another port or --port 0 for an available port.`,
      )
    }

    throw error
  }
}
