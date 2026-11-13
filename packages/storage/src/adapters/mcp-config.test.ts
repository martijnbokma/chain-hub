import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { AssetDetail } from "@chain-hub/contracts";

import { removeMcpServer, syncMcpServers, writeMcpServer } from "./mcp-config.js";

async function makeTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-mcp-test-"));
}

function mcpAsset(name: string, command = "npx"): AssetDetail {
  return {
    id: `mcp:${name}`,
    kind: "mcp",
    name,
    relativePath: `mcp/${name}.md`,
    updatedAt: new Date().toISOString(),
    content: `---\ncommand: ${command}\nargs: ["-y", "${name}-server"]\nenv: { API_KEY: "\${NAME}_KEY" }\n---\n\nConnects ${name}.`
  };
}

describe("writeMcpServer / removeMcpServer", () => {
  it("writes a marked server entry and removes only managed entries", async () => {
    const file = path.join(await makeTmp(), "mcp.json");
    await writeMcpServer(file, mcpAsset("github"));

    const config = JSON.parse(await fs.readFile(file, "utf8"));
    expect(config.mcpServers.github._chain_hub_source).toBe("mcp/github");
    expect(config.mcpServers.github.command).toBe("npx");

    // A foreign entry under another name survives; ours is removed.
    config.mcpServers.mine = { command: "mine" };
    await fs.writeFile(file, JSON.stringify(config), "utf8");
    await removeMcpServer(file, "github");

    const after = JSON.parse(await fs.readFile(file, "utf8"));
    expect(after.mcpServers.github).toBeUndefined();
    expect(after.mcpServers.mine).toEqual({ command: "mine" });
  });

  it("refuses to overwrite a foreign server under the same name", async () => {
    const file = path.join(await makeTmp(), "mcp.json");
    await fs.writeFile(file, JSON.stringify({ mcpServers: { github: { command: "mine" } } }), "utf8");

    await writeMcpServer(file, mcpAsset("github"));

    const config = JSON.parse(await fs.readFile(file, "utf8"));
    expect(config.mcpServers.github).toEqual({ command: "mine" });
  });
});

describe("syncMcpServers", () => {
  it("rebuilds managed entries and drops stale ones, keeping foreign config", async () => {
    const file = path.join(await makeTmp(), ".claude.json");
    await fs.writeFile(
      file,
      JSON.stringify({ theme: "dark", mcpServers: { mine: { command: "mine" }, stale: { _chain_hub_source: "mcp/stale", command: "old" } } }),
      "utf8"
    );

    await syncMcpServers(file, [mcpAsset("github"), mcpAsset("linear")]);

    const config = JSON.parse(await fs.readFile(file, "utf8"));
    expect(config.theme).toBe("dark");
    expect(config.mcpServers.mine).toEqual({ command: "mine" });
    expect(config.mcpServers.stale).toBeUndefined();
    expect(config.mcpServers.github._chain_hub_source).toBe("mcp/github");
    expect(config.mcpServers.linear.command).toBe("npx");
  });

  it("leaves a corrupt config file untouched", async () => {
    const file = path.join(await makeTmp(), "mcp.json");
    await fs.writeFile(file, "not json{", "utf8");

    await syncMcpServers(file, [mcpAsset("github")]);
    expect(await fs.readFile(file, "utf8")).toBe("not json{");
  });
});
