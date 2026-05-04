import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..");

assertCoreRegistryAligned(repoRoot);
assertRegistryIndexPaths(repoRoot);

const assets = [["core", "core"]];

for (const [sourceName, targetName] of assets) {
  const sourcePath = path.join(repoRoot, sourceName);
  const targetPath = path.join(packageRoot, targetName);

  if (!existsSync(sourcePath)) {
    console.error(`[package-assets] Missing source asset: ${sourcePath}`);
    process.exit(1);
  }

  rmSync(targetPath, { recursive: true, force: true });
  cpSync(sourcePath, targetPath, { recursive: true });
  console.log(`[package-assets] Synced ${sourceName}/ into cli/${targetName}/.`);
}

const registryIndex = path.join(repoRoot, "registry", "index.yaml");
const bundledRegistry = path.join(packageRoot, "registry", "bundled-index.yaml");
if (existsSync(registryIndex)) {
  mkdirSync(path.dirname(bundledRegistry), { recursive: true });
  cpSync(registryIndex, bundledRegistry);
  console.log("[package-assets] Synced registry/index.yaml → cli/registry/bundled-index.yaml.");
} else {
  console.error(`[package-assets] Missing registry index: ${registryIndex}`);
  process.exit(1);
}

const legacyTemplates = path.join(packageRoot, "templates");
if (existsSync(legacyTemplates)) {
  rmSync(legacyTemplates, { recursive: true, force: true });
  console.log("[package-assets] Removed legacy cli/templates/ (now under core/templates/).");
}

/**
 * @param {string} root
 */
function assertCoreRegistryAligned(root) {
  const regPath = path.join(root, "core", "registry.yaml");
  if (!existsSync(regPath)) {
    console.error(`[package-assets] Missing ${regPath}`);
    process.exit(1);
  }

  const reg = parse(readFileSync(regPath, "utf8")) ?? {};
  const prot = reg.protected ?? {};

  for (const slug of normalizeSlugList(prot.skills)) {
    const skillMd = path.join(root, "core", "skills", slug, "SKILL.md");
    if (!existsSync(skillMd)) {
      console.error(
        `[package-assets] Protected skill '${slug}' is listed in core/registry.yaml but missing ${path.relative(root, skillMd)}`,
      );
      process.exit(1);
    }
  }

  for (const slug of normalizeSlugList(prot.agents)) {
    const agentMd = path.join(root, "core", "agents", `${slug}.md`);
    if (!existsSync(agentMd)) {
      console.error(
        `[package-assets] Protected agent '${slug}' is listed in core/registry.yaml but missing ${path.relative(root, agentMd)}`,
      );
      process.exit(1);
    }
  }

  for (const slug of normalizeSlugList(prot.workflows)) {
    const wfMd = path.join(root, "core", "workflows", `${slug}.md`);
    if (!existsSync(wfMd)) {
      console.error(
        `[package-assets] Protected workflow '${slug}' is listed in core/registry.yaml but missing ${path.relative(root, wfMd)}`,
      );
      process.exit(1);
    }
  }

  for (const slug of normalizeSlugList(prot.rules)) {
    const base = path.join(root, "core", "rules", slug);
    if (!existsSync(`${base}.md`) && !existsSync(`${base}.mdc`)) {
      console.error(
        `[package-assets] Protected rule '${slug}' is listed in core/registry.yaml but missing core/rules/${slug}.md or .mdc`,
      );
      process.exit(1);
    }
  }
}

/**
 * @param {string} root
 */
function assertRegistryIndexPaths(root) {
  const indexPath = path.join(root, "registry", "index.yaml");
  if (!existsSync(indexPath)) {
    console.error(`[package-assets] Missing ${indexPath}`);
    process.exit(1);
  }

  const doc = parse(readFileSync(indexPath, "utf8")) ?? {};
  const skills = doc.skills;
  if (!Array.isArray(skills)) {
    console.error("[package-assets] registry/index.yaml must define a skills: array");
    process.exit(1);
  }

  for (const entry of skills) {
    const slug = entry?.slug;
    const relPath = entry?.path;
    if (typeof relPath !== "string" || !relPath.trim()) {
      console.error(`[package-assets] Registry index skill '${slug ?? "?"}' is missing a path`);
      process.exit(1);
    }
    const skillMd = path.join(root, relPath, "SKILL.md");
    if (!existsSync(skillMd)) {
      console.error(
        `[package-assets] Indexed skill '${slug}' points at missing file ${path.relative(root, skillMd)}`,
      );
      process.exit(1);
    }
  }
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeSlugList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((s) => String(s));
}
