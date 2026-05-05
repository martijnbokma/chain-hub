import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const tempChainHome = mkdtempSync(join(tmpdir(), "chain-hub-smoke-"));
const command = process.platform === "win32" ? "bun.exe" : "bun";
const child = spawn(command, ["dist/chain.js", "hub", "--port", "0"], {
  cwd: process.cwd(),
  env: { ...process.env, CHAIN_HOME: tempChainHome },
  stdio: ["ignore", "pipe", "pipe"],
});

let baseUrl = "";
let stderrBuffer = "";
let settled = false;

function cleanupAndExit(code) {
  if (settled) return;
  settled = true;

  if (!child.killed) {
    child.kill("SIGTERM");
  }
  rmSync(tempChainHome, { recursive: true, force: true });
  process.exit(code);
}

async function probeApi() {
  try {
    const response = await fetch(`${baseUrl}/api/skills`);
    if (!response.ok) {
      throw new Error(`Expected /api/skills 200, got ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || !("skills" in payload)) {
      throw new Error("Expected /api/skills payload to include a skills field.");
    }
    console.log(`[hub-smoke] OK: ${baseUrl}/api/skills`);
    cleanupAndExit(0);
  } catch (error) {
    console.error(
      `[hub-smoke] Failed API probe: ${error instanceof Error ? error.message : String(error)}`,
    );
    cleanupAndExit(1);
  }
}

const startupTimeout = setTimeout(() => {
  console.error("[hub-smoke] Timed out waiting for hub server URL in output.");
  if (stderrBuffer.trim().length > 0) {
    console.error(`[hub-smoke] stderr: ${stderrBuffer.trim()}`);
  }
  cleanupAndExit(1);
}, 15000);

child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  const text = String(chunk);
  const match = text.match(/http:\/\/localhost:(\d+)/);
  if (match && !baseUrl) {
    baseUrl = `http://localhost:${match[1]}`;
    clearTimeout(startupTimeout);
    void probeApi();
  }
});

child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderrBuffer += String(chunk);
});

child.on("exit", (code) => {
  if (settled) return;
  clearTimeout(startupTimeout);
  console.error(`[hub-smoke] Hub process exited early with code ${code ?? "null"}.`);
  if (stderrBuffer.trim().length > 0) {
    console.error(`[hub-smoke] stderr: ${stderrBuffer.trim()}`);
  }
  cleanupAndExit(1);
});
