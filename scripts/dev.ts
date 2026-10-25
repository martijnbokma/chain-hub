/**
 * Frees the dev ports (stale vite/tsx processes survive turbo shutdowns),
 * prints the local dev URLs, then runs `turbo run dev` with streamed output.
 *
 *   bun run dev
 */

import { spawn } from "node:child_process";
import { reclaimPort } from "../packages/server/src/dev-port.js";

// Ports mirror the vite configs (apps/*/vite.config.ts) and dev-server.ts.
const SURFACES: Array<{ name: string; url: string; port: number }> = [
  { name: "Hub (dashboard)", url: "http://localhost:4320", port: 4320 },
  { name: "Marketing site", url: "http://localhost:4322", port: 4322 },
  { name: "Docs", url: "http://localhost:4323/docs/", port: 4323 },
  { name: "API server", url: "http://127.0.0.1:2342", port: 2342 }
];

for (const { port } of SURFACES) {
  await reclaimPort(port);
}

console.log("\n  Chain Hub dev — starting everything:\n");
for (const { name, url } of SURFACES) {
  console.log(`    ${name.padEnd(16)} ${url}`);
}
console.log("");

const turbo = spawn("bun", ["x", "turbo", "run", "dev", "--ui=stream"], {
  stdio: "inherit"
});

turbo.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
