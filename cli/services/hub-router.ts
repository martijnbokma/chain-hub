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
import {
  createContent,
  deleteContent,
  listContent,
  readContent,
  updateContent,
  type ContentKind,
} from "./content-service"
import { getStatus } from "./status-service"
import { fetchRegistry, installSkill } from "./registry-service"
import { runSetupService } from "./setup-service"
import { validateContent, validateSkill } from "./validation-service"
import { assertValidSkillSlug } from "../utils/skill-slug"
import { json, jsonError, mapError, readJsonBody } from "./hub-http-utils"
import { getStaticRoot, serveStatic } from "./hub-static"
import { previewReflect, runReflect } from "./reflect-service"
import {
  applyApprovedProposals,
  generateImproveProposals,
  getImproveRun,
  listImproveProposals,
  setProposalStatus,
} from "./improve-service"

const CONTENT_KINDS: ContentKind[] = ["skills", "rules", "agents", "workflows"]

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

function parseContentKind(raw: string): ContentKind {
  if (CONTENT_KINDS.includes(raw as ContentKind)) {
    return raw as ContentKind
  }
  throw new UserError(`Invalid content kind '${raw}'. Expected one of: ${CONTENT_KINDS.join(", ")}.`)
}

async function handleContentRoutes(
  request: Request,
  pathname: string,
  chainHome: string,
  activeResolution: ChainHomeResolution,
): Promise<Response | null> {
  // NOTE: contentListMatch must be computed before contentMatch, and the POST
  // branch for contentListMatch must come AFTER the GET branch for contentMatch.
  // This ordering is intentional and must not be changed.
  const contentListMatch = pathname.match(/^\/api\/content\/([^/]+)$/)
  if (contentListMatch && request.method === "GET") {
    const kind = parseContentKind(decodeURIComponent(contentListMatch[1]!))
    return json({
      items: listContent(chainHome, kind),
      chainHome,
      source: activeResolution.source,
    })
  }

  const contentMatch = pathname.match(/^\/api\/content\/([^/]+)\/([^/]+)$/)
  if (contentMatch && request.method === "GET") {
    const kind = parseContentKind(decodeURIComponent(contentMatch[1]!))
    const slug = decodeURIComponent(contentMatch[2]!)
    return json(readContent(chainHome, kind, slug))
  }

  if (contentListMatch && request.method === "POST") {
    const kind = parseContentKind(decodeURIComponent(contentListMatch[1]!))
    const body = await readJsonBody(request)
    const slug = body.slug
    if (typeof slug !== "string" || slug.trim().length === 0) {
      throw new UserError("Field 'slug' is required and must be a non-empty string.")
    }
    const content = body.content
    if (typeof content !== "undefined" && typeof content !== "string") {
      throw new UserError("Field 'content' must be a string when provided.")
    }
    const ext = body.ext
    if (typeof ext !== "undefined" && ext !== ".md" && ext !== ".mdc") {
      throw new UserError("Field 'ext' must be either '.md' or '.mdc' when provided.")
    }
    createContent(chainHome, {
      kind,
      slug: slug.trim(),
      content: typeof content === "string" ? content : "",
      ext: ext as ".md" | ".mdc" | undefined,
    })
    return json({ ok: true }, 201)
  }

  if (contentMatch && request.method === "PUT") {
    const kind = parseContentKind(decodeURIComponent(contentMatch[1]!))
    const slug = decodeURIComponent(contentMatch[2]!)
    const body = await readJsonBody(request)
    const content = body.content
    if (typeof content !== "string") {
      throw new UserError("Field 'content' is required and must be a string.")
    }
    const ext = body.ext
    if (typeof ext !== "undefined" && ext !== ".md" && ext !== ".mdc") {
      throw new UserError("Field 'ext' must be either '.md' or '.mdc' when provided.")
    }
    const newSlug = body.newSlug
    updateContent(chainHome, {
      kind,
      slug,
      newSlug: typeof newSlug === "string" ? newSlug : undefined,
      content,
      ext: ext as ".md" | ".mdc" | undefined,
    })
    return json({ ok: true })
  }

  if (contentMatch && request.method === "DELETE") {
    const kind = parseContentKind(decodeURIComponent(contentMatch[1]!))
    const slug = decodeURIComponent(contentMatch[2]!)
    deleteContent(chainHome, kind, slug)
    return json({ ok: true })
  }

  const contentValidateMatch = pathname.match(/^\/api\/content\/([^/]+)\/([^/]+)\/validate$/)
  if (contentValidateMatch && request.method === "POST") {
    const kind = parseContentKind(decodeURIComponent(contentValidateMatch[1]!))
    const slug = decodeURIComponent(contentValidateMatch[2]!)
    return json(validateContent(chainHome, kind, slug))
  }

  return null
}

async function handleSkillsRoutes(
  request: Request,
  pathname: string,
  chainHome: string,
  activeResolution: ChainHomeResolution,
): Promise<Response | null> {
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
    const newSlug = body.newSlug
    writeSkill(chainHome, slug, content, typeof newSlug === "string" ? newSlug : undefined)
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
  
  const toggleMatch = pathname.match(/^\/api\/skills\/([^/]+)\/toggle$/)
  if (toggleMatch && request.method === "POST") {
    const slug = decodeURIComponent(toggleMatch[1]!)
    const body = await readJsonBody(request)
    const enabled = Boolean(body.enabled)
    const { toggleSkill } = await import("./skills-service")
    toggleSkill(chainHome, slug, enabled)
    return json({ ok: true })
  }

  return null
}

async function handleImproveRoutes(
  request: Request,
  pathname: string,
  chainHome: string,
): Promise<Response | null> {
  if (pathname === "/api/improve/proposals/generate" && request.method === "POST") {
    const body =
      request.headers.get("content-length") === "0" ? {} : await readJsonBody(request)
    const maxProposals = typeof body.maxProposals === "number" ? body.maxProposals : undefined
    const scopes = Array.isArray(body.scopes) ? body.scopes.filter((item): item is string => typeof item === "string") : undefined
    return json(generateImproveProposals(chainHome, { maxProposals, scopes }))
  }

  if (pathname === "/api/improve/proposals" && request.method === "GET") {
    return json(listImproveProposals(chainHome))
  }

  if (pathname === "/api/improve/proposals/archive" && request.method === "POST") {
    const { archiveProposals } = await import("./improve-service")
    return json(archiveProposals(chainHome))
  }

  const proposalApproveMatch = pathname.match(/^\/api\/improve\/proposals\/([^/]+)\/approve$/)
  if (proposalApproveMatch && request.method === "POST") {
    const proposalId = decodeURIComponent(proposalApproveMatch[1]!)
    return json(setProposalStatus(chainHome, proposalId, "approved"))
  }

  const proposalRejectMatch = pathname.match(/^\/api\/improve\/proposals\/([^/]+)\/reject$/)
  if (proposalRejectMatch && request.method === "POST") {
    const proposalId = decodeURIComponent(proposalRejectMatch[1]!)
    return json(setProposalStatus(chainHome, proposalId, "rejected"))
  }

  if (pathname === "/api/improve/apply" && request.method === "POST") {
    const body = await readJsonBody(request)
    const proposalIds = Array.isArray(body.proposalIds)
      ? body.proposalIds.filter((id): id is string => typeof id === "string")
      : []
    return json(applyApprovedProposals(chainHome, proposalIds))
  }

  const improveRunMatch = pathname.match(/^\/api\/improve\/runs\/([^/]+)$/)
  if (improveRunMatch && request.method === "GET") {
    const runId = decodeURIComponent(improveRunMatch[1]!)
    return json(getImproveRun(chainHome, runId))
  }

  const improveRunRollbackMatch = pathname.match(/^\/api\/improve\/runs\/([^/]+)\/rollback$/)
  if (improveRunRollbackMatch && request.method === "POST") {
    const runId = decodeURIComponent(improveRunRollbackMatch[1]!)
    const { rollbackRun } = await import("./improve-service")
    return json(rollbackRun(chainHome, runId))
  }

  return null
}

async function handleConfigRoutes(
  request: Request,
  pathname: string,
  chainHome: string,
  activeResolution: ChainHomeResolution,
): Promise<Response | null> {
  if (pathname === "/api/config" && request.method === "GET") {
    const config = readChainConfig()
    return json({
      chainHome,
      source: activeResolution.source,
      configPath: getChainConfigPath(),
      configuredChainHome: config.chain_home ?? null,
      envOverrideActive: activeResolution.source === "env",
      status: getStatus(chainHome, activeResolution.source),
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: (globalThis as any).Bun?.version || null,
        uptime: Math.floor(process.uptime()),
      }
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

  return null
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
    if (pathname.startsWith("/api/content/")) {
      const response = await handleContentRoutes(request, pathname, chainHome, activeResolution)
      if (response) return response
    }

    if (pathname.startsWith("/api/skills")) {
      const response = await handleSkillsRoutes(request, pathname, chainHome, activeResolution)
      if (response) return response
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

    if (pathname.startsWith("/api/improve/")) {
      const response = await handleImproveRoutes(request, pathname, chainHome)
      if (response) return response
    }

    if (pathname.startsWith("/api/config")) {
      const response = await handleConfigRoutes(request, pathname, chainHome, activeResolution)
      if (response) return response
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
