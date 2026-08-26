import { promises as fs } from "node:fs";
import path from "node:path";

import {
  aiConfigSchema,
  aiSecretsSchema,
  DEFAULT_AI_MODELS,
  DEFAULT_OLLAMA_BASE_URL,
  type AiConfig,
  type AiSecrets,
  type AiSettingsPublic,
  type UpdateAiSettingsInput
} from "@chain-hub/contracts";

import { resolveChainHome } from "./core.js";
import { ensureDir } from "./shared.js";

function aiConfigPath(chainHome: string): string {
  return path.join(chainHome, "system", "ai-config.json");
}

function aiSecretsPath(chainHome: string): string {
  return path.join(chainHome, "system", "secrets.json");
}

function defaultAiConfig(): AiConfig {
  return aiConfigSchema.parse({
    version: 1,
    provider: "ollama",
    models: { ...DEFAULT_AI_MODELS },
    ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL
  });
}

function defaultAiSecrets(): AiSecrets {
  return { version: 1 };
}

export async function readAiConfig(chainHomeInput?: string): Promise<AiConfig> {
  const chainHome = resolveChainHome(chainHomeInput);
  try {
    const raw = await fs.readFile(aiConfigPath(chainHome), "utf8");
    const parsed = JSON.parse(raw) as Partial<AiConfig> & { models?: Partial<AiConfig["models"]> };
    return aiConfigSchema.parse({
      ...parsed,
      models: { ...DEFAULT_AI_MODELS, ...(parsed.models ?? {}) }
    });
  } catch {
    return defaultAiConfig();
  }
}

export async function readAiSecrets(chainHomeInput?: string): Promise<AiSecrets> {
  const chainHome = resolveChainHome(chainHomeInput);
  try {
    const raw = await fs.readFile(aiSecretsPath(chainHome), "utf8");
    return aiSecretsSchema.parse(JSON.parse(raw));
  } catch {
    return defaultAiSecrets();
  }
}

async function writeAiConfig(chainHome: string, config: AiConfig): Promise<void> {
  await ensureDir(path.join(chainHome, "system"));
  await fs.writeFile(aiConfigPath(chainHome), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function writeAiSecrets(chainHome: string, secrets: AiSecrets): Promise<void> {
  const filePath = aiSecretsPath(chainHome);
  await ensureDir(path.join(chainHome, "system"));
  await fs.writeFile(filePath, `${JSON.stringify(secrets, null, 2)}\n`, "utf8");
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // Best-effort on platforms that don't support chmod the same way.
  }
}

export async function getAiSettingsPublic(chainHomeInput?: string): Promise<AiSettingsPublic> {
  const config = await readAiConfig(chainHomeInput);
  const secrets = await readAiSecrets(chainHomeInput);

  return {
    provider: config.provider,
    models: config.models,
    ollamaBaseUrl: config.ollamaBaseUrl,
    anthropicApiKeyConfigured: Boolean(secrets.anthropicApiKey?.trim()),
    openaiApiKeyConfigured: Boolean(secrets.openaiApiKey?.trim()),
    mistralApiKeyConfigured: Boolean(secrets.mistralApiKey?.trim()),
    geminiApiKeyConfigured: Boolean(secrets.geminiApiKey?.trim()),
    groqApiKeyConfigured: Boolean(secrets.groqApiKey?.trim()),
    openrouterApiKeyConfigured: Boolean(secrets.openrouterApiKey?.trim()),
    deepseekApiKeyConfigured: Boolean(secrets.deepseekApiKey?.trim()),
    cerebrasApiKeyConfigured: Boolean(secrets.cerebrasApiKey?.trim())
  };
}

export async function updateAiSettings(
  chainHomeInput: string | undefined,
  input: UpdateAiSettingsInput
): Promise<AiSettingsPublic> {
  const chainHome = resolveChainHome(chainHomeInput);
  const currentConfig = await readAiConfig(chainHome);
  const currentSecrets = await readAiSecrets(chainHome);

  const nextConfig = aiConfigSchema.parse({
    version: 1 as const,
    provider: input.provider ?? currentConfig.provider,
    models: {
      anthropic: input.models?.anthropic ?? currentConfig.models.anthropic,
      openai: input.models?.openai ?? currentConfig.models.openai,
      mistral: input.models?.mistral ?? currentConfig.models.mistral,
      ollama: input.models?.ollama ?? currentConfig.models.ollama,
      gemini: input.models?.gemini ?? currentConfig.models.gemini,
      groq: input.models?.groq ?? currentConfig.models.groq,
      openrouter: input.models?.openrouter ?? currentConfig.models.openrouter,
      deepseek: input.models?.deepseek ?? currentConfig.models.deepseek,
      cerebras: input.models?.cerebras ?? currentConfig.models.cerebras
    },
    ollamaBaseUrl: input.ollamaBaseUrl ?? currentConfig.ollamaBaseUrl
  });

  const nextSecrets: AiSecrets = { ...currentSecrets, version: 1 };

  if (input.clearAnthropicApiKey) {
    delete nextSecrets.anthropicApiKey;
  } else if (input.anthropicApiKey !== undefined) {
    nextSecrets.anthropicApiKey = input.anthropicApiKey.trim();
  }

  if (input.clearOpenaiApiKey) {
    delete nextSecrets.openaiApiKey;
  } else if (input.openaiApiKey !== undefined) {
    nextSecrets.openaiApiKey = input.openaiApiKey.trim();
  }

  if (input.clearMistralApiKey) {
    delete nextSecrets.mistralApiKey;
  } else if (input.mistralApiKey !== undefined) {
    nextSecrets.mistralApiKey = input.mistralApiKey.trim();
  }

  if (input.clearGeminiApiKey) {
    delete nextSecrets.geminiApiKey;
  } else if (input.geminiApiKey !== undefined) {
    nextSecrets.geminiApiKey = input.geminiApiKey.trim();
  }

  if (input.clearGroqApiKey) {
    delete nextSecrets.groqApiKey;
  } else if (input.groqApiKey !== undefined) {
    nextSecrets.groqApiKey = input.groqApiKey.trim();
  }

  if (input.clearOpenrouterApiKey) {
    delete nextSecrets.openrouterApiKey;
  } else if (input.openrouterApiKey !== undefined) {
    nextSecrets.openrouterApiKey = input.openrouterApiKey.trim();
  }

  if (input.clearDeepseekApiKey) {
    delete nextSecrets.deepseekApiKey;
  } else if (input.deepseekApiKey !== undefined) {
    nextSecrets.deepseekApiKey = input.deepseekApiKey.trim();
  }

  if (input.clearCerebrasApiKey) {
    delete nextSecrets.cerebrasApiKey;
  } else if (input.cerebrasApiKey !== undefined) {
    nextSecrets.cerebrasApiKey = input.cerebrasApiKey.trim();
  }

  await writeAiConfig(chainHome, nextConfig);
  await writeAiSecrets(chainHome, nextSecrets);

  return getAiSettingsPublic(chainHome);
}
