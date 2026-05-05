import { UserError } from "./errors"

const SKILL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSkillSlug(slug: string): boolean {
  if (typeof slug !== "string") return false
  if (slug.length === 0) return false
  if (slug.includes("/") || slug.includes("\\")) return false
  if (slug.includes("..")) return false
  if (slug.includes("%2f") || slug.includes("%2F") || slug.includes("%5c") || slug.includes("%5C")) {
    return false
  }
  if (!SKILL_SLUG_PATTERN.test(slug)) return false
  return true
}

export function assertValidSkillSlug(slug: string): string {
  const normalized = slug.trim()
  if (!isValidSkillSlug(normalized)) {
    throw new UserError(
      "Invalid skill slug. Use kebab-case only (lowercase letters, numbers, and single hyphens).",
    )
  }
  return normalized
}

export function assertSafeSkillPathSegment(slug: string): string {
  const normalized = slug.trim()
  if (!normalized) {
    throw new UserError("Invalid skill slug. Slug cannot be empty.")
  }
  if (normalized.includes("/") || normalized.includes("\\")) {
    throw new UserError("Invalid skill slug. Path separators are not allowed.")
  }
  if (normalized.includes("..")) {
    throw new UserError("Invalid skill slug. Relative path segments are not allowed.")
  }
  if (normalized.includes("%2f") || normalized.includes("%2F") || normalized.includes("%5c") || normalized.includes("%5C")) {
    throw new UserError("Invalid skill slug. Encoded path separators are not allowed.")
  }
  return normalized
}
