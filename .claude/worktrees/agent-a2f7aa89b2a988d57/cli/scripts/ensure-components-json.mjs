import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "../..");
const templatePath = path.join(repoRoot, "core", "templates", "components.json");
const targetPath = path.join(repoRoot, "components.json");

const ensureParentDir = (filePath) => {
  const parentPath = path.dirname(filePath);
  if (!existsSync(parentPath)) {
    mkdirSync(parentPath, { recursive: true });
  }
};

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

const writeJson = (filePath, value) => {
  const formatted = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(filePath, formatted, "utf8");
};

if (!existsSync(templatePath)) {
  console.error(`[components.json] Missing template at ${templatePath}`);
  process.exit(1);
}

const template = readJson(templatePath);

if (!existsSync(targetPath)) {
  ensureParentDir(targetPath);
  writeJson(targetPath, template);
  console.log(`[components.json] Created ${targetPath} from template.`);
  process.exit(0);
}

try {
  const existing = readJson(targetPath);
  const merged = {
    ...template,
    ...existing,
    tailwind: {
      ...template.tailwind,
      ...(existing.tailwind ?? {})
    },
    aliases: {
      ...template.aliases,
      ...(existing.aliases ?? {})
    }
  };

  const current = JSON.stringify(existing);
  const next = JSON.stringify(merged);

  if (current !== next) {
    writeJson(targetPath, merged);
    console.log(`[components.json] Normalized keys in ${targetPath}.`);
  } else {
    console.log(`[components.json] ${targetPath} already valid.`);
  }
} catch (error) {
  console.error(`[components.json] Invalid JSON in ${targetPath}.`);
  console.error(error);
  process.exit(1);
}
