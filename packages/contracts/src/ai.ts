import { z } from "zod";

import { assetKinds } from "./asset.js";

export const aiProviders = [
  "anthropic",
  "openai",
  "mistral",
  "ollama",
  "gemini",
  "groq",
  "openrouter",
  "deepseek",
  "cerebras"
] as const;

export const aiProviderSchema = z.enum(aiProviders);

export type AiProvider = z.infer<typeof aiProviderSchema>;

export const DEFAULT_AI_MODELS = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o-mini",
  mistral: "mistral-small-latest",
  ollama: "llama3.2",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  deepseek: "deepseek-chat",
  cerebras: "llama-3.3-70b"
} as const;

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

export const aiConfigSchema = z.object({
  version: z.literal(1),
  provider: aiProviderSchema.default("ollama"),
  models: z
    .object({
      anthropic: z.string().min(1).default(DEFAULT_AI_MODELS.anthropic),
      openai: z.string().min(1).default(DEFAULT_AI_MODELS.openai),
      mistral: z.string().min(1).default(DEFAULT_AI_MODELS.mistral),
      ollama: z.string().min(1).default(DEFAULT_AI_MODELS.ollama),
      gemini: z.string().min(1).default(DEFAULT_AI_MODELS.gemini),
      groq: z.string().min(1).default(DEFAULT_AI_MODELS.groq),
      openrouter: z.string().min(1).default(DEFAULT_AI_MODELS.openrouter),
      deepseek: z.string().min(1).default(DEFAULT_AI_MODELS.deepseek),
      cerebras: z.string().min(1).default(DEFAULT_AI_MODELS.cerebras)
    })
    .default({ ...DEFAULT_AI_MODELS }),
  ollamaBaseUrl: z.string().url().default(DEFAULT_OLLAMA_BASE_URL)
});

export const aiSecretsSchema = z.object({
  version: z.literal(1),
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  mistralApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  groqApiKey: z.string().optional(),
  openrouterApiKey: z.string().optional(),
  deepseekApiKey: z.string().optional(),
  cerebrasApiKey: z.string().optional()
});

/** Public settings returned to the dashboard — never includes raw API keys. */
export const aiSettingsPublicSchema = z.object({
  provider: aiProviderSchema,
  models: z.object({
    anthropic: z.string(),
    openai: z.string(),
    mistral: z.string(),
    ollama: z.string(),
    gemini: z.string(),
    groq: z.string(),
    openrouter: z.string(),
    deepseek: z.string(),
    cerebras: z.string()
  }),
  ollamaBaseUrl: z.string(),
  anthropicApiKeyConfigured: z.boolean(),
  openaiApiKeyConfigured: z.boolean(),
  mistralApiKeyConfigured: z.boolean(),
  geminiApiKeyConfigured: z.boolean(),
  groqApiKeyConfigured: z.boolean(),
  openrouterApiKeyConfigured: z.boolean(),
  deepseekApiKeyConfigured: z.boolean(),
  cerebrasApiKeyConfigured: z.boolean()
});

export const updateAiSettingsInputSchema = z.object({
  provider: aiProviderSchema.optional(),
  models: z
    .object({
      anthropic: z.string().min(1).optional(),
      openai: z.string().min(1).optional(),
      mistral: z.string().min(1).optional(),
      ollama: z.string().min(1).optional(),
      gemini: z.string().min(1).optional(),
      groq: z.string().min(1).optional(),
      openrouter: z.string().min(1).optional(),
      deepseek: z.string().min(1).optional(),
      cerebras: z.string().min(1).optional()
    })
    .optional(),
  ollamaBaseUrl: z.string().url().optional(),
  anthropicApiKey: z.string().min(1).optional(),
  openaiApiKey: z.string().min(1).optional(),
  mistralApiKey: z.string().min(1).optional(),
  geminiApiKey: z.string().min(1).optional(),
  groqApiKey: z.string().min(1).optional(),
  openrouterApiKey: z.string().min(1).optional(),
  deepseekApiKey: z.string().min(1).optional(),
  cerebrasApiKey: z.string().min(1).optional(),
  clearAnthropicApiKey: z.boolean().optional(),
  clearOpenaiApiKey: z.boolean().optional(),
  clearMistralApiKey: z.boolean().optional(),
  clearGeminiApiKey: z.boolean().optional(),
  clearGroqApiKey: z.boolean().optional(),
  clearOpenrouterApiKey: z.boolean().optional(),
  clearDeepseekApiKey: z.boolean().optional(),
  clearCerebrasApiKey: z.boolean().optional()
});

export const draftAssetKindSchema = z.union([z.enum(assetKinds), z.literal("auto")]);

export type DraftAssetKind = z.infer<typeof draftAssetKindSchema>;

export const draftAssetInputSchema = z.object({
  intent: z.string().min(1),
  kind: draftAssetKindSchema.default("auto"),
  name: z.string().min(1).optional()
});

/** @deprecated Prefer draftAssetInputSchema — kept for existing callers. */
export const draftPromptInputSchema = draftAssetInputSchema;

export const draftAssetResultSchema = z.object({
  content: z.string().min(1),
  suggestedName: z.string().optional(),
  recommendedKind: z.enum(assetKinds),
  reason: z.string().min(1).optional()
});

/** @deprecated Prefer draftAssetResultSchema */
export const draftPromptResultSchema = draftAssetResultSchema;

export const classifyAssetInputSchema = z.object({
  kind: z.enum(assetKinds),
  name: z.string().min(1),
  /** When omitted, the server loads hub content for kind/name. */
  content: z.string().min(1).optional()
});

export const classifyAssetResultSchema = z.object({
  currentKind: z.enum(assetKinds),
  recommendedKind: z.enum(assetKinds),
  matchesCurrent: z.boolean(),
  reason: z.string().min(1),
  suggestedName: z.string().optional()
});

export const auditAssetFindingSeveritySchema = z.enum(["high", "medium", "low"]);

export const auditAssetFindingSchema = z.object({
  severity: auditAssetFindingSeveritySchema,
  title: z.string().min(1).max(120),
  detail: z.string().min(1).max(500)
});

/** Same shape as classify for loading an existing asset. */
export const auditAssetInputSchema = classifyAssetInputSchema;

export const auditAssetResultSchema = z.object({
  summary: z.string().min(1).max(400),
  findings: z.array(auditAssetFindingSchema).max(12)
});

export const improveAssetInputSchema = z.object({
  kind: z.enum(assetKinds),
  name: z.string().min(1),
  /** When omitted, the server loads hub content for kind/name. */
  content: z.string().min(1).optional(),
  summary: z.string().min(1).max(400).optional(),
  findings: z.array(auditAssetFindingSchema).min(1).max(12)
});

export const improveAssetResultSchema = z.object({
  content: z.string().min(1)
});

export type AiConfig = z.infer<typeof aiConfigSchema>;
export type AiSecrets = z.infer<typeof aiSecretsSchema>;
export type AiSettingsPublic = z.infer<typeof aiSettingsPublicSchema>;
export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsInputSchema>;
export type DraftAssetInput = z.input<typeof draftAssetInputSchema>;
export type DraftAssetResult = z.infer<typeof draftAssetResultSchema>;
export type DraftPromptInput = DraftAssetInput;
export type DraftPromptResult = DraftAssetResult;
export type ClassifyAssetInput = z.input<typeof classifyAssetInputSchema>;
export type ClassifyAssetResult = z.infer<typeof classifyAssetResultSchema>;
export type AuditAssetInput = z.input<typeof auditAssetInputSchema>;
export type AuditAssetFinding = z.infer<typeof auditAssetFindingSchema>;
export type AuditAssetResult = z.infer<typeof auditAssetResultSchema>;
export type ImproveAssetInput = z.input<typeof improveAssetInputSchema>;
export type ImproveAssetResult = z.infer<typeof improveAssetResultSchema>;
