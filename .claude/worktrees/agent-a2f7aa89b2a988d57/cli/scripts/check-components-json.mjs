import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const targetPath = path.join(repoRoot, "components.json");

if (!existsSync(targetPath)) {
  console.error(`[components.json] Missing file: ${targetPath}`);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(readFileSync(targetPath, "utf8"));
} catch (error) {
  console.error(`[components.json] Invalid JSON in ${targetPath}`);
  console.error(error);
  process.exit(1);
}

const requiredTopLevelKeys = ["style", "tailwind", "aliases", "iconLibrary"];

for (const key of requiredTopLevelKeys) {
  if (!(key in json)) {
    console.error(`[components.json] Missing required key: ${key}`);
    process.exit(1);
  }
}

if (typeof json.tailwind !== "object" || json.tailwind === null) {
  console.error("[components.json] tailwind must be an object.");
  process.exit(1);
}

if (typeof json.aliases !== "object" || json.aliases === null) {
  console.error("[components.json] aliases must be an object.");
  process.exit(1);
}

console.log(`[components.json] Validation passed for ${targetPath}.`);
