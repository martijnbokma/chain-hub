// Packs the CLI exactly as npm would publish it, installs the tarball into a throwaway
// prefix and checks that the installed `chain` binary starts and serves the dashboard.
// Unit tests run the source; this catches bundling and packaging mistakes.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(path.join(tmpdir(), "chain-hub-smoke-"));
const env = { ...process.env, HOME: path.join(work, "home"), CHAIN_HOME: path.join(work, "hub") };
const port = Number(process.env.SMOKE_PORT ?? 4391);

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", env, ...options }).trim();
}

execFileSync("mkdir", ["-p", env.HOME]);
run("npm", ["pack", "--pack-destination", work], { cwd: packageDir, stdio: ["ignore", "pipe", "inherit"] });
const tarball = readdirSync(work).find((name) => name.endsWith(".tgz"));
run("npm", ["install", "--prefix", path.join(work, "prefix"), "--no-audit", "--no-fund", path.join(work, tarball)]);
const chain = path.join(work, "prefix", "node_modules", ".bin", "chain");

const reportedVersion = run(chain, ["--version"]);
if (!/^\d+\.\d+\.\d+/.test(reportedVersion)) throw new Error(`chain --version printed "${reportedVersion}"`);
console.log(`chain --version → ${reportedVersion}`);
run(chain, ["init"]);

const server = spawn(chain, ["hub", "--no-open", "--port", String(port)], { env, stdio: "inherit" });

try {
  const base = `http://127.0.0.1:${port}`;
  let page = null;
  for (let attempt = 0; attempt < 50 && !page; attempt += 1) {
    page = await fetch(base).then((response) => (response.ok ? response.text() : null)).catch(() => null);
    if (!page) await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!page?.includes('id="root"')) throw new Error("dashboard index.html was not served");

  const overview = await fetch(`${base}/api/overview`);
  if (!overview.ok) throw new Error(`/api/overview returned ${overview.status}`);

  console.log("smoke test passed: packaged CLI serves the dashboard and API");
} finally {
  server.kill();
}
