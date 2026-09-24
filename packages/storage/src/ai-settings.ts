import { promises as fs } from "node:fs";
import path from "node:path";

import {
  aiConfigSchema,
  aiProviders,
  aiSecretsSchema,
  DEFAULT_AI_MODELS,
  DEFAULT_OLLAMA_BASE_URL,
  type AiConfig,
  type AiProvider,
  type AiSecrets,
  type AiSettingsPublic,
  type UpdateAiSettingsInput
} from "@chain-hub/contracts";

import { resolveChainHome } from "./core.js";
import { ensureDir, writeFileAtomic } from "./shared.js";

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
  const filePath = aiSecretsPath(chainHome);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    // Tighten files written by older versions (created with the default umask).
    await fs.chmod(filePath, 0o600).catch(() => undefined);
    return aiSecretsSchema.parse(JSON.parse(raw));
  } catch {
    return defaultAiSecrets();
  }
}

async function writeAiConfig(chainHome: string, config: AiConfig): Promise<void> {
  await ensureDir(path.join(chainHome, "system"));
  await writeFileAtomic(aiConfigPath(chainHome), `${JSON.stringify(config, null, 2)}\n`);
}

async function writeAiSecrets(chainHome: string, secrets: AiSecrets): Promise<void> {
  const filePath = aiSecretsPath(chainHome);
  await ensureDir(path.join(chainHome, "system"));
  await writeFileAtomic(filePath, `${JSON.stringify(secrets, null, 2)}\n`, 0o600);
}

export async function getAiSettingsPublic(chainHomeInput?: string): Promise<AiSettingsPublic> {
  const config = await readAiConfig(chainHomeInput);
  const secrets = await readAiSecrets(chainHomeInput);

  return {
    provider: config.provider,
    models: config.models,
    ollamaBaseUrl: config.ollamaBaseUrl,
    ...keyFlags(secrets)
  };
}

type KeyedProvider = Exclude<AiProvider, "ollama">;

/** Every provider except Ollama authenticates with an API key stored in secrets.json. */
const KEYED_PROVIDERS = aiProviders.filter((provider): provider is KeyedProvider => provider !== "ollama");

function capitalize<T extends string>(value: T): Capitalize<T> {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<T>;
}

/** `<provider>ApiKeyConfigured` flags; the keys themselves never leave the server. */
function keyFlags(secrets: AiSecrets): Record<`${KeyedProvider}ApiKeyConfigured`, boolean> {
  return Object.fromEntries(
    KEYED_PROVIDERS.map((provider) => [`${provider}ApiKeyConfigured`, Boolean(secrets[`${provider}ApiKey`]?.trim())])
  ) as Record<`${KeyedProvider}ApiKeyConfigured`, boolean>;
}

function definedModels(models: UpdateAiSettingsInput["models"]): Partial<AiConfig["models"]> {
  return Object.fromEntries(Object.entries(models ?? {}).filter(([, model]) => model !== undefined));
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
    models: { ...currentConfig.models, ...definedModels(input.models) },
    ollamaBaseUrl: input.ollamaBaseUrl ?? currentConfig.ollamaBaseUrl
  });

  const nextSecrets: AiSecrets = { ...currentSecrets, version: 1 };

  for (const provider of KEYED_PROVIDERS) {
    const keyField = `${provider}ApiKey` as const;
    const clearField = `clear${capitalize(provider)}ApiKey` as const;
    const nextKey = input[keyField];

    if (input[clearField]) {
      delete nextSecrets[keyField];
    } else if (nextKey !== undefined) {
      nextSecrets[keyField] = nextKey.trim();
    }
  }

  await writeAiConfig(chainHome, nextConfig);
  await writeAiSecrets(chainHome, nextSecrets);

  return getAiSettingsPublic(chainHome);
}
