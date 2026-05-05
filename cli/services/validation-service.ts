import { validateProject } from "../utils/validation"
import type { ValidationResult } from "../utils/validation"

export type { ValidationResult }

export function messageMatchesSlug(message: string, slug: string): boolean {
  const q = `'${slug}'`
  return (
    message.startsWith(`Skill ${slug}: `) ||
    message.includes(`Registry slug ${q}`) ||
    message.includes(`Directory ${q} in skills/`) ||
    message.includes(`Duplicate registry slug ${q}`) ||
    message.includes(`authorship.self slug ${q}`) ||
    message.includes(`github_sources skill ${q}`) ||
    message.includes(`Skill ${q} appears in more than one`) ||
    message.includes(`Core skill ${q}`)
  )
}

export function validateHub(chainHome: string): ValidationResult {
  return validateProject(chainHome)
}

export function validateSkill(chainHome: string, slug: string): { errors: string[]; warnings: string[]; skillsProcessed: number } {
  const result = validateProject(chainHome)
  return {
    errors: result.errors.filter((e) => messageMatchesSlug(e, slug)),
    warnings: result.warnings.filter((w) => messageMatchesSlug(w, slug)),
    skillsProcessed: result.skillsProcessed,
  }
}
