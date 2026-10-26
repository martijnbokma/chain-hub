import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  AI_MODEL_OPTIONS,
  AI_PROVIDER_LINKS,
  CUSTOM_MODEL_VALUE,
  resolveModelSelectValue,
  type AiProviderLinks
} from '@/lib/ai-models';
import type { AiProvider, UpdateAiSettingsInput } from '@/types';

export type CloudProvider = Exclude<AiProvider, 'ollama'>;

/** Order of the "Active provider" select. */
export const PROVIDER_OPTIONS: ReadonlyArray<{ provider: AiProvider; label: string }> = [
  { provider: 'ollama', label: 'Ollama (local)' },
  { provider: 'gemini', label: 'Google Gemini' },
  { provider: 'groq', label: 'Groq' },
  { provider: 'openrouter', label: 'OpenRouter' },
  { provider: 'deepseek', label: 'DeepSeek' },
  { provider: 'cerebras', label: 'Cerebras' },
  { provider: 'anthropic', label: 'Anthropic' },
  { provider: 'openai', label: 'OpenAI' },
  { provider: 'mistral', label: 'Mistral' }
];

/** Cloud providers in card order; each needs an API key. Ollama is rendered last with its base URL. */
export const CLOUD_PROVIDERS: ReadonlyArray<{ provider: CloudProvider; label: string; keyPlaceholder: string }> = [
  { provider: 'gemini', label: 'Google Gemini', keyPlaceholder: 'AIzaSy…' },
  { provider: 'groq', label: 'Groq', keyPlaceholder: 'gsk_…' },
  { provider: 'openrouter', label: 'OpenRouter', keyPlaceholder: 'sk-or-v1-…' },
  { provider: 'deepseek', label: 'DeepSeek', keyPlaceholder: 'sk-…' },
  { provider: 'cerebras', label: 'Cerebras', keyPlaceholder: 'csk-…' },
  { provider: 'anthropic', label: 'Anthropic', keyPlaceholder: 'sk-ant-…' },
  { provider: 'openai', label: 'OpenAI', keyPlaceholder: 'sk-…' },
  { provider: 'mistral', label: 'Mistral', keyPlaceholder: '…' }
];

export type ModelMap = Record<AiProvider, string>;
export type ApiKeyMap = Record<CloudProvider, string>;

export function emptyApiKeys(): ApiKeyMap {
  return Object.fromEntries(CLOUD_PROVIDERS.map(({ provider }) => [provider, ''])) as ApiKeyMap;
}

/** Trims every model and fails when any provider is left without one. */
export function readModels(models: ModelMap): ModelMap {
  const trimmed = Object.fromEntries(
    Object.entries(models).map(([provider, model]) => [provider, model.trim()])
  ) as ModelMap;
  if (Object.values(trimmed).some((model) => !model)) {
    throw new Error('Each provider needs a model selected');
  }
  return trimmed;
}

/** Only keys the user typed are sent; blank fields keep the stored key. */
export function readApiKeys(apiKeys: ApiKeyMap): Partial<UpdateAiSettingsInput> {
  const input: Partial<UpdateAiSettingsInput> = {};
  for (const { provider } of CLOUD_PROVIDERS) {
    const key = apiKeys[provider].trim();
    if (key) {
      input[`${provider}ApiKey`] = key;
    }
  }
  return input;
}

function ProviderResourceLinks({ links }: { links: AiProviderLinks }) {
  const items = [links.apiKey, links.docs, links.models].filter(
    (item): item is { label: string; href: string } => Boolean(item)
  );

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.href}>
          <a
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            href={item.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.label}
            <ExternalLink aria-hidden className="size-3" />
          </a>
        </li>
      ))}
    </ul>
  );
}

interface ProviderModelFieldsProps {
  provider: AiProvider;
  label: string;
  model: string;
  onModelChange: (value: string) => void;
  isActive: boolean;
  children?: ReactNode;
}

export function ProviderModelFields({
  provider,
  label,
  model,
  onModelChange,
  isActive,
  children
}: ProviderModelFieldsProps) {
  const selectValue = resolveModelSelectValue(model, provider);
  const options = AI_MODEL_OPTIONS[provider];

  return (
    <div
      className={cn(
        'grid gap-4 rounded-xl border border-border p-4',
        isActive ? 'border-primary/40 bg-primary/5' : 'bg-background'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {isActive ? <Badge variant="accent">Active</Badge> : null}
      </div>

      <label className="grid gap-2">
        <span className="text-sm text-muted-foreground">Model</span>
        <Select
          onChange={(event) => {
            const next = event.target.value;
            if (next === CUSTOM_MODEL_VALUE) {
              if (selectValue !== CUSTOM_MODEL_VALUE) {
                onModelChange('');
              }
              return;
            }
            onModelChange(next);
          }}
          value={selectValue}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          <option value={CUSTOM_MODEL_VALUE}>Custom…</option>
        </Select>
      </label>

      {selectValue === CUSTOM_MODEL_VALUE ? (
        <label className="grid gap-2">
          <span className="text-sm text-muted-foreground">Custom model id</span>
          <Input
            onChange={(event) => onModelChange(event.target.value)}
            placeholder="provider-specific model id"
            value={model}
          />
        </label>
      ) : null}

      {children}

      <ProviderResourceLinks links={AI_PROVIDER_LINKS[provider]} />
    </div>
  );
}
