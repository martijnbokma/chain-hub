import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { aiSettingsApi, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { AiProvider, AiSettingsPublic, UpdateAiSettingsInput } from '@/types';

type CloudProvider = Exclude<AiProvider, 'ollama'>;

/** Order of the "Active provider" select. */
const PROVIDER_OPTIONS: ReadonlyArray<{ provider: AiProvider; label: string }> = [
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
const CLOUD_PROVIDERS: ReadonlyArray<{ provider: CloudProvider; label: string; keyPlaceholder: string }> = [
  { provider: 'gemini', label: 'Google Gemini', keyPlaceholder: 'AIzaSy…' },
  { provider: 'groq', label: 'Groq', keyPlaceholder: 'gsk_…' },
  { provider: 'openrouter', label: 'OpenRouter', keyPlaceholder: 'sk-or-v1-…' },
  { provider: 'deepseek', label: 'DeepSeek', keyPlaceholder: 'sk-…' },
  { provider: 'cerebras', label: 'Cerebras', keyPlaceholder: 'csk-…' },
  { provider: 'anthropic', label: 'Anthropic', keyPlaceholder: 'sk-ant-…' },
  { provider: 'openai', label: 'OpenAI', keyPlaceholder: 'sk-…' },
  { provider: 'mistral', label: 'Mistral', keyPlaceholder: '…' }
];

type ModelMap = Record<AiProvider, string>;
type ApiKeyMap = Record<CloudProvider, string>;

function emptyApiKeys(): ApiKeyMap {
  return Object.fromEntries(CLOUD_PROVIDERS.map(({ provider }) => [provider, ''])) as ApiKeyMap;
}

/** Trims every model and fails when any provider is left without one. */
function readModels(models: ModelMap): ModelMap {
  const trimmed = Object.fromEntries(
    Object.entries(models).map(([provider, model]) => [provider, model.trim()])
  ) as ModelMap;
  if (Object.values(trimmed).some((model) => !model)) {
    throw new Error('Each provider needs a model selected');
  }
  return trimmed;
}

/** Only keys the user typed are sent; blank fields keep the stored key. */
function readApiKeys(apiKeys: ApiKeyMap): Partial<UpdateAiSettingsInput> {
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

function ProviderModelFields({
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

/** Active provider, per-provider models, API keys and the Ollama base URL. */
export function AiSettingsForm({ settings }: { settings: AiSettingsPublic }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<AiProvider>(settings.provider);
  const [models, setModels] = useState<ModelMap>(settings.models);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(settings.ollamaBaseUrl);
  const [apiKeys, setApiKeys] = useState<ApiKeyMap>(emptyApiKeys);

  const applySettings = (data: AiSettingsPublic) => {
    setProvider(data.provider);
    setModels(data.models);
    setOllamaBaseUrl(data.ollamaBaseUrl);
  };

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const setModel = (target: AiProvider) => (value: string) =>
    setModels((current) => ({ ...current, [target]: value }));

  const save = useMutation({
    mutationFn: async () =>
      aiSettingsApi.update({
        provider,
        models: readModels(models),
        ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
        ...readApiKeys(apiKeys)
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings });
      setApiKeys(emptyApiKeys());
      applySettings(data);
      toast.success('AI settings saved');
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to save AI settings'));
    }
  });

  return (
    <form
      className="grid gap-6 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">AI for prompts</h3>
          <Badge variant="accent">{provider}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick an active provider and configure a model for each LLM. Keys stay on this machine
          under your hub folder. Used when drafting any Library asset in the{' '}
          <Link className="text-foreground underline-offset-2 hover:underline" to="/library?create=1">
            Library create flow
          </Link>
          .
        </p>
      </div>

      <label className="grid gap-2">
        <span className="text-sm text-muted-foreground">Active provider</span>
        <Select onChange={(event) => setProvider(event.target.value as AiProvider)} value={provider}>
          {PROVIDER_OPTIONS.map((option) => (
            <option key={option.provider} value={option.provider}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <div className="grid gap-4">
        <p className="text-sm font-medium text-foreground">Models per provider</p>

        {CLOUD_PROVIDERS.map(({ provider: cloudProvider, label, keyPlaceholder }) => {
          const keyConfigured = settings[`${cloudProvider}ApiKeyConfigured`];
          return (
            <ProviderModelFields
              isActive={provider === cloudProvider}
              key={cloudProvider}
              label={label}
              model={models[cloudProvider]}
              onModelChange={setModel(cloudProvider)}
              provider={cloudProvider}
            >
              <label className="grid gap-2">
                <span className="text-sm text-muted-foreground">
                  API key
                  {keyConfigured ? (
                    <span className="text-foreground"> (configured — leave blank to keep)</span>
                  ) : null}
                </span>
                <Input
                  aria-label={`${label} API key`}
                  autoComplete="off"
                  onChange={(event) =>
                    setApiKeys((current) => ({ ...current, [cloudProvider]: event.target.value }))
                  }
                  placeholder={keyConfigured ? '••••••••' : keyPlaceholder}
                  type="password"
                  value={apiKeys[cloudProvider]}
                />
              </label>
            </ProviderModelFields>
          );
        })}

        <ProviderModelFields
          isActive={provider === 'ollama'}
          label="Ollama"
          model={models.ollama}
          onModelChange={setModel('ollama')}
          provider="ollama"
        >
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Base URL</span>
            <Input onChange={(event) => setOllamaBaseUrl(event.target.value)} value={ollamaBaseUrl} />
          </label>
          <p className="text-xs text-muted-foreground">
            Default is http://127.0.0.1:11434. Model names must match what you have pulled locally.
          </p>
        </ProviderModelFields>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button disabled={save.isPending} type="submit">
          {save.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
