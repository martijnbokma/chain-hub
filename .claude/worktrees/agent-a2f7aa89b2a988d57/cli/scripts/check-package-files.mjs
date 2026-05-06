import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

const requiredPaths = [
  "dist/chain.js",
  "dist/registry-index.yaml",
  "registry/bundled-index.yaml",
  "core/registry.yaml",
  "core/templates/components.json",
  "CHANGELOG.md",
  "README.md",
  "package.json",
];

for (const requiredPath of requiredPaths) {
  const absolutePath = path.join(packageRoot, requiredPath);
  if (!existsSync(absolutePath)) {
    console.error(`[package-files] Missing required package file: ${requiredPath}`);
    process.exit(1);
  }
}

const forbiddenPaths = [
  "skills",
  "agents",
  "workflows",
  "rules",
];

for (const forbiddenPath of forbiddenPaths) {
  const absolutePath = path.join(packageRoot, forbiddenPath);
  if (existsSync(absolutePath)) {
    console.error(`[package-files] Refusing to package private inventory path: ${forbiddenPath}`);
    process.exit(1);
  }
}

console.log("[package-files] Package boundary looks safe.");
