import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import {
  AI_MODEL_OPTIONS,
  AI_PROVIDER_LINKS,
  CUSTOM_MODEL_VALUE,
  resolveModelSelectValue,
  type AiProviderLinks
} from '@/lib/ai-models';
import { aiSettingsApi } from '@/lib/api';
import type { AiProvider, AiSettingsPublic } from '@/types';

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

function applySettingsToForm(
  data: AiSettingsPublic,
  setters: {
    setProvider: (value: AiProvider) => void;
    setAnthropicModel: (value: string) => void;
    setOpenaiModel: (value: string) => void;
    setMistralModel: (value: string) => void;
    setOllamaModel: (value: string) => void;
    setOllamaBaseUrl: (value: string) => void;
  }
) {
  setters.setProvider(data.provider);
  setters.setAnthropicModel(data.models.anthropic);
  setters.setOpenaiModel(data.models.openai);
  setters.setMistralModel(data.models.mistral);
  setters.setOllamaModel(data.models.ollama);
  setters.setOllamaBaseUrl(data.ollamaBaseUrl);
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

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { preference, setPreference } = useTheme();
  const settings = useQuery({
    queryKey: ['settings', 'ai'],
    queryFn: () => aiSettingsApi.get()
  });

  const [provider, setProvider] = useState<AiProvider>('ollama');
  const [anthropicModel, setAnthropicModel] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');
  const [mistralModel, setMistralModel] = useState('');
  const [ollamaModel, setOllamaModel] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [mistralApiKey, setMistralApiKey] = useState('');

  useEffect(() => {
    if (!settings.data) {
      return;
    }
    applySettingsToForm(settings.data, {
      setProvider,
      setAnthropicModel,
      setOpenaiModel,
      setMistralModel,
      setOllamaModel,
      setOllamaBaseUrl
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const models = {
        anthropic: anthropicModel.trim(),
        openai: openaiModel.trim(),
        mistral: mistralModel.trim(),
        ollama: ollamaModel.trim()
      };

      if (!models.anthropic || !models.openai || !models.mistral || !models.ollama) {
        throw new Error('Each provider needs a model selected');
      }

      const response = await aiSettingsApi.update({
        provider,
        models,
        ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
        anthropicApiKey: anthropicApiKey.trim() || undefined,
        openaiApiKey: openaiApiKey.trim() || undefined,
        mistralApiKey: mistralApiKey.trim() || undefined
      });
      if (!response.ok) {
        throw new Error('Unable to save AI settings');
      }
      return response.json() as Promise<AiSettingsPublic>;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'ai'] });
      setAnthropicApiKey('');
      setOpenaiApiKey('');
      setMistralApiKey('');
      applySettingsToForm(data, {
        setProvider,
        setAnthropicModel,
        setOpenaiModel,
        setMistralModel,
        setOllamaModel,
        setOllamaBaseUrl
      });
      toast.success('AI settings saved');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save AI settings');
    }
  });

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <header className="grid gap-2">
        <Eyebrow>Settings</Eyebrow>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Settings</h2>
        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
          Appearance, hub setup, and local AI providers for drafting Library assets.
        </p>
      </header>

      <section className="grid gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="grid gap-1">
          <h3 className="text-sm font-medium text-foreground">Hub setup</h3>
          <p className="text-sm text-muted-foreground">
            Revisit the guided checklist anytime — initialize the hub, add a first asset, connect
            editors, and validate structure.
          </p>
        </div>
        <Link className={cn(buttonVariants({ variant: 'secondary' }), 'w-fit')} to="/setup">
          Open guided setup
        </Link>
      </section>

      <section className="grid gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="grid gap-1">
          <h3 className="text-sm font-medium text-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Light Cool Trust and Cool Trust Dark are both first-class. Switch anytime here, from the
            header moon/sun control, or via the command palette.
          </p>
        </div>
        <div className="grid gap-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
            {(
              [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' }
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                onClick={() => setPreference(option.value)}
                type="button"
                variant={preference === option.value ? 'default' : 'secondary'}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {settings.isLoading ? <PageSkeleton variant="checklist" /> : null}

      {settings.isError || (!settings.isLoading && !settings.data) ? (
        <EmptyState description="AI settings are temporarily unavailable." title="Unable to load AI settings" />
      ) : null}

      {settings.data ? (
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
            <Link
              className="text-foreground underline-offset-2 hover:underline"
              to="/library?create=1"
            >
              Library create flow
            </Link>
            .
          </p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm text-muted-foreground">Active provider</span>
          <Select onChange={(event) => setProvider(event.target.value as AiProvider)} value={provider}>
            <option value="ollama">Ollama (local)</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="mistral">Mistral</option>
          </Select>
        </label>

        <div className="grid gap-4">
          <p className="text-sm font-medium text-foreground">Models per provider</p>

          <ProviderModelFields
            isActive={provider === 'anthropic'}
            label="Anthropic"
            model={anthropicModel}
            onModelChange={setAnthropicModel}
            provider="anthropic"
          >
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">
                API key
                {settings.data.anthropicApiKeyConfigured ? (
                  <span className="text-foreground"> (configured — leave blank to keep)</span>
                ) : null}
              </span>
              <Input
                autoComplete="off"
                onChange={(event) => setAnthropicApiKey(event.target.value)}
                placeholder={settings.data.anthropicApiKeyConfigured ? '••••••••' : 'sk-ant-…'}
                type="password"
                value={anthropicApiKey}
              />
            </label>
          </ProviderModelFields>

          <ProviderModelFields
            isActive={provider === 'openai'}
            label="OpenAI"
            model={openaiModel}
            onModelChange={setOpenaiModel}
            provider="openai"
          >
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">
                API key
                {settings.data.openaiApiKeyConfigured ? (
                  <span className="text-foreground"> (configured — leave blank to keep)</span>
                ) : null}
              </span>
              <Input
                autoComplete="off"
                onChange={(event) => setOpenaiApiKey(event.target.value)}
                placeholder={settings.data.openaiApiKeyConfigured ? '••••••••' : 'sk-…'}
                type="password"
                value={openaiApiKey}
              />
            </label>
          </ProviderModelFields>

          <ProviderModelFields
            isActive={provider === 'mistral'}
            label="Mistral"
            model={mistralModel}
            onModelChange={setMistralModel}
            provider="mistral"
          >
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">
                API key
                {settings.data.mistralApiKeyConfigured ? (
                  <span className="text-foreground"> (configured — leave blank to keep)</span>
                ) : null}
              </span>
              <Input
                autoComplete="off"
                onChange={(event) => setMistralApiKey(event.target.value)}
                placeholder={settings.data.mistralApiKeyConfigured ? '••••••••' : '…'}
                type="password"
                value={mistralApiKey}
              />
            </label>
          </ProviderModelFields>

          <ProviderModelFields
            isActive={provider === 'ollama'}
            label="Ollama"
            model={ollamaModel}
            onModelChange={setOllamaModel}
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
      ) : null}
    </section>
  );
}
