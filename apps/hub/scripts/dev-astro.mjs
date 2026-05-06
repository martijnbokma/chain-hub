import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const ASTRO_ARGS = ["dev", "--host", "127.0.0.1", "--port", "4321"];
const FIREFOX_APP_NAME = "Firefox Developer Edition";
const LOCAL_URL_REGEX = /Local\s+(http:\/\/[^\s/]+(?::\d+)?\/?)/i;
const ANSI_ESCAPE_REGEX = /\u001b\[[0-9;]*m/g;

function maybeOpenBrowser(rawLine, hasOpenedBrowserRef) {
  if (hasOpenedBrowserRef.value) {
    return;
  }

  const cleanLine = rawLine.replace(ANSI_ESCAPE_REGEX, "");
  const match = cleanLine.match(LOCAL_URL_REGEX);
  if (!match) {
    return;
  }

  const url = match[1];
  hasOpenedBrowserRef.value = true;
  console.log(`Opening ${url} in ${FIREFOX_APP_NAME}...`);
  openInFirefox(url);
}

function openInFirefox(url) {
  const opener = spawn("open", ["-a", FIREFOX_APP_NAME, url], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  opener.on("error", (error) => {
    console.error(`Failed to open ${url} in ${FIREFOX_APP_NAME}:`, error);
  });

  let stderrBuffer = "";
  opener.stderr.on("data", (chunk) => {
    stderrBuffer += String(chunk);
  });

  opener.on("exit", (code) => {
    if (code && code !== 0) {
      const details = stderrBuffer.trim();
      if (details.length > 0) {
        console.error(
          `Open command failed for ${url} in ${FIREFOX_APP_NAME} (exit ${code}): ${details}`
        );
      } else {
        console.error(
          `Open command failed for ${url} in ${FIREFOX_APP_NAME} (exit ${code}).`
        );
      }
    }
  });
}

function run() {
  const child = spawn("astro", ASTRO_ARGS, {
    stdio: ["inherit", "pipe", "pipe"],
  });

  const hasOpenedBrowserRef = { value: false };

  const stdoutReader = createInterface({ input: child.stdout });
  stdoutReader.on("line", (line) => {
    console.log(line);
    maybeOpenBrowser(line, hasOpenedBrowserRef);
  });

  const stderrReader = createInterface({ input: child.stderr });
  stderrReader.on("line", (line) => {
    console.error(line);
    maybeOpenBrowser(line, hasOpenedBrowserRef);
  });

  const relaySignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => relaySignal("SIGINT"));
  process.on("SIGTERM", () => relaySignal("SIGTERM"));

  child.on("exit", (code, signal) => {
    stdoutReader.close();
    stderrReader.close();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

run();
