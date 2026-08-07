import { startServer } from "./index.js";

try {
  await startServer({ port: 2342 });
  console.log("Chain Hub dev server running at http://127.0.0.1:2342");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start Chain Hub server: ${message}`);
  process.exit(1);
}
