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
  },
  gemini: {
    apiKey: {
      label: 'Get Google AI Studio API key',
      href: 'https://aistudio.google.com/app/apikey'
    },
    docs: {
      label: 'Gemini API docs',
      href: 'https://ai.google.dev/gemini-api/docs'
    },
    models: {
      label: 'Gemini models',
      href: 'https://ai.google.dev/gemini-api/docs/models/gemini'
    }
  },
  groq: {
    apiKey: {
      label: 'Get Groq API key',
      href: 'https://console.groq.com/keys'
    },
    docs: {
      label: 'Groq API docs',
      href: 'https://console.groq.com/docs/quickstart'
    },
    models: {
      label: 'Groq models',
      href: 'https://console.groq.com/docs/models'
    }
  },
  openrouter: {
    apiKey: {
      label: 'Get OpenRouter API key',
      href: 'https://openrouter.ai/settings/keys'
    },
    docs: {
      label: 'OpenRouter API docs',
      href: 'https://openrouter.ai/docs/quick-start'
    },
    models: {
      label: 'Browse OpenRouter models',
      href: 'https://openrouter.ai/models'
    }
  },
  deepseek: {
    apiKey: {
      label: 'Get DeepSeek API key',
      href: 'https://platform.deepseek.com/api_keys'
    },
    docs: {
      label: 'DeepSeek API docs',
      href: 'https://api-docs.deepseek.com/'
    },
    models: {
      label: 'DeepSeek models & pricing',
      href: 'https://api-docs.deepseek.com/quick_start/pricing'
    }
  },
  cerebras: {
    apiKey: {
      label: 'Get Cerebras API key',
      href: 'https://cloud.cerebras.ai/platform?tab=api-keys'
    },
    docs: {
      label: 'Cerebras API docs',
      href: 'https://inference-docs.cerebras.ai/introduction'
    },
    models: {
      label: 'Cerebras models',
      href: 'https://inference-docs.cerebras.ai/models'
    }
  }
};

/** Curated model lists for Settings dropdowns. Values are API model IDs. */
export const AI_MODEL_OPTIONS: Record<AiProvider, readonly AiModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
    { id: 'claude-opus-5', label: 'Claude Opus 5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
    { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' }
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
  ],
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
    { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
    { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (Free)' },
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', label: 'Qwen 2.5 Coder 32B (Free)' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', label: 'GPT-4o' }
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek-V3 (Chat)' },
    { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (Reasoner)' }
  ],
  cerebras: [
    { id: 'llama-3.3-70b', label: 'Llama 3.3 70B' },
    { id: 'llama3.1-8b', label: 'Llama 3.1 8B' },
    { id: 'qwen-3-32b', label: 'Qwen 3 32B' },
    { id: 'gpt-oss-120b', label: 'GPT-OSS 120B' }
  ]
};

export const CUSTOM_MODEL_VALUE = '__custom__';

export function resolveModelSelectValue(model: string, provider: AiProvider): string {
  const known = AI_MODEL_OPTIONS[provider].some((option) => option.id === model);
  return known ? model : CUSTOM_MODEL_VALUE;
}
