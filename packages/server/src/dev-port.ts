import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function isAddressInUseError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  if (code === "EADDRINUSE") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("EADDRINUSE");
}

export async function listListeningPids(port: number): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
    });

    return stdout
      .split("\n")
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch {
    // lsof exits non-zero when nothing is listening
    return [];
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stop whatever is listening on `port` so the local hub dev server can bind.
 * Dev-only: Chain Hub always owns 2342 in the monorepo loop.
 */
export async function reclaimPort(port: number): Promise<number[]> {
  const pids = await listListeningPids(port);
  if (pids.length === 0) {
    return [];
  }

  for (const pid of pids) {
    console.warn(`Port ${port} in use by pid ${pid}; stopping stale process…`);
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already gone
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(100);
    const remaining = await listListeningPids(port);
    if (remaining.length === 0) {
      return pids;
    }
  }

  for (const pid of await listListeningPids(port)) {
    console.warn(`Port ${port} still held by pid ${pid}; force-killing…`);
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }

  await sleep(150);
  return pids;
}
