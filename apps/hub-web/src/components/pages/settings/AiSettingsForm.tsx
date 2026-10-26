import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { aiSettingsApi, errorMessage } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { AiProvider, AiSettingsPublic } from '@/types';
import {
  CLOUD_PROVIDERS,
  emptyApiKeys,
  PROVIDER_OPTIONS,
  ProviderModelFields,
  readApiKeys,
  readModels,
  type ApiKeyMap,
  type ModelMap
} from './ai-provider-fields';

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
        <Button loading={save.isPending} type="submit">
          {save.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
