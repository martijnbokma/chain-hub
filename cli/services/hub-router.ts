import { existsSync, mkdirSync, statSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"
import { getChainHomeResolution, type ChainHomeResolution } from "../utils/chain-home"
import { getChainConfigPath, readChainConfig, writeChainConfig } from "../utils/chain-config"
import { UserError } from "../utils/errors"
import {
  createSkill,
  listSkillsPayload,
  readSkill,
  removeSkill,
  writeSkill,
} from "./skills-service"
import { getStatus } from "./status-service"
import { fetchRegistry, installSkill } from "./registry-service"
import { runSetupService } from "./setup-service"
import { validateSkill } from "./validation-service"
import { assertValidSkillSlug } from "../utils/skill-slug"
import { json, jsonError, mapError, readJsonBody } from "./hub-http-utils"
import { getStaticRoot, serveStatic } from "./hub-static"
import { previewReflect, runReflect } from "./reflect-service"

function buildSkillsListResponse(
  chainHome: string,
  source: string,
): { skills: ReturnType<typeof listSkillsPayload>["skills"]; initialized: boolean; chainHome: string; source: string } {
  const payload = listSkillsPayload(chainHome)
  return {
    skills: payload.skills,
    initialized: payload.initialized,
    chainHome,
    source,
  }
}

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

export async function routeRequest(
  request: Request,
  chainHome: string,
  activeResolution: ChainHomeResolution,
): Promise<Response> {
  const staticRoot = getStaticRoot()
  const url = new URL(request.url)
  const pathname = url.pathname

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
      const description = body.description
      if (typeof description !== "undefined" && typeof description !== "string") {
        throw new UserError("Field 'description' must be a string when provided.")
      }
      createSkill(chainHome, assertValidSkillSlug(slug), description)
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

    if (pathname === "/api/reflect/preview" && request.method === "POST") {
      return json(previewReflect(chainHome))
    }

    if (pathname === "/api/reflect/run" && request.method === "POST") {
      return json(runReflect(chainHome))
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
