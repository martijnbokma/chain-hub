import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const tempRoot = path.join(tmpdir(), `chain-package-smoke-${Date.now()}`);
let tarballPath;

try {
  const pack = run("npm", ["pack", "--json"], { cwd: packageRoot });
  const stdoutLines = pack.stdout.split("\n");
  const jsonStart = stdoutLines.findIndex((line) => line.trim() === "[");
  const packJson = jsonStart >= 0 ? stdoutLines.slice(jsonStart).join("\n") : undefined;
  assert(packJson, "npm pack --json did not produce parseable JSON output");
  const packResult = JSON.parse(packJson)[0];
  const files = packResult.files.map((file) => file.path);

  assert(files.includes("dist/chain.js"), "tarball must include dist/chain.js");
  assert(files.includes("dist/hub/index.html"), "tarball must include dist/hub/index.html");
  assert(files.includes("dist/hub/main.js"), "tarball must include dist/hub/main.js");
  assert(files.includes("dist/hub/styles.css"), "tarball must include dist/hub/styles.css");
  assert(files.includes("core/registry.yaml"), "tarball must include core/registry.yaml");
  assert(files.includes("core/templates/components.json"), "tarball must include core/templates/components.json");
  assert(!files.some((file) => file.startsWith("skills/")), "tarball must not include private skills/");
  assert(!files.some((file) => file.startsWith("agents/")), "tarball must not include private agents/");
  assert(!files.some((file) => file.startsWith("workflows/")), "tarball must not include private workflows/");
  assert(!files.some((file) => file.startsWith("rules/")), "tarball must not include private rules/");

  tarballPath = path.join(packageRoot, packResult.filename);
  const installDir = path.join(tempRoot, "install");
  const chainHome = path.join(tempRoot, "home");
  mkdirSync(installDir, { recursive: true });

  run("npm", ["install", tarballPath], { cwd: installDir });

  const chainBin = path.join(installDir, "node_modules", "chain-hub", "dist", "chain.js");
  run("node", [chainBin, "init"], { cwd: installDir, env: { CHAIN_HOME: chainHome } });
  run("node", [chainBin, "validate"], { cwd: installDir, env: { CHAIN_HOME: chainHome } });

  mkdirSync(path.join(chainHome, "skills", "personal-skill"), { recursive: true });
  writeFileSync(path.join(chainHome, "skills", "personal-skill", "SKILL.md"), "personal", "utf8");
  run("node", [chainBin, "init"], { cwd: installDir, env: { CHAIN_HOME: chainHome } });
  assert(
    existsSync(path.join(chainHome, "skills", "personal-skill", "SKILL.md")),
    "chain init must preserve user-installed skills",
  );

  const removeCore = spawnSync("node", [chainBin, "remove", "chain-hub"], {
    cwd: installDir,
    env: { ...process.env, CHAIN_HOME: chainHome },
    encoding: "utf8",
  });
  assert(removeCore.status !== 0, "chain remove chain-hub must fail because chain-hub is protected core");
  assert(
    existsSync(path.join(chainHome, "core", "skills", "chain-hub", "SKILL.md")),
    "protected core skill must remain after failed remove",
  );

  console.log("[package-smoke] Package smoke test passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
  if (tarballPath) rmSync(tarballPath, { force: true });
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed`);
  }

  return result;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
