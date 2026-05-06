import type { Server } from "bun"
import kleur from "kleur"
import { getChainHomeResolution } from "../utils/chain-home"
import { UserError } from "../utils/errors"
import { listSkillsPayload } from "../services/skills-service"
import { mapError, jsonError } from "../services/hub-http-utils"
import { routeRequest } from "../services/hub-router"
export { resolveStaticRoot } from "../services/hub-static"

interface HubOptions {
  port?: number | string
  open?: boolean
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
  const activeResolution = getChainHomeResolution()
  const chainHome = activeResolution.path
  return routeRequest(request, chainHome, activeResolution)
}

export async function runHub(opts: HubOptions = {}): Promise<void> {
  const requestedPort = parsePort(opts.port)
  const resolution = getChainHomeResolution()
  const chainHome = resolution.path
  const shouldAutoFallbackToAvailablePort = typeof opts.port === "undefined"

  const startServer = (port: number): Server<any> =>
    Bun.serve({
      port,
      fetch: (request) => handleRequest(request),
      error(error) {
        const mapped = mapError(error)
        return jsonError(mapped.status, mapped.message, mapped.code)
      },
    })

  try {
    let server: Server<any>
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

    if (opts.open !== false) {
      try {
        openBrowser(url)
      } catch {
        // Browser-open is best-effort; server remains running.
      }
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
