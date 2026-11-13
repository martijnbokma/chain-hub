import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AI_MODELS } from '@chain-hub/contracts';
import { aiSettingsApi } from '@/lib/api';
import { renderWithProviders } from '@/test/render';
import type { AiSettingsPublic } from '@/types';

import { SettingsPage } from './SettingsPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const settings: AiSettingsPublic = {
  provider: 'ollama',
  models: { ...DEFAULT_AI_MODELS },
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  anthropicApiKeyConfigured: true,
  openaiApiKeyConfigured: false,
  mistralApiKeyConfigured: false,
  geminiApiKeyConfigured: false,
  groqApiKeyConfigured: false,
  openrouterApiKeyConfigured: false,
  deepseekApiKeyConfigured: false,
  cerebrasApiKeyConfigured: false
};

beforeEach(() => {
  vi.spyOn(aiSettingsApi, 'get').mockResolvedValue(settings);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SettingsPage', () => {
  it('names every API key field after its provider and shows configured keys', async () => {
    renderWithProviders(<SettingsPage />, { route: '/settings' });

    const anthropicKey = await screen.findByLabelText('Anthropic API key');
    expect(anthropicKey).toHaveAttribute('type', 'password');
    expect(anthropicKey).toHaveAttribute('placeholder', '••••••••');
    expect(screen.getByLabelText('Groq API key')).toHaveValue('');
  });

  it('saves the provider and a new key without sending blank keys', async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(aiSettingsApi, 'update').mockResolvedValue({ ...settings, provider: 'groq', groqApiKeyConfigured: true });
    renderWithProviders(<SettingsPage />, { route: '/settings' });

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Active provider' }), 'groq');
    await user.type(screen.getByLabelText('Groq API key'), '  gsk-test  ');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    const payload = update.mock.calls[0]![0];
    expect(payload).toMatchObject({ provider: 'groq', groqApiKey: 'gsk-test', models: DEFAULT_AI_MODELS });
    expect(payload.anthropicApiKey).toBeUndefined();
    expect(toast.success).toHaveBeenCalledWith('AI settings saved');
    await waitFor(() => expect(screen.getByLabelText('Groq API key')).toHaveValue(''));
  });

  it('shows why a save failed', async () => {
    const user = userEvent.setup();
    vi.spyOn(aiSettingsApi, 'update').mockRejectedValue(new Error('ollamaBaseUrl: Invalid url'));
    renderWithProviders(<SettingsPage />, { route: '/settings' });

    await user.click(await screen.findByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('ollamaBaseUrl: Invalid url'));
  });

  it('refuses to save when a provider has no model', async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(aiSettingsApi, 'update');
    vi.spyOn(aiSettingsApi, 'get').mockResolvedValue({ ...settings, models: { ...DEFAULT_AI_MODELS, groq: 'my-custom' } });
    renderWithProviders(<SettingsPage />, { route: '/settings' });

    const customInputs = await screen.findAllByPlaceholderText('provider-specific model id');
    await user.clear(customInputs[0]!);
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Each provider needs a model selected'));
    expect(update).not.toHaveBeenCalled();
  });
});
