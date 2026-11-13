import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.E2E_PORT ?? 4390);
const chainHome = mkdtempSync(path.join(tmpdir(), "chain-hub-e2e-"));

// Isolate from the real machine's HOME so startup doesn't sync a real
// ~/.agents/.skill-lock.json into this throwaway hub (slow and non-hermetic).
process.env.HOME = mkdtempSync(path.join(tmpdir(), "chain-hub-e2e-home-"));
// Pretend Claude Code and Cursor are installed; Chain Hub only syncs into editors it finds.
for (const editorRoot of [".claude", ".cursor"]) {
  mkdirSync(path.join(process.env.HOME, editorRoot), { recursive: true });
}

const { initializeChainHub } = await import("@chain-hub/domain");
const { startServer } = await import("@chain-hub/server");

await initializeChainHub(chainHome);
await startServer({
  chainHome,
  port,
  staticRoot: path.join(dirname, "..", "dist")
});

console.log(`e2e server ready on http://127.0.0.1:${port} (chainHome=${chainHome})`);
