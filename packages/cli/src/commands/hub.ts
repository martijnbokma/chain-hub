import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { initializeChainHub, summarizeAgentsSkillSync, syncAgentsSkillsIntoHub } from "@chain-hub/domain";
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

/** Finds the built dashboard: bundled next to the CLI when published, else the workspace build. */
async function resolveStaticRoot(cliDir: string): Promise<string> {
  const candidatePaths = [
    // Published package: dashboard copied next to the CLI bundle at build time.
    path.resolve(cliDir, "web"),
    path.resolve(cliDir, "../../apps/hub-web/dist"),
    path.resolve(cliDir, "../apps/hub-web/dist"),
    path.resolve(process.cwd(), "apps", "hub-web", "dist")
  ];
  for (const candidate of candidatePaths) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }
  return candidatePaths[0]!;
}

function openInBrowser(url: string): void {
  // `start` is a cmd.exe built-in, not an executable; the empty string is its window title.
  const [command, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : [process.platform === "darwin" ? "open" : "xdg-open", [url]];
  execFile(command, args as string[], () => undefined);
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

  await startServer({ chainHome, port, staticRoot: await resolveStaticRoot(options.cliDir) });

  const url = `http://127.0.0.1:${port}`;
  console.log(`Chain Hub running at ${url}`);
  console.log(`Chain home: ${chainHome}`);

  if (options.open) {
    openInBrowser(url);
  }

  syncAgentsSkillsInBackground(chainHome);
}
