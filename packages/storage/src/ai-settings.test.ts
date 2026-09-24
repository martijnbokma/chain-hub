import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getAiSettingsPublic, readAiSecrets, updateAiSettings } from "./ai-settings.js";

async function makeTmpHub(): Promise<string> {
  const hub = await fs.mkdtemp(path.join(os.tmpdir(), "chain-hub-ai-settings-"));
  await fs.mkdir(path.join(hub, "system"), { recursive: true });
  return hub;
}

describe("AI settings storage", () => {
  it("returns defaults when no config files exist", async () => {
    const hub = await makeTmpHub();
    const settings = await getAiSettingsPublic(hub);
    expect(settings.provider).toBe("ollama");
    expect(settings.anthropicApiKeyConfigured).toBe(false);
    expect(settings.openaiApiKeyConfigured).toBe(false);
    expect(settings.ollamaBaseUrl).toContain("11434");
  });

  it("persists provider and masks API keys on read", async () => {
    const hub = await makeTmpHub();
    const updated = await updateAiSettings(hub, {
      provider: "anthropic",
      anthropicApiKey: "sk-ant-secret-value",
      models: { anthropic: "claude-sonnet-4-5" }
    });

    expect(updated.provider).toBe("anthropic");
    expect(updated.anthropicApiKeyConfigured).toBe(true);
    expect(JSON.stringify(updated)).not.toContain("sk-ant-secret-value");

    const secretsRaw = await fs.readFile(path.join(hub, "system", "secrets.json"), "utf8");
    expect(secretsRaw).toContain("sk-ant-secret-value");

    const publicAgain = await getAiSettingsPublic(hub);
    expect(publicAgain.anthropicApiKeyConfigured).toBe(true);
    expect(JSON.stringify(publicAgain)).not.toContain("sk-ant-secret-value");
  });

  it("keeps existing key when update omits key fields", async () => {
    const hub = await makeTmpHub();
    await updateAiSettings(hub, {
      provider: "openai",
      openaiApiKey: "sk-keep-me"
    });
    const updated = await updateAiSettings(hub, {
      provider: "openai",
      models: { openai: "gpt-4o" }
    });
    expect(updated.openaiApiKeyConfigured).toBe(true);
    expect(updated.models.openai).toBe("gpt-4o");
  });

  it("clears a key when clear flag is set", async () => {
    const hub = await makeTmpHub();
    await updateAiSettings(hub, { anthropicApiKey: "sk-temp" });
    const cleared = await updateAiSettings(hub, { clearAnthropicApiKey: true });
    expect(cleared.anthropicApiKeyConfigured).toBe(false);
  });

  it.skipIf(process.platform === "win32")("keeps secrets.json readable by the owner only", async () => {
    const hub = await makeTmpHub();
    const secretsPath = path.join(hub, "system", "secrets.json");
    await updateAiSettings(hub, { provider: "anthropic", anthropicApiKey: "sk-ant-secret-value" });
    expect((await fs.stat(secretsPath)).mode & 0o777).toBe(0o600);

    // Files written by older versions get tightened on the next read.
    await fs.chmod(secretsPath, 0o644);
    await readAiSecrets(hub);
    expect((await fs.stat(secretsPath)).mode & 0o777).toBe(0o600);
  });
});
