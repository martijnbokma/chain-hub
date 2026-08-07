import type { AiProvider } from '@/types';

export interface AiModelOption {
  id: string;
  label: string;
}

export interface AiProviderLinks {
  apiKey?: { label: string; href: string };
  docs: { label: string; href: string };
  models?: { label: string; href: string };
}

/** Where to create API keys / install / browse models for each provider. */
export const AI_PROVIDER_LINKS: Record<AiProvider, AiProviderLinks> = {
  anthropic: {
    apiKey: {
      label: 'Get Anthropic API key',
      href: 'https://console.anthropic.com/settings/keys'
    },
    docs: {
      label: 'Anthropic API docs',
      href: 'https://docs.anthropic.com/en/api/getting-started'
    },
    models: {
      label: 'Anthropic models',
      href: 'https://docs.anthropic.com/en/docs/about-claude/models'
    }
  },
  openai: {
    apiKey: {
      label: 'Get OpenAI API key',
      href: 'https://platform.openai.com/api-keys'
    },
    docs: {
      label: 'OpenAI API docs',
      href: 'https://platform.openai.com/docs/quickstart'
    },
    models: {
      label: 'OpenAI models',
      href: 'https://platform.openai.com/docs/models'
    }
  },
  mistral: {
    apiKey: {
      label: 'Get Mistral API key',
      href: 'https://console.mistral.ai/api-keys'
    },
    docs: {
      label: 'Mistral API docs',
      href: 'https://docs.mistral.ai/getting-started/quickstart/'
    },
    models: {
      label: 'Mistral models',
      href: 'https://docs.mistral.ai/getting-started/models/'
    }
  },
  ollama: {
    docs: {
      label: 'Install Ollama',
      href: 'https://ollama.com/download'
    },
    models: {
      label: 'Browse Ollama models',
      href: 'https://ollama.com/library'
    }
  }
};

/** Curated model lists for Settings dropdowns. Values are API model IDs. */
export const AI_MODEL_OPTIONS: Record<AiProvider, readonly AiModelOption[]> = {
  anthropic: [
    { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
    { id: 'claude-sonnet-4-0', label: 'Claude Sonnet 4' },
    { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' }
  ],
  openai: [
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'o4-mini', label: 'o4-mini' },
    { id: 'o3-mini', label: 'o3-mini' }
  ],
  mistral: [
    { id: 'mistral-large-latest', label: 'Mistral Large' },
    { id: 'mistral-medium-latest', label: 'Mistral Medium' },
    { id: 'mistral-small-latest', label: 'Mistral Small' },
    { id: 'codestral-latest', label: 'Codestral' },
    { id: 'ministral-8b-latest', label: 'Ministral 8B' },
    { id: 'ministral-3b-latest', label: 'Ministral 3B' },
    { id: 'open-mistral-nemo', label: 'Mistral Nemo' },
    { id: 'pixtral-large-latest', label: 'Pixtral Large' }
  ],
  ollama: [
    { id: 'llama3.2', label: 'Llama 3.2' },
    { id: 'llama3.1', label: 'Llama 3.1' },
    { id: 'llama3.3', label: 'Llama 3.3' },
    { id: 'mistral', label: 'Mistral' },
    { id: 'qwen2.5', label: 'Qwen 2.5' },
    { id: 'qwen2.5-coder', label: 'Qwen 2.5 Coder' },
    { id: 'gemma3', label: 'Gemma 3' },
    { id: 'phi4', label: 'Phi-4' },
    { id: 'deepseek-r1', label: 'DeepSeek R1' }
  ]
} as const;

export const CUSTOM_MODEL_VALUE = '__custom__';

export function resolveModelSelectValue(model: string, provider: AiProvider): string {
  const known = AI_MODEL_OPTIONS[provider].some((option) => option.id === model);
  return known ? model : CUSTOM_MODEL_VALUE;
}
