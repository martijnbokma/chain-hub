import { join, resolve, extname } from "path"
import { readdirSync, statSync, existsSync, lstatSync, readlinkSync, readFileSync } from "fs"
import yaml from "yaml"
import { readProtectedCoreAssets } from "../registry/core"
import { validateRegistryIntegrity } from "./validators/registry"
import { validateSkillContent } from "./validators/skill"
import { validateWorkflowContent } from "./validators/workflow"
import { validateAgentContent } from "./validators/agent"
import { validateRuleContent } from "./validators/rule"

export interface ValidationResult {
  errors: string[]
  warnings: string[]
  skillsProcessed: number
  workflowsProcessed: number
  agentsProcessed: number
  rulesProcessed: number
}

export function validateProject(chainHome: string): ValidationResult {
  const result: ValidationResult = {
    errors: [],
    warnings: [],
    skillsProcessed: 0,
    workflowsProcessed: 0,
    agentsProcessed: 0,
    rulesProcessed: 0
  }

  const skillsDir = join(chainHome, "skills")
  const workflowsDir = join(chainHome, "workflows")
  const agentsDir = join(chainHome, "agents")
  const rulesDir = join(chainHome, "rules")
  const githubSourceSkills = readGithubSourceSkills(chainHome)

  // 1. Registry Integrity Check
  validateRegistryIntegrity(chainHome, result.errors)

  // 2. Protected Core Integrity Check
  validateProtectedCoreAssets(chainHome, result)

  // 3. Validate Skills
  if (existsSync(skillsDir)) {
    const skills = readdirSync(skillsDir)
    for (const skill of skills) {
      if (skill.startsWith("_")) continue
      const skillPath = join(skillsDir, skill)
      
      // Handle symlinks
      if (lstatSync(skillPath).isSymbolicLink()) {
        const target = readlinkSync(skillPath)
        const absTarget = resolve(skillsDir, target)
        if (!existsSync(absTarget)) {
          result.warnings.push(`Skill ${skill}: Broken symlink (points to ${target})`)
        }
        continue 
      }

      if (statSync(skillPath).isDirectory()) {
        result.skillsProcessed++
        validateSkillContent(skillPath, result.errors, result.warnings, {
          allowReservedName: githubSourceSkills.has(skill),
        })
      }
    }
  }

  // 4. Validate Workflows
  if (existsSync(workflowsDir)) {
    const workflows = readdirSync(workflowsDir)
    for (const workflow of workflows) {
      if (workflow.startsWith("_") || !workflow.endsWith(".md")) continue
      const workflowPath = join(workflowsDir, workflow)
      if (statSync(workflowPath).isFile()) {
        result.workflowsProcessed++
        validateWorkflowContent(workflowPath, result.errors, result.warnings)
      }
    }
  }

  // 5. Validate Agents
  if (existsSync(agentsDir)) {
    const agents = readdirSync(agentsDir)
    for (const agent of agents) {
      if (agent.startsWith("_") || !agent.endsWith(".md")) continue
      const agentPath = join(agentsDir, agent)
      if (statSync(agentPath).isFile()) {
        result.agentsProcessed++
        validateAgentContent(agentPath, result.errors, result.warnings)
      }
    }
  }

  // 6. Validate Rules
  if (existsSync(rulesDir)) {
    const rules = readdirSync(rulesDir)
    for (const rule of rules) {
      const ext = extname(rule)
      if (rule.startsWith("_") || (ext !== ".md" && ext !== ".mdc")) continue
      const rulePath = join(rulesDir, rule)
      if (statSync(rulePath).isFile()) {
        result.rulesProcessed++
        validateRuleContent(rulePath, result.errors, result.warnings)
      }
    }
  }

  return result
}

function validateProtectedCoreAssets(chainHome: string, result: ValidationResult): void {
  const core = readProtectedCoreAssets(chainHome)
  const coreDir = join(chainHome, "core")

  for (const slug of core.skills) {
    const skillPath = join(coreDir, "skills", slug)
    if (!existsSync(skillPath)) {
      result.errors.push(`Core skill '${slug}' is listed in core/registry.yaml but missing from core/skills/`)
      continue
    }

    if (!statSync(skillPath).isDirectory()) {
      result.errors.push(`Core skill '${slug}' must be a directory under core/skills/`)
      continue
    }

    result.skillsProcessed++
    validateSkillContent(skillPath, result.errors, result.warnings)
  }

  for (const slug of core.rules) {
    if (!coreRuleExists(coreDir, slug)) {
      result.errors.push(`Core rule '${slug}' is listed in core/registry.yaml but missing from core/rules/`)
    } else {
      result.rulesProcessed++
      const rulePath = existsSync(join(coreDir, "rules", `${slug}.mdc`))
        ? join(coreDir, "rules", `${slug}.mdc`)
        : join(coreDir, "rules", `${slug}.md`)
      validateRuleContent(rulePath, result.errors, result.warnings)
    }
  }

  for (const slug of core.agents) {
    const agentPath = join(coreDir, "agents", `${slug}.md`)
    if (!existsSync(agentPath)) {
      result.errors.push(`Core agent '${slug}' is listed in core/registry.yaml but missing from core/agents/`)
    } else {
      result.agentsProcessed++
      validateAgentContent(agentPath, result.errors, result.warnings)
    }
  }

  for (const slug of core.workflows) {
    const workflowPath = join(coreDir, "workflows", `${slug}.md`)
    if (!existsSync(workflowPath)) {
      result.errors.push(`Core workflow '${slug}' is listed in core/registry.yaml but missing from core/workflows/`)
    } else {
      result.workflowsProcessed++
      validateWorkflowContent(workflowPath, result.errors, result.warnings)
    }
  }
}

function coreRuleExists(coreDir: string, slug: string): boolean {
  return existsSync(join(coreDir, "rules", `${slug}.md`))
    || existsSync(join(coreDir, "rules", `${slug}.mdc`))
}

function readGithubSourceSkills(chainHome: string): Set<string> {
  const registryPath = join(chainHome, "skills-registry.yaml")
  if (!existsSync(registryPath)) return new Set()

  try {
    const registry = yaml.parse(readFileSync(registryPath, "utf-8"))
    const slugs = (registry?.github_sources || [])
      .flatMap((bundle: { skills?: unknown }) => Array.isArray(bundle.skills) ? bundle.skills : [])
      .map((slug: unknown) => String(slug))

    return new Set(slugs)
  } catch {
    return new Set()
  }
}

