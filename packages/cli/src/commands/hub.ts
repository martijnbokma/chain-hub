import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  checkLibrarySkillUpdates,
  initializeChainHub,
  summarizeAgentsSkillSync,
  syncAgentsSkillsIntoHub
} from "@chain-hub/domain";
import { resolveChainHome } from "@chain-hub/storage";
import { startServer } from "@chain-hub/server";

export interface HubCommandOptions {
  chainHome?: string;
  port: string;
  open: boolean;
  /** Directory of the running CLI entry (src/ in dev, dist/ when published). */
  cliDir: string;
}

function parsePort(value: string): number | null {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

/** Finds the built dashboard: workspace build in this repo, or bundled next to the CLI when published. */
async function resolveStaticRoot(cliDir: string): Promise<string> {
  const candidatePaths = [
    // Workspace build of the dashboard in this repository
    path.resolve(cliDir, "../../apps/hub-web/dist"),
    path.resolve(cliDir, "../apps/hub-web/dist"),
    path.resolve(process.cwd(), "apps", "hub-web", "dist"),
    // Published package: dashboard copied next to the CLI bundle at build time
    path.resolve(cliDir, "web")
  ];
  for (const candidate of candidatePaths) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }
  return candidatePaths[candidatePaths.length - 1]!;
}

function openInBrowser(url: string): void {
  const browser = process.env.BROWSER?.trim();
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? browser
          ? ["open", ["-a", browser, url]]
          : ["open", [url]]
        : [browser || "xdg-open", [url]];
  execFile(command, args as string[], () => undefined);
}

export function isAddressInUseError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? error.code : undefined;
  if (code === "EADDRINUSE") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("EADDRINUSE") || message.includes("address already in use");
}

export async function checkExistingHub(port: number): Promise<{ isRunning: boolean; url: string } | null> {
  const apiCheckUrl = `http://127.0.0.1:${port}/api/overview`;
  try {
    const res = await fetch(apiCheckUrl, { signal: AbortSignal.timeout(600) });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (typeof data !== "object" || data === null || !("chainHome" in data)) {
      return null;
    }

    if (port === 2342) {
      const viteUrl = "http://localhost:4320";
      try {
        const viteRes = await fetch(viteUrl, { signal: AbortSignal.timeout(300) });
        if (viteRes.ok) {
          const text = await viteRes.text();
          if (text.includes("Chain Hub") || text.includes("@react-refresh")) {
            return { isRunning: true, url: viteUrl };
          }
        }
      } catch {
        // Vite dev server not running, use direct port
      }
    }

    return { isRunning: true, url: `http://127.0.0.1:${port}` };
  } catch {
    return null;
  }
}

/** Pick up skills installed with `npx skills add` since the last start (existing hub skills are kept). */
function syncAgentsSkillsInBackground(chainHome: string): void {
  void syncAgentsSkillsIntoHub(chainHome)
    .then((result) => {
      if (result.results.some((item) => item.status !== "skipped")) {
        console.log(summarizeAgentsSkillSync(result));
      }
    })
    .catch((error: unknown) => {
      console.warn(`Agents skill sync skipped: ${error instanceof Error ? error.message : String(error)}`);
    });
}

/** Probe upstream git skills once per hub start; results land in the skills lock for the dashboard. */
function checkSkillUpdatesInBackground(chainHome: string): void {
  void checkLibrarySkillUpdates(chainHome)
    .then((result) => {
      const names = result.results
        .filter((item) => item.status === "update_available")
        .map((item) => item.name);
      if (names.length > 0) {
        console.log(
          `${names.length} skill update${names.length === 1 ? "" : "s"} available: ${names.join(", ")} — run \`chain skill update\``
        );
      }
    })
    .catch(() => undefined);
}

export async function runHubCommand(options: HubCommandOptions): Promise<void> {
  const chainHome = resolveChainHome(options.chainHome);
  const { isFirstRun } = await initializeChainHub(chainHome);

  if (isFirstRun) {
    console.log(`\nChain Hub initialized at: ${chainHome}`);
    console.log("First run complete — hub structure created.\n");
  }

  const port = parsePort(options.port);
  if (port === null) {
    console.error(`Invalid port: ${options.port}. Must be an integer between 1 and 65535.`);
    process.exitCode = 1;
    return;
  }

  const existingHub = await checkExistingHub(port);
  if (existingHub) {
    console.log(`Chain Hub is already running at ${existingHub.url}`);
    if (options.open) {
      openInBrowser(existingHub.url);
    }
    return;
  }

  try {
    await startServer({ chainHome, port, staticRoot: await resolveStaticRoot(options.cliDir) });
  } catch (error) {
    if (isAddressInUseError(error)) {
      console.error(`Port ${port} is already in use by another application. Use --port <number> to specify a different port.`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const url = `http://127.0.0.1:${port}`;
  console.log(`Chain Hub running at ${url}`);
  console.log(`Chain home: ${chainHome}`);

  if (options.open) {
    openInBrowser(url);
  }

  syncAgentsSkillsInBackground(chainHome);
  checkSkillUpdatesInBackground(chainHome);
}
