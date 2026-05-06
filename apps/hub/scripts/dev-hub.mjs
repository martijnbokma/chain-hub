import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const START_PORT = 2342;
const MAX_PORT_ATTEMPTS = 100;
const execFileAsync = promisify(execFile);

function canBindPort(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    // Bind on all interfaces so this matches how the hub process checks ports.
    server.listen(port);
  });
}

async function isPortInUse(port) {
  try {
    const { stdout } = await execFileAsync("lsof", [
      "-nP",
      `-iTCP:${port}`,
      "-sTCP:LISTEN",
    ]);
    return stdout.trim().length > 0;
  } catch (error) {
    // lsof exits non-zero when no results are found.
    if (error && typeof error === "object" && "code" in error && error.code === 1) {
      return false;
    }
    // If lsof is unavailable for any reason, fall back to bind probing.
    return false;
  }
}

async function findAvailablePort(startPort, maxAttempts) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidatePort = startPort + offset;
    // First check active listeners via lsof across interfaces/protocol families.
    // eslint-disable-next-line no-await-in-loop
    const portIsInUse = await isPortInUse(candidatePort);
    if (portIsInUse) {
      continue;
    }
    // Probe sequentially so local dev picks predictable ports.
    // This keeps 2342 as the default when available.
    // eslint-disable-next-line no-await-in-loop
    if (await canBindPort(candidatePort)) {
      return candidatePort;
    }
  }

  return null;
}

async function run() {
  const port = await findAvailablePort(START_PORT, MAX_PORT_ATTEMPTS);

  if (port === null) {
    console.error(
      `No free port found in range ${START_PORT}-${START_PORT + MAX_PORT_ATTEMPTS - 1}.`
    );
    process.exit(1);
  }

  if (port !== START_PORT) {
    console.log(
      `Port ${START_PORT} is in use; starting hub on fallback port ${port}.`
    );
  }

  console.log(`Starting hub dev server on port ${port}.`);

  const child = spawn(
    "bun",
    ["--watch", "../../cli/chain.ts", "hub", "--port", String(port)],
    { stdio: "inherit" }
  );

  const relaySignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => relaySignal("SIGINT"));
  process.on("SIGTERM", () => relaySignal("SIGTERM"));

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
