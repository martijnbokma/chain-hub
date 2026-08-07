import type { AssetKind } from './assets';

export type AiProvider = "anthropic" | "openai" | "mistral" | "ollama";

export interface AiSettingsPublic {
  provider: AiProvider;
  models: {
    anthropic: string;
    openai: string;
    mistral: string;
    ollama: string;
  };
  ollamaBaseUrl: string;
  anthropicApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  mistralApiKeyConfigured: boolean;
}

export interface UpdateAiSettingsInput {
  provider?: AiProvider;
  models?: {
    anthropic?: string;
    openai?: string;
    mistral?: string;
    ollama?: string;
  };
  ollamaBaseUrl?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  mistralApiKey?: string;
  clearAnthropicApiKey?: boolean;
  clearOpenaiApiKey?: boolean;
  clearMistralApiKey?: boolean;
}

export interface DraftAssetInput {
  intent: string;
  kind?: AssetKind | 'auto';
  name?: string;
}

export type DraftPromptInput = DraftAssetInput;

export interface DraftAssetResult {
  content: string;
  suggestedName?: string;
  recommendedKind: AssetKind;
  reason?: string;
}

export type DraftPromptResult = DraftAssetResult;
