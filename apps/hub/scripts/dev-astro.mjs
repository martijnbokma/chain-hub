import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const ASTRO_ARGS = ["dev", "--host", "127.0.0.1", "--port", "4321"];
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
  openInFirefox(url);
}

function openInFirefox(url) {
  // Try Firefox Developer Edition first, then regular Firefox
  const apps = ["Firefox Developer Edition", "Firefox"];
  
  const tryOpen = (index) => {
    if (index >= apps.length) {
      console.error(`Failed to open ${url} in any Firefox version.`);
      return;
    }

    const app = apps[index];
    const opener = spawn("open", ["-a", app, url], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    opener.on("error", (error) => {
      console.error(`Failed to open ${url} in ${app}:`, error);
      tryOpen(index + 1);
    });

    let stderrBuffer = "";
    opener.stderr.on("data", (chunk) => {
      stderrBuffer += String(chunk);
    });

    opener.on("exit", (code) => {
      if (code && code !== 0) {
        // If it failed with a non-zero exit code (e.g. app not found), try next
        tryOpen(index + 1);
      } else {
        console.log(`Successfully opened ${url} in ${app}.`);
      }
    });
  };

  tryOpen(0);
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
