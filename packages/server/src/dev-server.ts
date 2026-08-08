import { isAddressInUseError, reclaimPort } from "./dev-port.js";
import { startServer } from "./index.js";

const PORT = 2342;
const MAX_BIND_ATTEMPTS = 3;

async function startDevServer(): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_BIND_ATTEMPTS; attempt += 1) {
    try {
      await startServer({ port: PORT });
      console.log(`Chain Hub dev server running at http://127.0.0.1:${PORT}`);
      return;
    } catch (error) {
      lastError = error;
      if (!isAddressInUseError(error) || attempt === MAX_BIND_ATTEMPTS) {
        break;
      }

      console.warn(
        `Port ${PORT} busy (attempt ${attempt}/${MAX_BIND_ATTEMPTS}); reclaiming and retrying…`
      );
      await reclaimPort(PORT);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`Failed to start Chain Hub server: ${message}`);
  process.exit(1);
}

await startDevServer();
