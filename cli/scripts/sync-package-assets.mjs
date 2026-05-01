import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..");

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

const legacyTemplates = path.join(packageRoot, "templates");
if (existsSync(legacyTemplates)) {
  rmSync(legacyTemplates, { recursive: true, force: true });
  console.log("[package-assets] Removed legacy cli/templates/ (now under core/templates/).");
}
